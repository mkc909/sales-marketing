export interface Env {
  SCRAPER: Fetcher;
  DB: D1Database;
  RATE_LIMIT_PER_SECOND: string;
  WORKER_ID: string;
  MAX_RETRIES: string;
  SCRAPER_URL: string;
  DEBUG?: string;
}

interface QueueMessage {
  zip: string;
  state: string;
  timestamp: number;
  retryCount: number;
  source: string;
}

interface Professional {
  name: string;
  email?: string;
  phone?: string;
  license_number?: string;
  address?: string;
  city?: string;
  state: string;
  zip_code?: string;
  profession?: string;
  company?: string;
  status: string;
}

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    const workerId = env.WORKER_ID;
    const rateLimit = parseFloat(env.RATE_LIMIT_PER_SECOND || '1');
    const maxRetries = parseInt(env.MAX_RETRIES || '3');
    const debug = env.DEBUG === 'true';

    if (debug) {
      console.log(`[${workerId}] Processing batch of ${batch.messages.length} messages`);
    }

    // Process messages with rate limiting
    for (const message of batch.messages) {
      const startTime = Date.now();
      const { zip, state } = message.body;

      try {
        // Check and enforce rate limit
        await enforceRateLimit(env.DB, `${state}_DBPR`, rateLimit);

        // Build search URL based on state
        const searchUrl = getSearchUrl(state, zip);

        if (debug) {
          console.log(`[${workerId}] Scraping ${state} ZIP ${zip}: ${searchUrl}`);
        }

        // Call scraper via service binding
        const scraperResponse = await env.SCRAPER.fetch(env.SCRAPER_URL + '/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: searchUrl,
            waitFor: 'table',
            screenshot: false,
            extractText: true,
            timeout: 30000
          })
        });

        if (!scraperResponse.ok) {
          const errorText = await scraperResponse.text();
          throw new Error(`Scraper error ${scraperResponse.status}: ${errorText}`);
        }

        const scraperData = await scraperResponse.json() as any;

        // Parse and extract professionals from scraped data
        const professionals = parseScraperData(scraperData, state, zip);

        if (debug) {
          console.log(`[${workerId}] Found ${professionals.length} professionals in ${state} ZIP ${zip}`);
        }

        // Save professionals to database
        if (professionals.length > 0) {
          await saveProfessionals(env.DB, professionals);
        }

        // Log successful processing
        await env.DB.prepare(`
          INSERT INTO processing_log
          (worker_id, zip_code, state, status, records_found, records_saved, processing_time_ms, created_at)
          VALUES (?, ?, ?, 'success', ?, ?, ?, datetime('now'))
        `).bind(
          workerId,
          zip,
          state,
          professionals.length,
          professionals.length,
          Date.now() - startTime
        ).run();

        // Update worker health
        await updateWorkerHealth(env.DB, workerId, 'healthy', Date.now() - startTime);

        // Update queue state
        await env.DB.prepare(`
          UPDATE queue_state SET
            processed_items = processed_items + 1,
            last_process_time = datetime('now'),
            updated_at = datetime('now')
          WHERE queue_name = 'progeodata-zip-queue'
        `).run();

        // Acknowledge message as successfully processed
        message.ack();

      } catch (error: any) {
        console.error(`[${workerId}] Error processing ZIP ${zip}:`, error);

        // Log error
        await env.DB.prepare(`
          INSERT INTO error_log
          (worker_id, error_type, error_message, stack_trace, context, retry_count, max_retries, created_at)
          VALUES (?, 'processing_error', ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          workerId,
          error.message || 'Unknown error',
          error.stack || '',
          JSON.stringify(message.body),
          message.body.retryCount,
          maxRetries
        ).run();

        // Update failed items count
        await env.DB.prepare(`
          UPDATE queue_state SET
            failed_items = failed_items + 1,
            updated_at = datetime('now')
          WHERE queue_name = 'progeodata-zip-queue'
        `).run();

        // Retry or move to DLQ
        if (message.body.retryCount < maxRetries) {
          // Retry the message
          message.retry();
        } else {
          // Max retries exceeded, acknowledge to move to DLQ
          message.ack();
        }

        // Update worker health as degraded
        await updateWorkerHealth(env.DB, workerId, 'degraded', Date.now() - startTime, true);
      }

      // Respect rate limit between requests
      const elapsedTime = Date.now() - startTime;
      const minInterval = 1000 / rateLimit;
      if (elapsedTime < minInterval) {
        await sleep(minInterval - elapsedTime);
      }
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      const health = await env.DB.prepare(`
        SELECT * FROM worker_health WHERE worker_id = ?
      `).bind(env.WORKER_ID).first();

      return Response.json(health || {
        worker_id: env.WORKER_ID,
        status: 'initializing',
        worker_type: 'consumer'
      });
    }

    // Stats endpoint
    if (url.pathname === '/stats') {
      const stats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_processed,
          SUM(records_saved) as total_records,
          AVG(processing_time_ms) as avg_time_ms
        FROM processing_log
        WHERE worker_id = ?
        AND datetime(created_at) > datetime('now', '-1 hour')
      `).bind(env.WORKER_ID).first();

      return Response.json({
        worker_id: env.WORKER_ID,
        stats: stats || {}
      });
    }

    return new Response(`ProGeoData Consumer Worker ${env.WORKER_ID}`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

async function enforceRateLimit(db: D1Database, source: string, limit: number): Promise<void> {
  const now = Date.now();

  const rateInfo = await db.prepare(`
    SELECT * FROM rate_limits WHERE source = ?
  `).bind(source).first<{ last_request_time: number; request_count: number }>();

  if (rateInfo && rateInfo.last_request_time) {
    const timeSinceLastRequest = now - rateInfo.last_request_time;
    const minInterval = 1000 / limit; // milliseconds between requests

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await sleep(waitTime);
    }
  }

  // Update rate limit tracking
  await db.prepare(`
    INSERT INTO rate_limits (source, last_request_time, request_count, requests_per_second)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(source) DO UPDATE SET
      last_request_time = ?,
      request_count = request_count + 1
  `).bind(source, now, limit, now).run();
}

function getSearchUrl(state: string, zip: string): string {
  switch(state.toUpperCase()) {
    case 'FL':
      // Florida DBPR search by ZIP
      return `https://www.myfloridalicense.com/wl11.asp?mode=2&search=NAME&SID=&brd=&typ=N&key=${zip}`;

    case 'TX':
      // Texas TREC search
      return `https://www.trec.texas.gov/apps/license-holder-search/?zip=${zip}`;

    case 'CA':
      // California DRE search
      return `https://www2.dre.ca.gov/PublicASP/pplinfo.asp?License_id=${zip}`;

    default:
      throw new Error(`Unsupported state: ${state}`);
  }
}

function parseScraperData(data: any, state: string, zip: string): Professional[] {
  const professionals: Professional[] = [];

  try {
    // Extract text content from scraped data
    const text = data.text || data.content || '';
    const html = data.html || '';

    // State-specific parsing
    switch(state.toUpperCase()) {
      case 'FL':
        // Parse Florida DBPR results
        professionals.push(...parseFloridaResults(text, html, zip));
        break;

      case 'TX':
        // Parse Texas TREC results
        professionals.push(...parseTexasResults(text, html, zip));
        break;

      case 'CA':
        // Parse California DRE results
        professionals.push(...parseCaliforniaResults(text, html, zip));
        break;
    }
  } catch (error) {
    console.error(`Error parsing ${state} data:`, error);
  }

  return professionals;
}

function parseFloridaResults(text: string, html: string, zip: string): Professional[] {
  const professionals: Professional[] = [];

  // Parse table rows for Florida DBPR format
  // This is a simplified parser - actual implementation would use proper HTML parsing
  const lines = text.split('\n');
  let currentPro: Partial<Professional> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Look for license numbers (pattern: XX####)
    if (/^[A-Z]{2}\d{4,}/.test(trimmed)) {
      if (currentPro && currentPro.name) {
        professionals.push({
          ...currentPro,
          state: 'FL',
          zip_code: zip,
          status: 'active'
        } as Professional);
      }

      currentPro = {
        license_number: trimmed
      };
    }

    // Look for names (usually after license)
    if (currentPro && !currentPro.name && trimmed && !trimmed.match(/^[A-Z]{2}\d/)) {
      currentPro.name = trimmed;
    }

    // Look for company names
    if (currentPro && currentPro.name && trimmed.includes('LLC') || trimmed.includes('Inc') || trimmed.includes('Corp')) {
      currentPro.company = trimmed;
    }

    // Look for addresses
    if (currentPro && trimmed.match(/\d{1,5}\s+\w+/)) {
      currentPro.address = trimmed;
    }

    // Look for city, state, ZIP patterns
    if (currentPro && trimmed.match(/,\s*FL\s+\d{5}/)) {
      const parts = trimmed.split(',');
      if (parts.length >= 1) {
        currentPro.city = parts[0].trim();
      }
    }
  }

  // Add last professional if exists
  if (currentPro && currentPro.name) {
    professionals.push({
      ...currentPro,
      state: 'FL',
      zip_code: zip,
      status: 'active',
      profession: 'Real Estate'
    } as Professional);
  }

  return professionals;
}

function parseTexasResults(text: string, html: string, zip: string): Professional[] {
  // Similar parsing logic for Texas format
  const professionals: Professional[] = [];
  // Implementation would follow Texas-specific format
  return professionals;
}

function parseCaliforniaResults(text: string, html: string, zip: string): Professional[] {
  // Similar parsing logic for California format
  const professionals: Professional[] = [];
  // Implementation would follow California-specific format
  return professionals;
}

async function saveProfessionals(db: D1Database, professionals: Professional[]): Promise<void> {
  // Save to pros table using batch inserts
  const batch = [];

  for (const pro of professionals) {
    batch.push(db.prepare(`
      INSERT OR IGNORE INTO pros (
        name, email, phone, license_number,
        address, city, state, zip_code,
        profession, company, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      pro.name,
      pro.email || null,
      pro.phone || null,
      pro.license_number || null,
      pro.address || null,
      pro.city || null,
      pro.state,
      pro.zip_code || null,
      pro.profession || 'Real Estate',
      pro.company || null,
      pro.status || 'active'
    ));
  }

  // Execute batch insert
  if (batch.length > 0) {
    await db.batch(batch);
  }
}

async function updateWorkerHealth(
  db: D1Database,
  workerId: string,
  status: string,
  processingTime: number,
  hasError: boolean = false
): Promise<void> {
  await db.prepare(`
    INSERT INTO worker_health
    (worker_id, worker_type, status, last_heartbeat, items_processed, errors_count, average_processing_time_ms, created_at, updated_at)
    VALUES (?, 'consumer', ?, datetime('now'), 1, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(worker_id) DO UPDATE SET
      status = ?,
      last_heartbeat = datetime('now'),
      items_processed = items_processed + 1,
      errors_count = errors_count + ?,
      average_processing_time_ms =
        CASE
          WHEN items_processed = 0 THEN ?
          ELSE (average_processing_time_ms * items_processed + ?) / (items_processed + 1)
        END,
      updated_at = datetime('now')
  `).bind(
    workerId,
    status,
    hasError ? 1 : 0,
    processingTime,
    status,
    hasError ? 1 : 0,
    processingTime,
    processingTime
  ).run();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}