import { Hono } from 'hono';
import { getFloridaZipCodes, getTexasZipCodes, getCaliforniaZipCodes } from './zip-codes';

export interface Env {
  ZIP_QUEUE: Queue;
  DB: D1Database;
  BATCH_SIZE: string;
  STATES: string;
  ZIP_LIMIT: string;
}

const app = new Hono<{ Bindings: Env }>();

app.post('/seed', async (c) => {
  const env = c.env;
  const batchSize = parseInt(env.BATCH_SIZE || '100');
  const states = env.STATES?.split(',') || ['FL'];
  const zipLimit = parseInt(env.ZIP_LIMIT || '0');

  try {
    // Update queue state to seeding
    await env.DB.prepare(`
      INSERT INTO queue_state (queue_name, status, last_seed_time)
      VALUES ('progeodata-zip-queue', 'seeding', datetime('now'))
      ON CONFLICT(queue_name) DO UPDATE SET
        status = 'seeding',
        last_seed_time = datetime('now'),
        updated_at = datetime('now')
    `).run();

    let totalQueued = 0;
    const queuedDetails: Record<string, number> = {};

    for (const state of states) {
      let zipCodes: string[] = [];

      switch(state.toUpperCase()) {
        case 'FL':
          zipCodes = getFloridaZipCodes();
          break;
        case 'TX':
          zipCodes = getTexasZipCodes();
          break;
        case 'CA':
          zipCodes = getCaliforniaZipCodes();
          break;
        default:
          console.warn(`Unknown state: ${state}`);
          continue;
      }

      // Apply ZIP limit for testing stages
      if (zipLimit > 0) {
        zipCodes = zipCodes.slice(0, Math.min(zipLimit, zipCodes.length));
      }

      // Batch ZIPs for queue
      for (let i = 0; i < zipCodes.length; i += batchSize) {
        const batch = zipCodes.slice(i, i + batchSize);
        const messages = batch.map(zip => ({
          body: JSON.stringify({
            zip,
            state: state.toUpperCase(),
            timestamp: Date.now(),
            retryCount: 0,
            source: 'seed'
          })
        }));

        await env.ZIP_QUEUE.sendBatch(messages);
        totalQueued += batch.length;
      }

      queuedDetails[state] = zipCodes.length;
    }

    // Update queue state with totals
    await env.DB.prepare(`
      UPDATE queue_state SET
        status = 'active',
        total_items = total_items + ?,
        updated_at = datetime('now')
      WHERE queue_name = 'progeodata-zip-queue'
    `).bind(totalQueued).run();

    // Log seed operation
    await env.DB.prepare(`
      INSERT INTO processing_log (worker_id, zip_code, state, status, records_found, created_at)
      VALUES ('seed', 'batch', ?, 'seeded', ?, datetime('now'))
    `).bind(states.join(','), totalQueued).run();

    return c.json({
      success: true,
      message: `Queued ${totalQueued} ZIP codes for processing`,
      states: states,
      details: queuedDetails,
      batchSize: batchSize,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Seed error:', error);

    // Log error
    await env.DB.prepare(`
      INSERT INTO error_log (worker_id, error_type, error_message, context, created_at)
      VALUES ('seed', 'seed_error', ?, ?, datetime('now'))
    `).bind(
      error.message || 'Unknown error',
      JSON.stringify({ states, batchSize, zipLimit })
    ).run();

    // Update queue state to error
    await env.DB.prepare(`
      UPDATE queue_state SET
        status = 'error',
        updated_at = datetime('now')
      WHERE queue_name = 'progeodata-zip-queue'
    `).run();

    return c.json({
      success: false,
      error: error.message || 'Unknown error'
    }, 500);
  }
});

app.get('/status', async (c) => {
  const env = c.env;

  try {
    const queueState = await env.DB.prepare(`
      SELECT * FROM queue_state
      WHERE queue_name = 'progeodata-zip-queue'
    `).first();

    const recentLogs = await env.DB.prepare(`
      SELECT * FROM processing_log
      WHERE worker_id = 'seed'
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    const errorCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM error_log
      WHERE worker_id = 'seed'
      AND datetime(created_at) > datetime('now', '-1 hour')
    `).first<{ count: number }>();

    return c.json({
      status: queueState || { message: 'No queue state found' },
      recentSeeds: recentLogs.results || [],
      recentErrors: errorCount?.count || 0
    });
  } catch (error: any) {
    return c.json({
      error: 'Failed to get status',
      message: error.message
    }, 500);
  }
});

app.get('/health', async (c) => {
  return c.json({
    service: 'progeodata-seed',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Manual trigger for testing
app.get('/trigger/:state?', async (c) => {
  const state = c.req.param('state');
  const env = c.env;

  // Override environment variables for manual trigger
  if (state) {
    env.STATES = state.toUpperCase();
    env.ZIP_LIMIT = '10'; // Test with 10 ZIPs for manual trigger
  }

  // Redirect to seed endpoint
  const seedResponse = await app.request('/seed', {
    method: 'POST'
  }, env);

  return seedResponse;
});

export default app;