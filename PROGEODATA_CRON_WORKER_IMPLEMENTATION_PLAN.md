# ProGeoData Cron Worker Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation plan for the ProGeoData Cron Worker system - a 24/7 automated database population infrastructure using Cloudflare Queue-based architecture for parallel scraping of real estate professional data from state boards.

**Project Goals:**
- Deploy a scalable, queue-based scraping infrastructure
- Process 864,000+ records per day with 10+ concurrent workers
- Implement robust rate limiting (1 req/sec per source)
- Ensure 24/7 autonomous operation with error recovery
- Progressively test and deploy to production

**Timeline:** 3-5 days for full implementation and testing

**Key Milestones:**
1. Day 1: Infrastructure setup and D1 schema
2. Day 2: Worker implementations (seed, consumer, coordinator)
3. Day 3: Queue configuration and remote bindings
4. Day 4: Progressive testing and deployment
5. Day 5: Monitoring setup and production launch

## System Architecture

### Components Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Coordinator    │────▶│   Seed Worker    │────▶│ Cloudflare Queue│
│    Worker       │     │ (ZIP Population) │     │  (ZIP Codes)    │
│  (Cron: 1min)   │     └──────────────────┘     └────────┬────────┘
└─────────────────┘                                        │
                                                          ▼
                        ┌──────────────────────────────────────────┐
                        │         Consumer Workers (10+)           │
                        │        (Queue Processing)                │
                        └───────────┬──────────────────────────────┘
                                   │
                        ┌──────────▼──────────────┐
                        │   Service Binding to    │
                        │   scraper-browser        │
                        │   (Browser Rendering)   │
                        └──────────┬──────────────┘
                                   │
                        ┌──────────▼──────────────┐
                        │     D1 Database         │
                        │   - pros table          │
                        │   - queue_state         │
                        │   - rate_limits        │
                        └──────────────────────────┘
```

### Technology Stack
- **Cloudflare Workers**: Core compute platform
- **Cloudflare Queues**: Distributed job queue
- **Cloudflare D1**: SQLite database for state and data
- **Browser Rendering API**: Via scraper-browser worker
- **Service Bindings**: Inter-worker communication
- **Cron Triggers**: Scheduled execution

## Phase 1: Infrastructure Setup (Parallel Tasks)

### Task 1.1: Create Directory Structure
**Priority:** Critical
**Estimate:** 30 minutes
**Dependencies:** None

```bash
# Create worker directories
mkdir -p workers/progeodata-coordinator
mkdir -p workers/progeodata-seed
mkdir -p workers/progeodata-consumer
mkdir -p workers/progeodata-shared
mkdir -p migrations/progeodata
mkdir -p scripts/progeodata
mkdir -p tests/progeodata
```

### Task 1.2: D1 Database Schema
**Priority:** Critical
**Estimate:** 1 hour
**Dependencies:** None

Create migrations for:
1. Queue state management
2. Rate limiting tracking
3. Error logs and retries
4. Processing statistics

### Task 1.3: Package.json Setup
**Priority:** High
**Estimate:** 30 minutes
**Dependencies:** Task 1.1

Initialize package.json for each worker with required dependencies.

## Phase 2: Worker Implementations (Parallel Tasks)

### Task 2.1: Seed Worker Implementation
**Priority:** Critical
**Estimate:** 2-3 hours
**Dependencies:** Task 1.1, 1.2

**Responsibilities:**
- Load ZIP codes for FL, TX, CA from configuration
- Batch ZIP codes into queue messages
- Implement progressive loading (test with 10, then 100, then 1000 ZIPs)
- Track queue population state in D1

**Key Files:**
- `workers/progeodata-seed/src/index.ts`
- `workers/progeodata-seed/src/zip-loader.ts`
- `workers/progeodata-seed/wrangler.toml`

### Task 2.2: Consumer Worker Implementation
**Priority:** Critical
**Estimate:** 3-4 hours
**Dependencies:** Task 1.1, 1.2

**Responsibilities:**
- Process ZIP codes from queue
- Call scraper-browser via service binding
- Implement rate limiting (1 req/sec per source)
- Store results in D1 pros table
- Handle errors with exponential backoff
- Track processing metrics

**Key Files:**
- `workers/progeodata-consumer/src/index.ts`
- `workers/progeodata-consumer/src/rate-limiter.ts`
- `workers/progeodata-consumer/src/data-processor.ts`
- `workers/progeodata-consumer/wrangler.toml`

### Task 2.3: Coordinator Worker Implementation
**Priority:** High
**Estimate:** 2 hours
**Dependencies:** Task 1.1

**Responsibilities:**
- Cron trigger every minute
- Monitor queue depth
- Trigger seed worker when queue is low
- Scale consumer workers based on load
- Generate health metrics
- Alert on failures

**Key Files:**
- `workers/progeodata-coordinator/src/index.ts`
- `workers/progeodata-coordinator/src/monitor.ts`
- `workers/progeodata-coordinator/wrangler.toml`

## Phase 3: Configuration & Bindings

### Task 3.1: Queue Configuration
**Priority:** Critical
**Estimate:** 1 hour
**Dependencies:** Tasks 2.1, 2.2

Create and configure Cloudflare Queue:
- Queue name: `progeodata-zip-queue`
- Max batch size: 10
- Max batch timeout: 30 seconds
- Max retries: 3
- Dead letter queue: `progeodata-dlq`

### Task 3.2: Service Bindings Setup
**Priority:** Critical
**Estimate:** 1 hour
**Dependencies:** Task 2.2

Configure remote bindings to scraper-browser worker for consumer workers.

### Task 3.3: Cron Trigger Configuration
**Priority:** High
**Estimate:** 30 minutes
**Dependencies:** Task 2.3

Set up cron triggers for coordinator worker.

## Phase 4: Testing & Deployment

### Task 4.1: Progressive Testing Framework
**Priority:** Critical
**Estimate:** 2 hours
**Dependencies:** All Phase 2 tasks

**Test Stages:**
1. **Stage 1**: 10 ZIP codes, 1 worker
2. **Stage 2**: 100 ZIP codes, 2 workers
3. **Stage 3**: 1,000 ZIP codes, 5 workers
4. **Stage 4**: 10,000 ZIP codes, 10 workers
5. **Stage 5**: Full production (all ZIP codes)

### Task 4.2: Deployment Scripts
**Priority:** High
**Estimate:** 1 hour
**Dependencies:** All configurations

Create automated deployment scripts for all workers.

### Task 4.3: Monitoring Dashboard
**Priority:** Medium
**Estimate:** 2 hours
**Dependencies:** Deployment complete

Create real-time monitoring for:
- Queue depth
- Processing rate
- Error rate
- Worker health
- D1 write metrics

## Detailed Implementation Files

### 1. D1 Database Migrations

**File: `migrations/progeodata/001_queue_management.sql`**
```sql
-- Queue state tracking
CREATE TABLE IF NOT EXISTS queue_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_name TEXT NOT NULL,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  last_seed_time TEXT,
  last_process_time TEXT,
  status TEXT DEFAULT 'idle',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL UNIQUE,
  requests_per_second REAL DEFAULT 1.0,
  last_request_time INTEGER,
  request_count INTEGER DEFAULT 0,
  reset_time INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Processing log
CREATE TABLE IF NOT EXISTS processing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT NOT NULL,
  records_found INTEGER DEFAULT 0,
  records_saved INTEGER DEFAULT 0,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Error tracking
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSON,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Worker health
CREATE TABLE IF NOT EXISTS worker_health (
  worker_id TEXT PRIMARY KEY,
  worker_type TEXT NOT NULL,
  status TEXT DEFAULT 'healthy',
  last_heartbeat TEXT,
  items_processed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  average_processing_time_ms REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX idx_queue_state_status ON queue_state(status);
CREATE INDEX idx_rate_limits_source ON rate_limits(source);
CREATE INDEX idx_processing_log_zip ON processing_log(zip_code, state);
CREATE INDEX idx_error_log_created ON error_log(created_at);
CREATE INDEX idx_worker_health_status ON worker_health(status);
```

### 2. Seed Worker Implementation

**File: `workers/progeodata-seed/package.json`**
```json
{
  "name": "progeodata-seed",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest",
    "test:stage1": "npm run dev -- --env stage1",
    "test:stage2": "npm run dev -- --env stage2"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "typescript": "^5.3.3",
    "vitest": "^1.3.0",
    "wrangler": "^3.0.0"
  },
  "dependencies": {
    "hono": "^4.0.0"
  }
}
```

**File: `workers/progeodata-seed/wrangler.toml`**
```toml
name = "progeodata-seed"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "af57e902fd9dcaad7484a7195ac0f536"

# Queue producer binding
[[queues.producers]]
queue = "progeodata-zip-queue"
binding = "ZIP_QUEUE"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "progeodata"
database_id = "YOUR_DATABASE_ID"

# Environment variables
[vars]
BATCH_SIZE = "100"
STATES = "FL,TX,CA"

# Stage 1: Test with 10 ZIPs
[env.stage1]
vars = {
  BATCH_SIZE = "10",
  STATES = "FL",
  ZIP_LIMIT = "10"
}

# Stage 2: Test with 100 ZIPs
[env.stage2]
vars = {
  BATCH_SIZE = "50",
  STATES = "FL",
  ZIP_LIMIT = "100"
}

# Stage 3: Test with 1000 ZIPs
[env.stage3]
vars = {
  BATCH_SIZE = "100",
  STATES = "FL,TX",
  ZIP_LIMIT = "1000"
}

# Production: All ZIPs
[env.production]
vars = {
  BATCH_SIZE = "500",
  STATES = "FL,TX,CA",
  ZIP_LIMIT = "0"
}
```

**File: `workers/progeodata-seed/src/index.ts`**
```typescript
import { Hono } from 'hono';

export interface Env {
  ZIP_QUEUE: Queue;
  DB: D1Database;
  BATCH_SIZE: string;
  STATES: string;
  ZIP_LIMIT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Florida ZIP codes (major areas)
const FL_ZIPS = [
  '33101', '33109', '33139', '33140', // Miami
  '33301', '33304', '33308', '33312', // Fort Lauderdale
  '33401', '33407', '33409', '33411', // West Palm Beach
  '32801', '32803', '32806', '32807', // Orlando
  '33601', '33602', '33605', '33606', // Tampa
  '32202', '32204', '32205', '32207', // Jacksonville
  // Add more ZIP codes...
];

const TX_ZIPS = [
  '75201', '75202', '75203', '75204', // Dallas
  '77001', '77002', '77003', '77004', // Houston
  '78701', '78702', '78703', '78704', // Austin
  '78201', '78202', '78203', '78204', // San Antonio
  // Add more ZIP codes...
];

const CA_ZIPS = [
  '90001', '90002', '90003', '90004', // Los Angeles
  '94102', '94103', '94104', '94105', // San Francisco
  '92101', '92102', '92103', '92104', // San Diego
  '95814', '95815', '95816', '95817', // Sacramento
  // Add more ZIP codes...
];

app.post('/seed', async (c) => {
  const env = c.env;
  const batchSize = parseInt(env.BATCH_SIZE);
  const states = env.STATES.split(',');
  const zipLimit = parseInt(env.ZIP_LIMIT) || 0;

  try {
    // Update queue state
    await env.DB.prepare(`
      INSERT INTO queue_state (queue_name, status, last_seed_time)
      VALUES ('progeodata-zip-queue', 'seeding', datetime('now'))
      ON CONFLICT(queue_name) DO UPDATE SET
        status = 'seeding',
        last_seed_time = datetime('now')
    `).run();

    let totalQueued = 0;

    for (const state of states) {
      let zips: string[] = [];

      switch(state) {
        case 'FL': zips = FL_ZIPS; break;
        case 'TX': zips = TX_ZIPS; break;
        case 'CA': zips = CA_ZIPS; break;
      }

      // Apply ZIP limit for testing
      if (zipLimit > 0) {
        zips = zips.slice(0, Math.min(zipLimit, zips.length));
      }

      // Batch ZIPs for queue
      for (let i = 0; i < zips.length; i += batchSize) {
        const batch = zips.slice(i, i + batchSize);
        const messages = batch.map(zip => ({
          body: JSON.stringify({
            zip,
            state,
            timestamp: Date.now(),
            retryCount: 0
          })
        }));

        await env.ZIP_QUEUE.sendBatch(messages);
        totalQueued += batch.length;
      }
    }

    // Update queue state
    await env.DB.prepare(`
      UPDATE queue_state SET
        status = 'active',
        total_items = total_items + ?,
        updated_at = datetime('now')
      WHERE queue_name = 'progeodata-zip-queue'
    `).bind(totalQueued).run();

    return c.json({
      success: true,
      message: `Queued ${totalQueued} ZIP codes for processing`,
      states: states,
      batchSize: batchSize
    });

  } catch (error) {
    console.error('Seed error:', error);

    // Log error
    await env.DB.prepare(`
      INSERT INTO error_log (error_type, error_message, context)
      VALUES ('seed_error', ?, ?)
    `).bind(
      error.message,
      JSON.stringify({ states, batchSize })
    ).run();

    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

app.get('/status', async (c) => {
  const env = c.env;

  const status = await env.DB.prepare(`
    SELECT * FROM queue_state
    WHERE queue_name = 'progeodata-zip-queue'
  `).first();

  return c.json(status || { message: 'No queue state found' });
});

export default app;
```

### 3. Consumer Worker Implementation

**File: `workers/progeodata-consumer/wrangler.toml`**
```toml
name = "progeodata-consumer"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "af57e902fd9dcaad7484a7195ac0f536"

# Queue consumer binding
[[queues.consumers]]
queue = "progeodata-zip-queue"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "progeodata-dlq"

# Service binding to scraper-browser
[[services]]
binding = "SCRAPER"
service = "scraper-browser"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "progeodata"
database_id = "YOUR_DATABASE_ID"

# Environment variables
[vars]
RATE_LIMIT_PER_SECOND = "1"
WORKER_ID = "consumer-01"
MAX_RETRIES = "3"

# Development
[env.development]
vars = {
  DEBUG = "true",
  RATE_LIMIT_PER_SECOND = "0.5"
}
```

**File: `workers/progeodata-consumer/src/index.ts`**
```typescript
export interface Env {
  SCRAPER: Fetcher;
  DB: D1Database;
  RATE_LIMIT_PER_SECOND: string;
  WORKER_ID: string;
  MAX_RETRIES: string;
}

interface QueueMessage {
  zip: string;
  state: string;
  timestamp: number;
  retryCount: number;
}

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    const workerId = env.WORKER_ID;
    const rateLimit = parseFloat(env.RATE_LIMIT_PER_SECOND);
    const maxRetries = parseInt(env.MAX_RETRIES);

    // Process messages with rate limiting
    for (const message of batch.messages) {
      const startTime = Date.now();

      try {
        // Check rate limit
        await enforceRateLimit(env.DB, 'FL_DBPR', rateLimit);

        // Call scraper via service binding
        const searchUrl = `https://www.myfloridalicense.com/wl11.asp?mode=2&search=NAME&SID=&brd=&typ=N&key=${message.body.zip}`;

        const response = await env.SCRAPER.fetch('https://scraper-browser.workers.dev/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: searchUrl,
            waitFor: 'table',
            screenshot: false
          })
        });

        if (!response.ok) {
          throw new Error(`Scraper error: ${response.status}`);
        }

        const data = await response.json();

        // Process and save to D1
        const professionals = parseScraperData(data);
        await saveProfessionals(env.DB, professionals, message.body.state);

        // Log success
        await env.DB.prepare(`
          INSERT INTO processing_log
          (worker_id, zip_code, state, status, records_found, records_saved, processing_time_ms)
          VALUES (?, ?, ?, 'success', ?, ?, ?)
        `).bind(
          workerId,
          message.body.zip,
          message.body.state,
          professionals.length,
          professionals.length,
          Date.now() - startTime
        ).run();

        // Update worker health
        await updateWorkerHealth(env.DB, workerId, 'healthy', Date.now() - startTime);

        // Acknowledge message
        message.ack();

      } catch (error) {
        console.error(`Error processing ZIP ${message.body.zip}:`, error);

        // Log error
        await env.DB.prepare(`
          INSERT INTO error_log
          (worker_id, error_type, error_message, context, retry_count, max_retries)
          VALUES (?, 'processing_error', ?, ?, ?, ?)
        `).bind(
          workerId,
          error.message,
          JSON.stringify(message.body),
          message.body.retryCount,
          maxRetries
        ).run();

        // Retry or move to DLQ
        if (message.body.retryCount < maxRetries) {
          message.retry();
        } else {
          // Message will automatically go to DLQ after max retries
          message.ack();
        }

        // Update worker health
        await updateWorkerHealth(env.DB, workerId, 'degraded', Date.now() - startTime, true);
      }

      // Add delay between requests to respect rate limit
      const delayMs = Math.max(1000 / rateLimit, 1000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    // Health check endpoint
    if (request.url.endsWith('/health')) {
      const health = await env.DB.prepare(`
        SELECT * FROM worker_health WHERE worker_id = ?
      `).bind(env.WORKER_ID).first();

      return new Response(JSON.stringify(health || { status: 'unknown' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('ProGeoData Consumer Worker', { status: 200 });
  }
};

async function enforceRateLimit(db: D1Database, source: string, limit: number): Promise<void> {
  const now = Date.now();

  const rateInfo = await db.prepare(`
    SELECT * FROM rate_limits WHERE source = ?
  `).bind(source).first();

  if (rateInfo && rateInfo.last_request_time) {
    const timeSinceLastRequest = now - rateInfo.last_request_time;
    const minInterval = 1000 / limit;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Update rate limit tracking
  await db.prepare(`
    INSERT INTO rate_limits (source, last_request_time, request_count)
    VALUES (?, ?, 1)
    ON CONFLICT(source) DO UPDATE SET
      last_request_time = ?,
      request_count = request_count + 1
  `).bind(source, now, now).run();
}

function parseScraperData(data: any): any[] {
  // Parse HTML and extract professional data
  // This is a simplified version - actual implementation would parse the HTML
  const professionals = [];

  // Extract data from scraped HTML
  // ... parsing logic ...

  return professionals;
}

async function saveProfessionals(db: D1Database, professionals: any[], state: string): Promise<void> {
  // Save to pros table using batch inserts
  for (const pro of professionals) {
    await db.prepare(`
      INSERT OR IGNORE INTO pros (
        name, email, phone, license_number,
        address, city, state, zip_code,
        profession, company, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      pro.name, pro.email, pro.phone, pro.license,
      pro.address, pro.city, state, pro.zip,
      pro.profession || 'Real Estate', pro.company, 'active'
    ).run();
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
    (worker_id, worker_type, status, last_heartbeat, items_processed, errors_count, average_processing_time_ms)
    VALUES (?, 'consumer', ?, datetime('now'), 1, ?, ?)
    ON CONFLICT(worker_id) DO UPDATE SET
      status = ?,
      last_heartbeat = datetime('now'),
      items_processed = items_processed + 1,
      errors_count = errors_count + ?,
      average_processing_time_ms =
        (average_processing_time_ms * items_processed + ?) / (items_processed + 1),
      updated_at = datetime('now')
  `).bind(
    workerId, status, hasError ? 1 : 0, processingTime,
    status, hasError ? 1 : 0, processingTime
  ).run();
}
```

### 4. Coordinator Worker Implementation

**File: `workers/progeodata-coordinator/wrangler.toml`**
```toml
name = "progeodata-coordinator"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "af57e902fd9dcaad7484a7195ac0f536"

# Cron trigger - every minute
[triggers]
crons = ["* * * * *"]

# Service bindings
[[services]]
binding = "SEED_WORKER"
service = "progeodata-seed"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "progeodata"
database_id = "YOUR_DATABASE_ID"

# Environment variables
[vars]
MIN_QUEUE_DEPTH = "100"
MAX_QUEUE_DEPTH = "10000"
SEED_THRESHOLD = "50"
ALERT_THRESHOLD_ERROR_RATE = "0.1"
ALERT_THRESHOLD_QUEUE_STALE_MINUTES = "30"
```

**File: `workers/progeodata-coordinator/src/index.ts`**
```typescript
export interface Env {
  SEED_WORKER: Fetcher;
  DB: D1Database;
  MIN_QUEUE_DEPTH: string;
  MAX_QUEUE_DEPTH: string;
  SEED_THRESHOLD: string;
  ALERT_THRESHOLD_ERROR_RATE: string;
  ALERT_THRESHOLD_QUEUE_STALE_MINUTES: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const minQueueDepth = parseInt(env.MIN_QUEUE_DEPTH);
    const seedThreshold = parseInt(env.SEED_THRESHOLD);
    const errorRateThreshold = parseFloat(env.ALERT_THRESHOLD_ERROR_RATE);
    const staleMinutes = parseInt(env.ALERT_THRESHOLD_QUEUE_STALE_MINUTES);

    try {
      // Check queue state
      const queueState = await env.DB.prepare(`
        SELECT * FROM queue_state WHERE queue_name = 'progeodata-zip-queue'
      `).first();

      const currentDepth = queueState ?
        (queueState.total_items - queueState.processed_items - queueState.failed_items) : 0;

      // Check if we need to seed more ZIPs
      if (currentDepth < seedThreshold) {
        console.log(`Queue depth (${currentDepth}) below threshold (${seedThreshold}), triggering seed`);

        // Trigger seed worker
        const seedResponse = await env.SEED_WORKER.fetch('https://progeodata-seed.workers.dev/seed', {
          method: 'POST'
        });

        if (!seedResponse.ok) {
          throw new Error(`Failed to trigger seed: ${seedResponse.status}`);
        }
      }

      // Check worker health
      const workerHealth = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_workers,
          COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_workers,
          COUNT(CASE WHEN status = 'degraded' THEN 1 END) as degraded_workers,
          COUNT(CASE WHEN datetime(last_heartbeat) < datetime('now', '-5 minutes') THEN 1 END) as stale_workers,
          AVG(average_processing_time_ms) as avg_processing_time
        FROM worker_health
        WHERE worker_type = 'consumer'
      `).first();

      // Check error rates
      const errorStats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_errors,
          COUNT(DISTINCT worker_id) as affected_workers
        FROM error_log
        WHERE datetime(created_at) > datetime('now', '-1 hour')
      `).first();

      const processingStats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_processed,
          SUM(records_saved) as total_records_saved
        FROM processing_log
        WHERE datetime(created_at) > datetime('now', '-1 hour')
      `).first();

      // Calculate error rate
      const errorRate = processingStats.total_processed > 0 ?
        errorStats.total_errors / processingStats.total_processed : 0;

      // Generate alerts if needed
      const alerts = [];

      if (errorRate > errorRateThreshold) {
        alerts.push({
          type: 'high_error_rate',
          message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${errorRateThreshold * 100}%`,
          severity: 'critical'
        });
      }

      if (workerHealth.stale_workers > 0) {
        alerts.push({
          type: 'stale_workers',
          message: `${workerHealth.stale_workers} workers have not reported heartbeat in 5 minutes`,
          severity: 'warning'
        });
      }

      if (queueState && new Date(queueState.last_process_time) < new Date(Date.now() - staleMinutes * 60000)) {
        alerts.push({
          type: 'queue_stale',
          message: `Queue has not processed items in ${staleMinutes} minutes`,
          severity: 'critical'
        });
      }

      // Log coordinator status
      await env.DB.prepare(`
        INSERT INTO worker_health
        (worker_id, worker_type, status, last_heartbeat, context)
        VALUES ('coordinator', 'coordinator', 'healthy', datetime('now'), ?)
        ON CONFLICT(worker_id) DO UPDATE SET
          status = 'healthy',
          last_heartbeat = datetime('now'),
          context = ?,
          updated_at = datetime('now')
      `).bind(
        JSON.stringify({
          queue_depth: currentDepth,
          worker_health: workerHealth,
          error_rate: errorRate,
          alerts: alerts
        }),
        JSON.stringify({
          queue_depth: currentDepth,
          worker_health: workerHealth,
          error_rate: errorRate,
          alerts: alerts
        })
      ).run();

      // Send alerts if any
      if (alerts.length > 0) {
        console.error('ALERTS:', alerts);
        // In production, send to monitoring service or email
      }

      console.log('Coordinator health check complete', {
        queue_depth: currentDepth,
        healthy_workers: workerHealth.healthy_workers,
        error_rate: errorRate,
        alerts: alerts.length
      });

    } catch (error) {
      console.error('Coordinator error:', error);

      // Log error
      await env.DB.prepare(`
        INSERT INTO error_log (worker_id, error_type, error_message)
        VALUES ('coordinator', 'coordinator_error', ?)
      `).bind(error.message).run();
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    // Manual trigger endpoint
    if (request.url.endsWith('/trigger')) {
      await this.scheduled(
        { cron: '* * * * *', scheduledTime: Date.now(), noRetry: false },
        env,
        { waitUntil: async () => {}, passThroughOnException: () => {} }
      );

      return new Response('Coordinator triggered', { status: 200 });
    }

    // Status endpoint
    if (request.url.endsWith('/status')) {
      const health = await env.DB.prepare(`
        SELECT * FROM worker_health WHERE worker_id = 'coordinator'
      `).first();

      return new Response(JSON.stringify(health || { status: 'unknown' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('ProGeoData Coordinator', { status: 200 });
  }
};
```

### 5. Deployment Scripts

**File: `scripts/progeodata/deploy-all.sh`**
```bash
#!/bin/bash

echo "ProGeoData Cron Worker System Deployment"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if logged in to Wrangler
echo -e "${YELLOW}Checking Wrangler authentication...${NC}"
wrangler whoami || exit 1

# Create D1 database if not exists
echo -e "${YELLOW}Creating D1 database...${NC}"
wrangler d1 create progeodata || echo "Database already exists"

# Get database ID
DB_ID=$(wrangler d1 list | grep progeodata | awk '{print $2}')
echo -e "${GREEN}Database ID: $DB_ID${NC}"

# Apply migrations
echo -e "${YELLOW}Applying database migrations...${NC}"
wrangler d1 execute progeodata --file=migrations/progeodata/001_queue_management.sql

# Create Queue
echo -e "${YELLOW}Creating Cloudflare Queue...${NC}"
wrangler queues create progeodata-zip-queue || echo "Queue already exists"
wrangler queues create progeodata-dlq || echo "DLQ already exists"

# Deploy workers in order
echo -e "${YELLOW}Deploying Seed Worker...${NC}"
cd workers/progeodata-seed
npm install
wrangler deploy
cd ../..

echo -e "${YELLOW}Deploying Consumer Worker...${NC}"
cd workers/progeodata-consumer
npm install
wrangler deploy
cd ../..

echo -e "${YELLOW}Deploying Coordinator Worker...${NC}"
cd workers/progeodata-coordinator
npm install
wrangler deploy
cd ../..

echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test with Stage 1: npm run test:stage1"
echo "2. Monitor at: https://dash.cloudflare.com/"
echo "3. View logs: wrangler tail progeodata-consumer"
```

**File: `scripts/progeodata/test-progressive.ps1`**
```powershell
# Progressive Testing Script for Windows

Write-Host "ProGeoData Progressive Testing" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Stage 1: Test with 10 ZIPs
Write-Host "`nStage 1: Testing with 10 ZIP codes..." -ForegroundColor Yellow
cd workers/progeodata-seed
npm run test:stage1

Write-Host "Waiting 30 seconds for processing..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Check results
wrangler d1 execute progeodata --command="SELECT COUNT(*) as count FROM pros"

# Stage 2: Test with 100 ZIPs
Write-Host "`nStage 2: Testing with 100 ZIP codes..." -ForegroundColor Yellow
npm run test:stage2

Write-Host "Waiting 2 minutes for processing..." -ForegroundColor Gray
Start-Sleep -Seconds 120

# Check results
wrangler d1 execute progeodata --command="SELECT COUNT(*) as count FROM pros"

# Continue with more stages...
```

### 6. Monitoring Dashboard

**File: `workers/progeodata-dashboard/src/index.html`**
```html
<!DOCTYPE html>
<html>
<head>
    <title>ProGeoData Monitoring Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric {
            display: inline-block;
            margin: 10px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .metric h3 { margin: 0 0 10px 0; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .status-healthy { color: green; }
        .status-degraded { color: orange; }
        .status-error { color: red; }
        #logs {
            margin-top: 20px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
            max-height: 400px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <h1>ProGeoData Monitoring Dashboard</h1>

    <div id="metrics">
        <div class="metric">
            <h3>Queue Depth</h3>
            <div class="value" id="queue-depth">-</div>
        </div>

        <div class="metric">
            <h3>Processing Rate</h3>
            <div class="value" id="processing-rate">-/min</div>
        </div>

        <div class="metric">
            <h3>Error Rate</h3>
            <div class="value" id="error-rate">-%</div>
        </div>

        <div class="metric">
            <h3>Active Workers</h3>
            <div class="value" id="active-workers">-</div>
        </div>

        <div class="metric">
            <h3>Total Records</h3>
            <div class="value" id="total-records">-</div>
        </div>
    </div>

    <h2>Recent Logs</h2>
    <div id="logs">Loading...</div>

    <script>
        async function updateDashboard() {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();

                document.getElementById('queue-depth').textContent = data.queueDepth || '0';
                document.getElementById('processing-rate').textContent = `${data.processingRate || 0}/min`;
                document.getElementById('error-rate').textContent = `${(data.errorRate * 100).toFixed(2)}%`;
                document.getElementById('active-workers').textContent = data.activeWorkers || '0';
                document.getElementById('total-records').textContent = data.totalRecords || '0';

                // Update logs
                const logsHtml = data.recentLogs.map(log =>
                    `<div class="log-entry">[${log.timestamp}] ${log.message}</div>`
                ).join('');
                document.getElementById('logs').innerHTML = logsHtml || 'No recent logs';

            } catch (error) {
                console.error('Failed to update dashboard:', error);
            }
        }

        // Update every 5 seconds
        setInterval(updateDashboard, 5000);
        updateDashboard();
    </script>
</body>
</html>
```

## Testing Procedures

### Stage 1: Initial Test (10 ZIPs, 1 worker)
```bash
# Deploy with test configuration
cd workers/progeodata-seed
wrangler deploy --env stage1

# Trigger seed
curl -X POST https://progeodata-seed.workers.dev/seed

# Monitor
wrangler tail progeodata-consumer

# Verify
wrangler d1 execute progeodata --command="SELECT COUNT(*) FROM pros"
```

### Stage 2: Small Scale (100 ZIPs, 2 workers)
```bash
# Deploy with stage2 configuration
wrangler deploy --env stage2

# Scale consumers
wrangler deploy progeodata-consumer --name progeodata-consumer-01
wrangler deploy progeodata-consumer --name progeodata-consumer-02

# Monitor both
wrangler tail progeodata-consumer-01 &
wrangler tail progeodata-consumer-02 &
```

### Stage 3: Medium Scale (1,000 ZIPs, 5 workers)
- Deploy 5 consumer instances
- Monitor queue depth and processing rate
- Check error rates

### Stage 4: Large Scale (10,000 ZIPs, 10 workers)
- Deploy 10 consumer instances
- Monitor D1 write limits
- Check rate limiting effectiveness

### Stage 5: Production (All ZIPs, 10+ workers)
- Full deployment with all ZIP codes
- 24/7 cron scheduling enabled
- Full monitoring and alerting

## Success Metrics

### Performance Targets
- **Processing Rate**: 10+ records/second across all workers
- **Error Rate**: < 1%
- **Queue Latency**: < 60 seconds average
- **Worker Uptime**: > 99%
- **D1 Writes**: < 100,000/day (free tier limit)

### Monitoring KPIs
1. **Queue Depth**: Should stay between 100-10,000
2. **Processing Time**: < 5 seconds per ZIP code
3. **Success Rate**: > 99% of ZIPs processed successfully
4. **Data Quality**: > 95% records with complete information
5. **Cost Efficiency**: < $50/month for infrastructure

## Risk Mitigation

### Technical Risks
1. **Rate Limiting Violations**
   - Mitigation: Enforced 1 req/sec limit with buffer
   - Fallback: Exponential backoff on 429 errors

2. **D1 Write Limits**
   - Mitigation: Batch inserts, deduplication
   - Fallback: Queue throttling if approaching limit

3. **Worker Failures**
   - Mitigation: Health checks, auto-restart
   - Fallback: Dead letter queue for failed messages

4. **Data Quality Issues**
   - Mitigation: Validation before insert
   - Fallback: Error logging for manual review

### Operational Risks
1. **Cost Overrun**
   - Monitoring: Daily cost alerts
   - Limit: Hard caps on worker instances

2. **Data Source Changes**
   - Monitoring: Success rate tracking
   - Response: Rapid parser updates

3. **Compliance Issues**
   - Approach: Respect robots.txt
   - Rate limiting: Conservative defaults

## Next Steps

### Immediate Actions (Day 1)
1. Create directory structure
2. Initialize package.json files
3. Create D1 database and migrations
4. Implement seed worker

### Day 2 Actions
1. Implement consumer worker
2. Set up queue configuration
3. Configure service bindings
4. Initial testing with Stage 1

### Day 3 Actions
1. Implement coordinator worker
2. Set up cron triggers
3. Progressive testing through Stage 3
4. Deploy monitoring dashboard

### Day 4-5 Actions
1. Complete Stage 4-5 testing
2. Production deployment
3. Enable 24/7 operation
4. Documentation updates

## Documentation

### Operational Runbooks
1. **Starting the System**
2. **Stopping the System**
3. **Scaling Workers**
4. **Handling Failures**
5. **Database Maintenance**
6. **Queue Management**

### API Documentation
- Seed Worker endpoints
- Consumer Worker health checks
- Coordinator status endpoints
- Dashboard API

### Troubleshooting Guide
- Common errors and solutions
- Performance tuning
- Debug procedures
- Log analysis
```