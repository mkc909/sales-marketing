# ProGeoData Queue Consumer Worker

Consumes scrape queue messages and orchestrates browser-based scraping via service binding to the scraper-browser worker.

## Overview

This worker processes messages from the Cloudflare Queue, enforces rate limits, calls the scraper-browser worker, and stores results in D1. It's the orchestration layer between the queue and the actual scraping logic.

### Key Features

- **Batch Processing**: Processes up to 10 messages per batch
- **Rate Limiting**: Enforces 1 req/sec per state source
- **Service Binding**: Calls scraper-browser worker directly (no HTTP overhead)
- **Retry Logic**: Exponential backoff for failed scrapes (max 3 retries)
- **Dead Letter Queue**: Failed messages after 3 retries go to DLQ
- **State Tracking**: Updates D1 with processing status in real-time

## Architecture

```
┌─────────────────────┐
│  Cloudflare Queue   │
│  progeodata-scrape  │
└──────────┬──────────┘
           │
           │ Batch of Messages
           ▼
┌─────────────────────┐     ┌──────────────────┐
│  Queue Consumer     │────▶│  Rate Limit      │
│  (This Worker)      │     │  Check (KV + D1) │
└──────────┬──────────┘     └──────────────────┘
           │
           │ Service Binding
           ▼
┌─────────────────────┐
│  Scraper Browser    │
│  (Puppeteer)        │
└──────────┬──────────┘
           │
           │ Results
           ▼
┌─────────────────────┐
│  D1 Database        │
│  raw_business_data  │
└─────────────────────┘
```

## Environment Bindings

### Queue Consumer
- `progeodata-scrape-queue` - Main queue (configured in wrangler.toml)
- `progeodata-scrape-dlq` - Dead letter queue for failed messages

### D1 Database
- `DB` - estateflow-db for storage and state tracking

### Service Binding
- `SCRAPER` - Direct binding to scraper-browser worker

### KV Namespace
- `RATE_LIMIT_STATE` - In-memory rate limit tracking

### Environment Variables
- `CONSUMER_VERSION` - Worker version (default: "1.0.0")
- `MAX_CONCURRENT_SCRAPES` - Concurrent requests (default: "1")
- `RATE_LIMIT_DELAY_MS` - Minimum delay between requests (default: "1000")
- `DEBUG` - Enable debug logging (dev only)

## Queue Configuration

Configured in `wrangler.toml`:

```toml
[[queues.consumers]]
queue = "progeodata-scrape-queue"
max_batch_size = 10           # Process up to 10 messages at once
max_batch_timeout = 30        # Wait max 30 seconds for batch
max_retries = 3               # Retry failed messages 3 times
dead_letter_queue = "progeodata-scrape-dlq"
```

## Message Processing Flow

1. **Receive Batch**: Get up to 10 messages from queue
2. **Update State**: Mark as 'processing' in D1
3. **Rate Limit Check**: Verify rate limit allows request
4. **Wait if Needed**: Sleep if rate limit exceeded
5. **Scrape**: Call scraper-browser via service binding
6. **Store Results**: Insert professionals into D1
7. **Update State**: Mark as 'completed' or 'failed'
8. **Log Message**: Record in queue_messages table
9. **Ack/Retry**: Acknowledge success or trigger retry

## Rate Limiting

### Per-State Rate Limits

Each state has independent rate limits configured in D1:

```sql
INSERT INTO rate_limits (
  source_type,
  source_key,
  requests_per_second
) VALUES (
  'FL_DBPR',
  'default',
  1.0  -- 1 request per second
);
```

### Rate Limit Enforcement

1. Check last request timestamp in KV
2. Check D1 for throttle status
3. Calculate wait time based on requests_per_second
4. Sleep if needed
5. Update timestamp in KV after request

### Throttle Recovery

If a source is throttled (e.g., by the target site):

```sql
UPDATE rate_limits
SET
  is_throttled = TRUE,
  throttled_until = '2025-12-03T14:00:00Z',
  throttle_reason = 'Rate limit hit'
WHERE source_type = 'FL_DBPR';
```

The consumer will skip requests until `throttled_until` passes.

## Service Binding

Instead of HTTP requests, we use Cloudflare Service Bindings for direct worker-to-worker communication:

```typescript
const request = new Request('https://scraper-browser/scrape', {
  method: 'POST',
  body: JSON.stringify({
    state: 'FL',
    profession: 'real_estate',
    zip: '33139'
  })
});

const response = await env.SCRAPER.fetch(request);
```

**Benefits:**
- No HTTP overhead
- No network latency
- No DNS resolution
- Stays within Cloudflare network
- Lower cost

## Endpoints

### Health Check
```bash
GET /health
```

Returns worker health status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-03T12:00:00Z"
}
```

### Queue Statistics
```bash
GET /stats
```

View recent queue activity and rate limits.

**Response:**
```json
{
  "queue_activity": [
    {
      "message_id": "abc-123",
      "state": "FL",
      "zip_code": "33139",
      "status": "completed",
      "result_count": 45,
      "processing_duration_ms": 8500
    }
  ],
  "rate_limits": [
    {
      "source_type": "FL_DBPR",
      "requests_per_second": 1.0,
      "current_second_count": 1,
      "is_throttled": false
    }
  ],
  "timestamp": "2025-12-03T12:00:00Z"
}
```

## Data Storage

### raw_business_data Table

Scraped professionals are stored in the raw_business_data table:

```sql
INSERT INTO raw_business_data (
  source,          -- 'FL_DBPR'
  source_id,       -- License number (unique ID)
  name,            -- Professional name
  city,            -- City
  state,           -- State
  postal_code,     -- ZIP code
  phone,           -- Phone (if available)
  email,           -- Email (if available)
  category,        -- 'real_estate'
  raw_data,        -- Full JSON of professional data
  status,          -- 'new'
  scraped_at       -- Timestamp
) VALUES (...);
```

### Upsert Logic

If a professional already exists (matched by source + source_id), we update their data:

```sql
ON CONFLICT(source, source_id) DO UPDATE SET
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  last_updated = excluded.scraped_at
```

## Retry Logic

### Exponential Backoff

Failed scrapes are retried with increasing delays:

- **Attempt 1**: Immediate retry
- **Attempt 2**: 1 hour delay
- **Attempt 3**: 2 hour delay
- **After 3**: Send to DLQ

Formula: `delay = 3600 * 2^(attempts - 1)` (max 32 hours)

### Retry Triggers

Messages are retried when:
- Scraper-browser returns error
- Service binding fails
- D1 storage fails
- Rate limit timeout exceeded

### Dead Letter Queue

After 3 failed attempts, messages go to the DLQ for manual investigation:

```bash
# View DLQ messages
wrangler queues consumer list progeodata-scrape-dlq
```

## Error Handling

### Error Categories

1. **Rate Limit**: Wait and retry
2. **Scraper Error**: Retry with backoff
3. **Storage Error**: Retry immediately
4. **Invalid Message**: Log and skip (ack)

### Error Logging

All errors are logged to the `queue_messages` table:

```sql
INSERT INTO queue_messages (
  message_id,
  status,
  error_message,
  retry_count
) VALUES (...);
```

## Monitoring

### Key Metrics

Monitor these in production:

- **Processing Rate**: Messages processed per minute
- **Success Rate**: % of messages completed vs failed
- **Average Duration**: Time per scrape (should be ~5-10 seconds)
- **Retry Rate**: % of messages requiring retry
- **DLQ Size**: Number of messages in dead letter queue

### Cloudflare Dashboard

View queue metrics:
- Workers & Pages → Queues → progeodata-scrape-queue
- Consumers tab → progeodata-queue-consumer

### View Logs
```bash
wrangler tail progeodata-queue-consumer --format pretty
```

### Query Stats
```bash
curl https://progeodata-queue-consumer.your-subdomain.workers.dev/stats
```

## Development

### Local Development
```bash
npm install
npm run dev
```

Note: Service bindings don't work in local dev. Use `wrangler dev --remote` for full testing.

### Remote Development
```bash
wrangler dev --remote
```

### Deploy
```bash
npm run deploy
```

### Manual Testing

You can't easily trigger queue messages manually, but you can test the scraper binding:

```bash
# Test via seed worker
curl -X POST https://progeodata-queue-seed.your-subdomain.workers.dev/seed \
  -H "Content-Type: application/json" \
  -d '{"mode":"test","states":["FL"]}'

# Watch consumer process
wrangler tail progeodata-queue-consumer
```

## Performance Optimization

### Batch Processing

Processing messages in batches (max 10) reduces overhead:

- Fewer worker invocations
- Shared D1 connections
- Better rate limit utilization

### Service Binding vs HTTP

Using service bindings saves ~50-100ms per request vs HTTP.

### Rate Limit Optimization

To increase throughput:

1. Update rate limit in D1:
```sql
UPDATE rate_limits
SET requests_per_second = 2.0
WHERE source_type = 'FL_DBPR';
```

2. Update consumer configuration
3. Redeploy

## Troubleshooting

### Messages stuck in queue

Check queue depth:
```bash
wrangler queues list
```

If depth is growing, check:
- Consumer logs for errors
- Rate limits (might be throttled)
- D1 write capacity

### High retry rate

Check scraper-browser logs:
```bash
wrangler tail scraper-browser
```

Common causes:
- Target site blocking requests
- Invalid ZIP codes
- Scraper logic bugs

### DLQ filling up

Investigate messages manually:
```bash
wrangler queues consumer list progeodata-scrape-dlq --json
```

Fix underlying issue, then replay from DLQ if needed.

### Rate limit too aggressive

Messages timing out waiting for rate limit. Increase `requests_per_second` in D1.

### Storage failures

Check D1 capacity limits:
```bash
wrangler d1 info estateflow-db
```

Free tier: 100k writes/day. If exceeded, upgrade or reduce scraping rate.

## Related Workers

- **progeodata-queue-seed**: Seeds the queue with ZIP codes
- **scraper-browser**: Browser automation for license database scraping

## Database Schema

Uses these D1 tables:

- `scrape_queue_state` - Processing status per ZIP
- `rate_limits` - Rate limit configuration and tracking
- `queue_messages` - Processing log for all messages
- `raw_business_data` - Scraped professional data

See `migrations/010_queue_tables.sql` for full schema.

## License

MIT
