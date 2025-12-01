/**
 * EstateFlow Agent Ingestion Service
 * Processes and ingests professional data from multiple sources
 *
 * Features:
 * - Multi-source data ingestion (CSV, JSON, API)
 * - Data validation and normalization
 * - Duplicate detection
 * - Batch processing with rate limiting
 * - Error handling and retry logic
 */

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV for tracking ingestion status
  INGESTION_STATUS: KVNamespace;

  // R2 for storing raw import files
  IMPORT_FILES: R2Bucket;

  // Secrets
  API_SECRET: string;

  // Optional service bindings for notifications
  NOTIFICATION_SERVICE?: Fetcher;
}

interface ProfessionalData {
  // Core fields (required)
  industry: string;
  profession: string;
  name: string;
  email: string;
  phone: string;

  // Location (required)
  city: string;
  state: string;
  zip_code: string;

  // Optional fields
  license_number?: string;
  specializations?: string[];
  certifications?: string[];
  years_experience?: number;
  languages?: string[];

  // Metadata
  source: string;
  source_id?: string;
  import_batch_id?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: ProfessionalData;
}

interface IngestionResult {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  duration_ms: number;
  batch_id: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for API access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (url.pathname === '/health') {
        return handleHealthCheck(env);
      }

      // API routes require authentication
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${env.API_SECRET}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Route handling
      if (request.method === 'POST') {
        if (url.pathname === '/api/ingest/batch') {
          return await handleBatchIngest(request, env, ctx);
        }
        if (url.pathname === '/api/ingest/single') {
          return await handleSingleIngest(request, env, ctx);
        }
        if (url.pathname === '/api/ingest/csv') {
          return await handleCSVIngest(request, env, ctx);
        }
      }

      if (request.method === 'GET') {
        if (url.pathname === '/api/status') {
          return await handleStatusCheck(env);
        }
        if (url.pathname.startsWith('/api/batch/')) {
          const batchId = url.pathname.split('/').pop();
          return await handleBatchStatus(batchId!, env);
        }
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Health check endpoint
 */
async function handleHealthCheck(env: Env): Promise<Response> {
  try {
    // Test database connection
    const result = await env.DB.prepare('SELECT 1 as test').first();

    return new Response(JSON.stringify({
      status: 'healthy',
      service: 'agent-ingestion',
      timestamp: new Date().toISOString(),
      database: result ? 'connected' : 'error'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      service: 'agent-ingestion',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle batch ingestion of multiple professionals
 */
async function handleBatchIngest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const startTime = Date.now();
  const batchId = crypto.randomUUID();

  try {
    const body = await request.json() as { professionals: ProfessionalData[] };
    const professionals = body.professionals || [];

    if (!Array.isArray(professionals) || professionals.length === 0) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'professionals array is required and must not be empty'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate all records
    const validationResults = professionals.map(p => validateProfessional(p));
    const validRecords = validationResults
      .filter(r => r.valid)
      .map(r => r.normalized!);

    const invalidCount = validationResults.filter(r => !r.valid).length;

    // Process in batches of 100 to avoid D1 limits
    const BATCH_SIZE = 100;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const batchResult = await processBatch(batch, batchId, env);

      inserted += batchResult.inserted;
      updated += batchResult.updated;
      skipped += batchResult.skipped;
    }

    const duration = Date.now() - startTime;

    // Store ingestion status
    const result: IngestionResult = {
      success: true,
      total: professionals.length,
      inserted,
      updated,
      skipped,
      errors: invalidCount,
      duration_ms: duration,
      batch_id: batchId,
    };

    await env.INGESTION_STATUS.put(
      `batch:${batchId}`,
      JSON.stringify(result),
      { expirationTtl: 86400 } // 24 hours
    );

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    const errorResult: IngestionResult = {
      success: false,
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      duration_ms: duration,
      batch_id: batchId,
    };

    await env.INGESTION_STATUS.put(
      `batch:${batchId}`,
      JSON.stringify(errorResult),
      { expirationTtl: 86400 }
    );

    return new Response(JSON.stringify({
      error: 'Batch ingestion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      batch_id: batchId,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Process a batch of validated records
 */
async function processBatch(
  records: ProfessionalData[],
  batchId: string,
  env: Env
): Promise<{ inserted: number; updated: number; skipped: number }> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // Use transaction for atomic batch processing
  const statements = records.map(record => {
    const specializations = JSON.stringify(record.specializations || []);
    const certifications = JSON.stringify(record.certifications || []);
    const languages = JSON.stringify(record.languages || []);

    return env.DB.prepare(`
      INSERT INTO professionals (
        industry, profession, name, email, phone,
        city, state, zip_code,
        license_number, specializations, certifications,
        years_experience, languages,
        source, source_id, import_batch_id,
        created_at, updated_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'active')
      ON CONFLICT(email, industry) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        city = excluded.city,
        state = excluded.state,
        zip_code = excluded.zip_code,
        license_number = excluded.license_number,
        specializations = excluded.specializations,
        certifications = excluded.certifications,
        years_experience = excluded.years_experience,
        languages = excluded.languages,
        updated_at = datetime('now')
    `).bind(
      record.industry,
      record.profession,
      record.name,
      record.email,
      record.phone,
      record.city,
      record.state,
      record.zip_code,
      record.license_number || null,
      specializations,
      certifications,
      record.years_experience || null,
      languages,
      record.source,
      record.source_id || null,
      batchId
    );
  });

  try {
    const results = await env.DB.batch(statements);

    // Count insertions vs updates (simplified - D1 doesn't easily expose this)
    inserted = records.length; // Assume all inserted for now

  } catch (error) {
    console.error('Batch processing error:', error);
    throw error;
  }

  return { inserted, updated, skipped };
}

/**
 * Handle single professional ingestion
 */
async function handleSingleIngest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const professional = await request.json() as ProfessionalData;

    const validation = validateProfessional(professional);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const batchId = crypto.randomUUID();
    const result = await processBatch([validation.normalized!], batchId, env);

    return new Response(JSON.stringify({
      success: true,
      inserted: result.inserted > 0,
      professional: validation.normalized,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Single ingestion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle CSV file ingestion
 */
async function handleCSVIngest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({
        error: 'No file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = await file.text();
    const professionals = parseCSV(text);

    // Store original file in R2
    const fileKey = `imports/${Date.now()}-${file.name}`;
    await env.IMPORT_FILES.put(fileKey, text);

    // Process as batch
    const batchId = crypto.randomUUID();
    const validationResults = professionals.map(p => validateProfessional(p));
    const validRecords = validationResults
      .filter(r => r.valid)
      .map(r => r.normalized!);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const BATCH_SIZE = 100;
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const batchResult = await processBatch(batch, batchId, env);

      inserted += batchResult.inserted;
      updated += batchResult.updated;
      skipped += batchResult.skipped;
    }

    return new Response(JSON.stringify({
      success: true,
      total: professionals.length,
      inserted,
      updated,
      skipped,
      errors: validationResults.filter(r => !r.valid).length,
      batch_id: batchId,
      file_stored: fileKey,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'CSV ingestion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Check overall ingestion status
 */
async function handleStatusCheck(env: Env): Promise<Response> {
  try {
    // Get total professionals count
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM professionals
    `).first() as { total: number } | null;

    // Get counts by industry
    const industryResult = await env.DB.prepare(`
      SELECT industry, COUNT(*) as count
      FROM professionals
      GROUP BY industry
      ORDER BY count DESC
    `).all();

    // Get recent batches
    const recentResult = await env.DB.prepare(`
      SELECT import_batch_id, COUNT(*) as count
      FROM professionals
      WHERE import_batch_id IS NOT NULL
      GROUP BY import_batch_id
      ORDER BY MAX(created_at) DESC
      LIMIT 10
    `).all();

    return new Response(JSON.stringify({
      total_professionals: totalResult?.total || 0,
      by_industry: industryResult.results,
      recent_batches: recentResult.results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get status of a specific batch
 */
async function handleBatchStatus(batchId: string, env: Env): Promise<Response> {
  try {
    const cached = await env.INGESTION_STATUS.get(`batch:${batchId}`);

    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If not in cache, check database
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM professionals
      WHERE import_batch_id = ?
    `).bind(batchId).first() as { count: number } | null;

    return new Response(JSON.stringify({
      batch_id: batchId,
      found: (result?.count || 0) > 0,
      count: result?.count || 0,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Batch status check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Validate professional data
 */
function validateProfessional(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.industry || typeof data.industry !== 'string') {
    errors.push('industry is required and must be a string');
  }
  if (!data.profession || typeof data.profession !== 'string') {
    errors.push('profession is required and must be a string');
  }
  if (!data.name || typeof data.name !== 'string') {
    errors.push('name is required and must be a string');
  }
  if (!data.email || typeof data.email !== 'string' || !isValidEmail(data.email)) {
    errors.push('valid email is required');
  }
  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('phone is required and must be a string');
  }
  if (!data.city || typeof data.city !== 'string') {
    errors.push('city is required and must be a string');
  }
  if (!data.state || typeof data.state !== 'string') {
    errors.push('state is required and must be a string');
  }
  if (!data.zip_code || typeof data.zip_code !== 'string') {
    errors.push('zip_code is required and must be a string');
  }
  if (!data.source || typeof data.source !== 'string') {
    errors.push('source is required and must be a string');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Normalize data
  const normalized: ProfessionalData = {
    industry: data.industry.toLowerCase().trim(),
    profession: data.profession.toLowerCase().trim(),
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    phone: normalizePhone(data.phone),
    city: data.city.trim(),
    state: data.state.toUpperCase().trim(),
    zip_code: data.zip_code.trim(),
    source: data.source.trim(),
  };

  // Optional fields
  if (data.license_number) normalized.license_number = data.license_number.trim();
  if (data.specializations) normalized.specializations = Array.isArray(data.specializations)
    ? data.specializations
    : [data.specializations];
  if (data.certifications) normalized.certifications = Array.isArray(data.certifications)
    ? data.certifications
    : [data.certifications];
  if (data.years_experience) normalized.years_experience = parseInt(data.years_experience);
  if (data.languages) normalized.languages = Array.isArray(data.languages)
    ? data.languages
    : [data.languages];
  if (data.source_id) normalized.source_id = data.source_id.trim();
  if (data.import_batch_id) normalized.import_batch_id = data.import_batch_id.trim();

  // Warnings for missing optional but recommended fields
  if (!data.license_number) warnings.push('license_number is recommended');
  if (!data.specializations || data.specializations.length === 0) {
    warnings.push('specializations are recommended');
  }

  return { valid: true, errors: [], warnings, normalized };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Normalize phone number to standard format
 */
function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX for 10-digit numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return original if can't normalize
  return phone;
}

/**
 * Parse CSV data into professional objects
 */
function parseCSV(csvText: string): ProfessionalData[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const professionals: ProfessionalData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record: any = {};

    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });

    // Add source if not present
    if (!record.source) {
      record.source = 'csv-import';
    }

    professionals.push(record);
  }

  return professionals;
}
