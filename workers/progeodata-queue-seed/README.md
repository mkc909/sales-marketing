# ProGeoData Queue Seed Worker

Seeds the ProGeoData scrape queue with ZIP codes from FL, TX, and CA for 24/7 automated database population.

## Overview

This worker is responsible for populating the Cloudflare Queue with scraping tasks. It runs on a daily cron schedule and can also be triggered manually via HTTP endpoint.

### Key Features

- **Automated Seeding**: Runs daily at 6 AM UTC via cron trigger
- **Smart Deduplication**: Checks D1 before queuing to avoid duplicates
- **Progressive Seeding**: Test mode (15 ZIPs) vs Production mode (300+ ZIPs)
- **State Support**: Florida (FL), Texas (TX), California (CA)
- **Priority Management**: Assigns priority scores to ZIP codes
- **Retry Logic**: Re-queues failed ZIPs after 24 hours

## Architecture

```
┌─────────────────────┐
│  Cron Trigger       │
│  (Daily 6 AM UTC)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────┐
│  Queue Seed Worker  │────▶│  D1 Database     │
│  (This Worker)      │     │  (State Check)   │
└──────────┬──────────┘     └──────────────────┘
           │
           │ Sends Messages
           ▼
┌─────────────────────┐
│  Cloudflare Queue   │
│  progeodata-scrape  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Queue Consumer     │
│  (Processes Items)  │
└─────────────────────┘
```

## Environment Bindings

### Queue Producer
- `SCRAPE_QUEUE` - Cloudflare Queue binding for sending messages

### D1 Database
- `DB` - estateflow-db database for state tracking

### KV Namespace
- `SEED_STATE` - Stores last run metadata

### Environment Variables
- `SEED_VERSION` - Worker version (default: "1.0.0")
- `DEFAULT_PRIORITY` - Default priority for ZIPs (default: "5")
- `DEBUG` - Enable debug logging (dev only)

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

### Manual Seed Trigger
```bash
POST /seed
Content-Type: application/json

{
  "mode": "test",
  "states": ["FL", "TX", "CA"]
}
```

Manually trigger queue seeding.

**Parameters:**
- `mode` - "test" (15 ZIPs) or "production" (300+ ZIPs)
- `states` - Array of state codes (optional, defaults to all)

**Response:**
```json
{
  "success": true,
  "mode": "test",
  "states": "all",
  "result": {
    "queued": 12,
    "skipped": 3,
    "errors": 0
  },
  "timestamp": "2025-12-03T12:00:00Z"
}
```

### Queue Status
```bash
GET /status
```

View current queue state statistics.

**Response:**
```json
{
  "stats": [
    {
      "state": "FL",
      "source_type": "FL_DBPR",
      "status": "queued",
      "count": 5
    }
  ],
  "health": [...],
  "timestamp": "2025-12-03T12:00:00Z"
}
```

## ZIP Code Datasets

### Test Mode (15 ZIPs)
Perfect for initial testing and verification:

- **FL**: 5 ZIPs (Miami area)
- **TX**: 5 ZIPs (Dallas area)
- **CA**: 5 ZIPs (LA area)

### Production Mode (300+ ZIPs)
Full dataset for continuous population:

- **FL**: 100 ZIPs (Miami-Dade, Broward)
- **TX**: 100 ZIPs (Dallas, Houston)
- **CA**: 100 ZIPs (Los Angeles, Orange County)

## Deduplication Logic

The worker checks D1 before queuing each ZIP:

1. **Not in DB**: Queue immediately
2. **Status = 'failed'**: Re-queue if >24 hours since last attempt
3. **Status = 'completed'**: Re-queue if >7 days since last scrape
4. **Status = 'queued' or 'processing'**: Skip (already being processed)

## Cron Schedule

Configured in `wrangler.toml`:

```toml
[triggers]
crons = ["0 6 * * *"]
```

Runs daily at 6 AM UTC (1 AM EST / 10 PM PST).

## Development

### Local Development
```bash
npm install
npm run dev
```

### Deploy
```bash
npm run deploy
```

### Manual Testing
```bash
# Test mode seed
curl -X POST https://progeodata-queue-seed.your-subdomain.workers.dev/seed \
  -H "Content-Type: application/json" \
  -d '{"mode":"test","states":["FL"]}'

# Production mode seed
curl -X POST https://progeodata-queue-seed.your-subdomain.workers.dev/seed \
  -H "Content-Type: application/json" \
  -d '{"mode":"production"}'

# Check status
curl https://progeodata-queue-seed.your-subdomain.workers.dev/status
```

### View Logs
```bash
wrangler tail progeodata-queue-seed
```

## Database Schema

The worker uses the following D1 tables:

### scrape_queue_state
Tracks processing status for each ZIP code:

```sql
CREATE TABLE scrape_queue_state (
  zip_code TEXT,
  state TEXT,
  source_type TEXT,
  status TEXT, -- 'pending', 'queued', 'processing', 'completed', 'failed'
  priority INTEGER,
  queued_at TIMESTAMP,
  last_attempted_at TIMESTAMP,
  ...
)
```

## Message Format

Messages sent to the queue:

```typescript
interface ScrapeMessage {
  zip_code: string;        // "33139"
  state: string;           // "FL"
  source_type: string;     // "FL_DBPR"
  profession: string;      // "real_estate"
  priority: number;        // 1-10
  scheduled_at: string;    // ISO 8601 timestamp
}
```

## Error Handling

- Invalid database: Logs error, continues with next ZIP
- Queue send failure: Logs error, increments error count
- KV write failure: Logged but non-blocking

## Monitoring

### Key Metrics
- **Queued**: Number of messages successfully sent
- **Skipped**: Number of ZIPs already queued/processed
- **Errors**: Number of failures during seeding

### Alerts
Monitor for:
- High error rate (>10%)
- No items queued (indicates deduplication issue)
- Cron trigger failures

## Configuration Updates

To update ZIP codes or add new states:

1. Edit `TEST_ZIP_CODES` or `PRODUCTION_ZIP_CODES` in `src/index.ts`
2. Add state to `STATE_SOURCE_MAP` if new state
3. Deploy updated worker
4. Trigger manual seed to test

## Related Workers

- **progeodata-queue-consumer**: Processes queue messages and scrapes data
- **scraper-browser**: Browser automation for license database scraping

## Troubleshooting

### No items being queued
Check D1 status - items might already be queued/completed. Clear state if needed:

```sql
DELETE FROM scrape_queue_state WHERE status IN ('queued', 'completed');
```

### Cron not triggering
Verify cron configuration in Cloudflare Dashboard:
Workers & Pages → progeodata-queue-seed → Triggers → Cron Triggers

### High skip rate
This is normal - indicates ZIPs are already being processed or recently completed.

## License

MIT
