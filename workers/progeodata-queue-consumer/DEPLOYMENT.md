# ProGeoData Queue Consumer - Deployment Guide

This guide walks through deploying the queue consumer worker from scratch.

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)
- D1 database created (estateflow-db)
- Scraper-browser worker deployed

## Step 1: Create Cloudflare Queue

The queue must be created before deploying the consumer.

```bash
# Create main queue
wrangler queues create progeodata-scrape-queue

# Create dead letter queue
wrangler queues create progeodata-scrape-dlq
```

Expected output:
```
Created queue progeodata-scrape-queue
Queue ID: <queue-id>
```

## Step 2: Create KV Namespace

For rate limiting state:

```bash
# Production KV namespace
wrangler kv:namespace create RATE_LIMIT_STATE

# Development KV namespace (optional)
wrangler kv:namespace create RATE_LIMIT_STATE --preview
```

Copy the `id` from the output.

## Step 3: Update wrangler.toml

Update `wrangler.toml` with your resource IDs:

```toml
# D1 database (update database_id)
[[d1_databases]]
binding = "DB"
database_name = "estateflow-db"
database_id = "your-actual-database-id"  # ← Update this

# KV namespace (update id)
[[kv_namespaces]]
binding = "RATE_LIMIT_STATE"
id = "your-actual-kv-id"  # ← Update this

# Service binding (verify scraper-browser is deployed)
[[services]]
binding = "SCRAPER"
service = "scraper-browser"  # Must match scraper worker name
```

## Step 4: Run Database Migrations

Apply the dead letter queue table:

```bash
# Navigate to worker directory
cd workers/progeodata-queue-consumer

# Apply migration
wrangler d1 execute estateflow-db --file=migrations/001_dead_letter_queue.sql
```

Verify migration:
```bash
wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name='dead_letter_queue';"
```

Expected output:
```
name
─────────────────
dead_letter_queue
```

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Build TypeScript

```bash
npm run build
```

This compiles `src/index.ts` to JavaScript.

## Step 7: Deploy Worker

```bash
wrangler deploy
```

Expected output:
```
Uploaded progeodata-queue-consumer (X.XX sec)
Published progeodata-queue-consumer (X.XX sec)
  https://progeodata-queue-consumer.<your-subdomain>.workers.dev
Current Deployment ID: <deployment-id>
```

## Step 8: Verify Deployment

### Test Health Endpoint

```bash
curl https://progeodata-queue-consumer.<your-subdomain>.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-03T12:00:00Z"
}
```

### Test Stats Endpoint

```bash
curl https://progeodata-queue-consumer.<your-subdomain>.workers.dev/stats
```

Expected response:
```json
{
  "queue_activity": [],
  "rate_limits": [...],
  "timestamp": "2025-12-03T12:00:00Z"
}
```

### Run Verification Script

```bash
WORKER_URL=https://progeodata-queue-consumer.<your-subdomain>.workers.dev node test/verify-deployment.js
```

## Step 9: Verify Queue Consumer Registration

Check that the worker is registered as a queue consumer:

```bash
wrangler queues consumer list progeodata-scrape-queue
```

Expected output:
```
┌─────────────────────────────┬──────────────────────┐
│ Name                        │ Type                 │
├─────────────────────────────┼──────────────────────┤
│ progeodata-queue-consumer   │ Worker               │
└─────────────────────────────┴──────────────────────┘
```

## Step 10: Test Message Processing

You need to send messages to the queue to test processing.

### Option A: Use Queue Seed Worker

If you have the seed worker deployed:

```bash
curl -X POST https://progeodata-queue-seed.<your-subdomain>.workers.dev/seed \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "test",
    "states": ["FL"],
    "limit": 5
  }'
```

### Option B: Manual Queue Message

Using Wrangler (requires queue producer setup):

```bash
wrangler queues producer send progeodata-scrape-queue \
  '{"zip_code":"33139","state":"FL","source_type":"FL_DBPR","profession":"real_estate","priority":5,"scheduled_at":"2025-12-03T12:00:00Z"}'
```

### Monitor Processing

Watch consumer logs in real-time:

```bash
wrangler tail progeodata-queue-consumer --format pretty
```

Expected log output:
```
Processing queue batch: 1 messages
Processing message abc-123 (attempt 1): FL-33139
Rate limit hit for FL_DBPR:FL, waiting 500ms
Scrape completed in 8500ms - 45 results from live
Stored 45/45 professionals in D1
Successfully processed FL-33139: 45 stored
Batch processing complete
```

## Step 11: Verify Data Storage

Check that scraped data is stored in D1:

```bash
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) as count FROM raw_business_data WHERE source = 'FL_DBPR';"
```

Expected output:
```
count
─────
45
```

Check queue state tracking:

```bash
wrangler d1 execute estateflow-db --command="SELECT * FROM scrape_queue_state WHERE status = 'completed' LIMIT 5;"
```

## Troubleshooting

### Error: "Queue not found"

The queue hasn't been created. Run:
```bash
wrangler queues create progeodata-scrape-queue
```

### Error: "Service binding not found"

The scraper-browser worker isn't deployed or has a different name. Verify:
```bash
wrangler deployments list
```

Update `wrangler.toml` with the correct service name.

### Error: "Database not found"

The D1 database hasn't been created. Check:
```bash
wrangler d1 list
```

Create if missing:
```bash
wrangler d1 create estateflow-db
```

Update `wrangler.toml` with the correct `database_id`.

### Error: "KV namespace not found"

KV namespace hasn't been created. Run:
```bash
wrangler kv:namespace create RATE_LIMIT_STATE
```

Update `wrangler.toml` with the namespace `id`.

### Messages not being processed

Check consumer registration:
```bash
wrangler queues consumer list progeodata-scrape-queue
```

If not listed, check `wrangler.toml` queue configuration and redeploy.

### Rate limit errors

Check rate limit status in D1:
```bash
wrangler d1 execute estateflow-db --command="SELECT * FROM rate_limits WHERE is_throttled = TRUE;"
```

If throttled, update `throttled_until` to a past date:
```bash
wrangler d1 execute estateflow-db --command="UPDATE rate_limits SET is_throttled = FALSE, throttled_until = NULL WHERE source_type = 'FL_DBPR';"
```

### Service binding timeout

The scraper-browser worker might be taking too long. Check its logs:
```bash
wrangler tail scraper-browser
```

Increase timeout in scraper if needed.

## Production Checklist

Before going to production:

- [ ] D1 database created and migrations applied
- [ ] Cloudflare Queue created (main + DLQ)
- [ ] KV namespace created for rate limiting
- [ ] Service binding configured to scraper-browser
- [ ] wrangler.toml updated with all resource IDs
- [ ] Worker deployed successfully
- [ ] Health endpoint returns 200 OK
- [ ] Stats endpoint returns data
- [ ] Test message processes successfully
- [ ] Data stored in raw_business_data table
- [ ] Queue state tracking working
- [ ] Rate limits enforced correctly
- [ ] Logs show no errors
- [ ] DLQ configured and tested

## Monitoring

### View Queue Metrics

Cloudflare Dashboard:
1. Go to Workers & Pages
2. Click "Queues"
3. Select "progeodata-scrape-queue"
4. View metrics: depth, throughput, processing time

### View Consumer Metrics

Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select "progeodata-queue-consumer"
3. View: invocations, errors, duration

### Real-time Logs

```bash
wrangler tail progeodata-queue-consumer --format pretty
```

### Query Stats via API

```bash
curl https://progeodata-queue-consumer.<your-subdomain>.workers.dev/stats | jq
```

## Scaling

### Increase Throughput

To process more messages per second:

1. **Increase batch size** (max 100):
```toml
[[queues.consumers]]
max_batch_size = 20  # Process 20 at once
```

2. **Increase rate limits** in D1:
```sql
UPDATE rate_limits
SET requests_per_second = 2.0
WHERE source_type = 'FL_DBPR';
```

3. **Deploy more consumers** (Cloudflare auto-scales):
- Workers automatically scale based on queue depth
- No configuration needed

### Monitor D1 Limits

Free tier: 100k writes/day

Check usage:
```bash
wrangler d1 info estateflow-db
```

If approaching limit:
- Reduce scraping frequency
- Upgrade to paid plan
- Optimize data storage (fewer columns, compress JSON)

## Rollback

If deployment fails or has issues:

```bash
# List deployments
wrangler deployments list

# Rollback to previous deployment
wrangler rollback [deployment-id]
```

## Related Documentation

- [Queue Consumer README](README.md)
- [Scraper Browser Worker](../scraper-browser/README.md)
- [Queue Seed Worker](../progeodata-queue-seed/README.md)
- [Database Schema](../../worktrees/siteforge/migrations/010_queue_tables.sql)
- [Cloudflare Queues Docs](https://developers.cloudflare.com/queues/)

## Support

For issues or questions:
1. Check worker logs: `wrangler tail progeodata-queue-consumer`
2. Check queue metrics in Cloudflare Dashboard
3. Review database state: `SELECT * FROM scrape_queue_state`
4. Review dead letter queue: `SELECT * FROM dead_letter_queue WHERE resolved = FALSE`
