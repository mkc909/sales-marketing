/**
 * ProGeoData Queue Consumer Worker
 *
 * Consumes messages from progeodata-scrape-queue and orchestrates scraping.
 * Uses service binding to call scraper-browser worker.
 *
 * Responsibilities:
 * - Consume queue messages in batches
 * - Enforce rate limits (1 req/sec per state)
 * - Call scraper-browser via service binding
 * - Store results in D1 (raw_business_data)
 * - Update queue state tracking
 * - Handle retries and error logging
 */

interface Env {
  DB: D1Database;
  SCRAPER: Fetcher; // Service binding to scraper-browser
  RATE_LIMIT_STATE: KVNamespace;
  CONSUMER_VERSION: string;
  MAX_CONCURRENT_SCRAPES: string;
  RATE_LIMIT_DELAY_MS: string;
  DEBUG?: string;
}

interface ScrapeMessage {
  zip_code: string;
  state: string;
  source_type: string;
  profession: string;
  priority: number;
  scheduled_at: string;
}

interface Professional {
  name: string;
  license_number: string;
  license_status: string;
  company?: string;
  city?: string;
  state: string;
  phone?: string | null;
  email?: string | null;
  specializations?: string[];
}

interface ScrapeResponse {
  results: Professional[];
  source: string; // 'live', 'cache', 'mock'
  state: string;
  profession: string;
  zip: string;
  total: number;
  scraped_at: string;
  error?: {
    code: string;
    message: string;
    severity: string;
  };
}

/**
 * Check rate limit for a state/source
 */
async function checkRateLimit(
  env: Env,
  sourceType: string,
  state: string
): Promise<{ allowed: boolean; waitMs: number }> {
  const rateLimitKey = `rate_limit:${sourceType}:${state}`;
  const now = Date.now();

  // Get last request timestamp
  const lastRequestStr = await env.RATE_LIMIT_STATE.get(rateLimitKey);
  const lastRequest = lastRequestStr ? parseInt(lastRequestStr) : 0;

  // Check D1 rate limit configuration
  const rateLimitConfig = await env.DB.prepare(
    `SELECT requests_per_second, is_throttled, throttled_until
     FROM rate_limits
     WHERE source_type = ? AND source_key = ?`
  )
    .bind(sourceType, state)
    .first<{
      requests_per_second: number;
      is_throttled: number;
      throttled_until: string | null;
    }>();

  // Check if throttled
  if (rateLimitConfig?.is_throttled && rateLimitConfig.throttled_until) {
    const throttledUntil = new Date(rateLimitConfig.throttled_until).getTime();
    if (now < throttledUntil) {
      return { allowed: false, waitMs: throttledUntil - now };
    }
  }

  // Calculate delay based on requests per second (default 1.0)
  const requestsPerSecond = rateLimitConfig?.requests_per_second || 1.0;
  const minDelayMs = 1000 / requestsPerSecond;

  const timeSinceLastRequest = now - lastRequest;

  if (timeSinceLastRequest < minDelayMs) {
    const waitMs = minDelayMs - timeSinceLastRequest;
    return { allowed: false, waitMs };
  }

  return { allowed: true, waitMs: 0 };
}

/**
 * Update rate limit state
 */
async function updateRateLimit(
  env: Env,
  sourceType: string,
  state: string,
  requestDurationMs: number
): Promise<void> {
  const rateLimitKey = `rate_limit:${sourceType}:${state}`;
  const now = Date.now();

  // Update KV with current timestamp
  await env.RATE_LIMIT_STATE.put(rateLimitKey, now.toString(), {
    expirationTtl: 3600, // Expire after 1 hour
  });

  // Update D1 rate limit tracking
  await env.DB.prepare(
    `UPDATE rate_limits
     SET
       current_second_count = current_second_count + 1,
       current_minute_count = current_minute_count + 1,
       current_hour_count = current_hour_count + 1,
       current_day_count = current_day_count + 1,
       last_request_at = ?,
       last_request_duration_ms = ?,
       total_requests = total_requests + 1,
       updated_at = ?
     WHERE source_type = ? AND source_key = ?`
  )
    .bind(
      new Date().toISOString(),
      requestDurationMs,
      new Date().toISOString(),
      sourceType,
      state
    )
    .run();
}

/**
 * Call scraper-browser worker via service binding
 */
async function scrapeViaServiceBinding(
  env: Env,
  message: ScrapeMessage
): Promise<ScrapeResponse> {
  const startTime = Date.now();

  try {
    // Create request to scraper-browser
    const request = new Request('https://scraper-browser/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: message.state,
        profession: message.profession,
        zip: message.zip_code,
        limit: 50, // Get up to 50 results per ZIP
      }),
    });

    // Call via service binding
    const response = await env.SCRAPER.fetch(request);

    if (!response.ok) {
      throw new Error(
        `Scraper returned ${response.status}: ${await response.text()}`
      );
    }

    const data = (await response.json()) as ScrapeResponse;

    const duration = Date.now() - startTime;
    console.log(
      `Scrape completed in ${duration}ms - ${data.total} results from ${data.source}`
    );

    return data;
  } catch (error) {
    console.error('Service binding error:', error);
    throw error;
  }
}

/**
 * Store professionals in D1 raw_business_data table
 */
async function storeProfessionals(
  env: Env,
  professionals: Professional[],
  message: ScrapeMessage,
  source: string
): Promise<number> {
  let stored = 0;

  for (const pro of professionals) {
    try {
      await env.DB.prepare(
        `INSERT INTO raw_business_data
         (source, source_id, name, address, city, state, postal_code,
          phone, email, category, raw_data, status, scraped_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
         ON CONFLICT(source, source_id) DO UPDATE SET
           name = excluded.name,
           phone = excluded.phone,
           email = excluded.email,
           last_updated = excluded.scraped_at`
      )
        .bind(
          message.source_type,
          pro.license_number,
          pro.name,
          null, // Address not provided by license DBs
          pro.city || null,
          pro.state,
          message.zip_code,
          pro.phone || null,
          pro.email || null,
          message.profession,
          JSON.stringify(pro),
          new Date().toISOString()
        )
        .run();

      stored++;
    } catch (error) {
      console.error(`Error storing professional ${pro.name}:`, error);
    }
  }

  console.log(`Stored ${stored}/${professionals.length} professionals in D1`);
  return stored;
}

/**
 * Update scrape queue state
 */
async function updateQueueState(
  env: Env,
  message: ScrapeMessage,
  status: 'completed' | 'failed',
  resultCount: number,
  durationMs: number,
  error?: string
): Promise<void> {
  const now = new Date().toISOString();

  if (status === 'completed') {
    await env.DB.prepare(
      `UPDATE scrape_queue_state
       SET
         status = 'completed',
         successful_scrapes = successful_scrapes + 1,
         total_attempts = total_attempts + 1,
         last_result_count = ?,
         total_professionals_found = total_professionals_found + ?,
         last_scrape_duration_ms = ?,
         completed_at = ?,
         last_attempted_at = ?,
         consecutive_failures = 0,
         updated_at = ?
       WHERE zip_code = ? AND state = ? AND source_type = ?`
    )
      .bind(
        resultCount,
        resultCount,
        durationMs,
        now,
        now,
        now,
        message.zip_code,
        message.state,
        message.source_type
      )
      .run();
  } else {
    // Calculate next retry time (exponential backoff)
    const baseDelay = 3600000; // 1 hour
    const consecutiveFailures = await env.DB.prepare(
      `SELECT consecutive_failures FROM scrape_queue_state
       WHERE zip_code = ? AND state = ? AND source_type = ?`
    )
      .bind(message.zip_code, message.state, message.source_type)
      .first<{ consecutive_failures: number }>();

    const failures = consecutiveFailures?.consecutive_failures || 0;
    const backoffMs = baseDelay * Math.pow(2, Math.min(failures, 5)); // Max 32 hours
    const nextRetry = new Date(Date.now() + backoffMs).toISOString();

    await env.DB.prepare(
      `UPDATE scrape_queue_state
       SET
         status = 'failed',
         failed_scrapes = failed_scrapes + 1,
         total_attempts = total_attempts + 1,
         last_error = ?,
         consecutive_failures = consecutive_failures + 1,
         next_retry_at = ?,
         last_attempted_at = ?,
         updated_at = ?
       WHERE zip_code = ? AND state = ? AND source_type = ?`
    )
      .bind(
        error || 'Unknown error',
        nextRetry,
        now,
        now,
        message.zip_code,
        message.state,
        message.source_type
      )
      .run();
  }
}

/**
 * Log queue message processing
 */
async function logQueueMessage(
  env: Env,
  messageId: string,
  message: ScrapeMessage,
  status: 'completed' | 'failed',
  resultCount: number,
  storedCount: number,
  durationMs: number,
  attemptNumber: number,
  error?: string
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO queue_messages
       (message_id, queue_name, zip_code, state, source_type, profession,
        status, attempt_number, received_at, completed_at, processing_duration_ms,
        result_count, stored_count, error_message, worker_version)
       VALUES (?, 'progeodata-scrape-queue', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        messageId,
        message.zip_code,
        message.state,
        message.source_type,
        message.profession,
        status,
        attemptNumber,
        new Date().toISOString(),
        new Date().toISOString(),
        durationMs,
        resultCount,
        storedCount,
        error || null,
        env.CONSUMER_VERSION
      )
      .run();
  } catch (error) {
    console.error('Error logging queue message:', error);
  }
}

/**
 * Process a single queue message
 */
async function processMessage(
  env: Env,
  message: ScrapeMessage,
  messageId: string,
  attemptNumber: number
): Promise<void> {
  const startTime = Date.now();

  console.log(
    `Processing message ${messageId} (attempt ${attemptNumber}): ${message.state}-${message.zip_code}`
  );

  try {
    // Update queue state to processing
    await env.DB.prepare(
      `UPDATE scrape_queue_state
       SET status = 'processing', started_at = ?, updated_at = ?
       WHERE zip_code = ? AND state = ? AND source_type = ?`
    )
      .bind(
        new Date().toISOString(),
        new Date().toISOString(),
        message.zip_code,
        message.state,
        message.source_type
      )
      .run();

    // Check rate limit
    const rateLimit = await checkRateLimit(
      env,
      message.source_type,
      message.state
    );

    if (!rateLimit.allowed) {
      console.log(
        `Rate limit hit for ${message.source_type}:${message.state}, waiting ${rateLimit.waitMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, rateLimit.waitMs));
    }

    // Scrape via service binding
    const scrapeStart = Date.now();
    const scrapeResult = await scrapeViaServiceBinding(env, message);
    const scrapeDuration = Date.now() - scrapeStart;

    // Update rate limit
    await updateRateLimit(env, message.source_type, message.state, scrapeDuration);

    // Store professionals in D1
    const storedCount = await storeProfessionals(
      env,
      scrapeResult.results,
      message,
      scrapeResult.source
    );

    // Update queue state to completed
    const totalDuration = Date.now() - startTime;
    await updateQueueState(
      env,
      message,
      'completed',
      scrapeResult.total,
      totalDuration,
      undefined
    );

    // Log queue message
    await logQueueMessage(
      env,
      messageId,
      message,
      'completed',
      scrapeResult.total,
      storedCount,
      totalDuration,
      attemptNumber
    );

    console.log(
      `Successfully processed ${message.state}-${message.zip_code}: ${storedCount} stored`
    );
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error(
      `Error processing ${message.state}-${message.zip_code}:`,
      errorMessage
    );

    // Update queue state to failed
    await updateQueueState(
      env,
      message,
      'failed',
      0,
      totalDuration,
      errorMessage
    );

    // Log queue message
    await logQueueMessage(
      env,
      messageId,
      message,
      'failed',
      0,
      0,
      totalDuration,
      attemptNumber,
      errorMessage
    );

    // Re-throw to trigger queue retry
    throw error;
  }
}

/**
 * Queue consumer handler
 */
export default {
  async queue(
    batch: MessageBatch<ScrapeMessage>,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`Processing queue batch: ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      try {
        await processMessage(
          env,
          message.body,
          message.id,
          message.attempts
        );

        // Acknowledge successful processing
        message.ack();
      } catch (error) {
        console.error(`Message ${message.id} failed:`, error);

        // Retry or send to DLQ based on retry count
        if (message.attempts >= 3) {
          console.error(
            `Message ${message.id} exceeded max retries, sending to DLQ`
          );
          // Message will automatically go to DLQ
          message.ack();
        } else {
          // Let queue retry
          message.retry();
        }
      }
    }

    console.log('Batch processing complete');
  },

  /**
   * HTTP handler for monitoring and manual triggers
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          version: env.CONSUMER_VERSION,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Stats endpoint
    if (url.pathname === '/stats' && request.method === 'GET') {
      try {
        const queueStats = await env.DB.prepare(
          `SELECT * FROM recent_queue_activity LIMIT 20`
        ).all();

        const rateLimitStats = await env.DB.prepare(
          `SELECT * FROM rate_limit_status`
        ).all();

        return new Response(
          JSON.stringify({
            queue_activity: queueStats.results,
            rate_limits: rateLimitStats.results,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Stats error:', error);
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response('ProGeoData Queue Consumer\n\nEndpoints:\n- GET /health - Health check\n- GET /stats - Queue statistics', {
      status: 200,
    });
  },
};
