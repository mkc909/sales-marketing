# ProGeoData Cron System Deployment Guide

Complete guide to deploying the 24/7 automated database population system for ProGeoData.

## System Overview

The ProGeoData Cron System continuously populates the database with professional data from state licensing databases. It consists of three main components:

1. **Queue Seed Worker** - Seeds the queue with ZIP codes daily
2. **Queue Consumer Worker** - Processes queue messages and orchestrates scraping
3. **Scraper Browser Worker** - Performs actual web scraping (already deployed)

## Architecture

```
┌──────────────────┐
│  Cron Trigger    │  Daily at 6 AM UTC
│  (Cloudflare)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────┐
│  Seed Worker     │────▶│  Queue          │
│  (Producer)      │     │  (300+ msgs)    │
└──────────────────┘     └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  Consumer       │
                         │  (Orchestrator) │
                         └────────┬────────┘
                                  │
                                  │ Service Binding
                                  ▼
                         ┌─────────────────┐
                         │  Scraper        │
                         │  (Browser)      │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  D1 Database    │
                         │  (Storage)      │
                         └─────────────────┘
```

## Prerequisites

### Software Requirements

- Node.js 18+ or 20+
- npm 8+
- Wrangler CLI 3.0+
- Git
- PowerShell 5.1+ (Windows) or bash (Mac/Linux)

### Cloudflare Account

- Paid Workers plan (for queues and service bindings)
- Access to account ID: `af57e902fd9dcaad7484a7195ac0f536`

### Verify Prerequisites

```bash
# Check Node.js
node --version  # Should be v18.x.x or v20.x.x

# Check npm
npm --version   # Should be 8.x.x or higher

# Check Wrangler
wrangler --version  # Should be 3.x.x

# Authenticate Wrangler
wrangler login
wrangler whoami  # Verify authentication
```

## Component Locations

```
sales-marketing/
├── worktrees/siteforge/
│   └── migrations/
│       └── 010_queue_tables.sql          # D1 migration
├── workers/
│   ├── progeodata-queue-seed/            # Seed worker
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── wrangler.toml
│   ├── progeodata-queue-consumer/        # Consumer worker
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── wrangler.toml
│   └── scraper-browser/                  # Already deployed
└── scripts/
    └── deploy-progeodata-cron.ps1        # Automated deployment
```

## Deployment Options

### Option 1: Automated Deployment (Recommended)

Use the PowerShell script for full automation:

```powershell
# Windows - PowerShell
cd c:\dev\GITHUB_MKC909_REPOS\sales-marketing
.\scripts\deploy-progeodata-cron.ps1

# Options:
# -TestMode           Use test dataset (15 ZIPs)
# -SkipMigration     Skip D1 migration
# -SkipDependencies  Skip npm install
# -DryRun            Preview without making changes
# -DatabaseId "..."   Use specific database ID

# Examples:

# Dry run to preview
.\scripts\deploy-progeodata-cron.ps1 -DryRun

# Deploy with test data
.\scripts\deploy-progeodata-cron.ps1 -TestMode

# Full production deployment
.\scripts\deploy-progeodata-cron.ps1
```

### Option 2: Manual Deployment

Follow these steps if you prefer manual control:

#### Step 1: Apply D1 Migration

```bash
cd worktrees/siteforge

# Apply migration
wrangler d1 execute estateflow-db --file=migrations/010_queue_tables.sql

# Verify tables created
wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'scrape_%' OR name LIKE 'rate_%' OR name LIKE 'queue_%'"
```

Expected output: `scrape_queue_state`, `rate_limits`, `queue_messages`, `scrape_schedule`

#### Step 2: Create Cloudflare Queues

```bash
# Create main queue
wrangler queues create progeodata-scrape-queue

# Create dead letter queue
wrangler queues create progeodata-scrape-dlq

# Verify creation
wrangler queues list
```

#### Step 3: Create KV Namespaces

```bash
# Seed worker state
wrangler kv:namespace create progeodata-seed-state

# Rate limit state
wrangler kv:namespace create progeodata-rate-limit-state

# Verify creation
wrangler kv:namespace list
```

**Note the IDs** - you'll need them for wrangler.toml configuration.

#### Step 4: Update wrangler.toml Files

##### Seed Worker (workers/progeodata-queue-seed/wrangler.toml)

```toml
# Update these IDs:
[[d1_databases]]
binding = "DB"
database_id = "YOUR_DATABASE_ID_HERE"

[[kv_namespaces]]
binding = "SEED_STATE"
id = "YOUR_KV_NAMESPACE_ID_HERE"
```

##### Consumer Worker (workers/progeodata-queue-consumer/wrangler.toml)

```toml
# Update these IDs:
[[d1_databases]]
binding = "DB"
database_id = "YOUR_DATABASE_ID_HERE"

[[kv_namespaces]]
binding = "RATE_LIMIT_STATE"
id = "YOUR_KV_NAMESPACE_ID_HERE"
```

#### Step 5: Install Dependencies

```bash
# Seed worker
cd workers/progeodata-queue-seed
npm install

# Consumer worker
cd ../progeodata-queue-consumer
npm install
```

#### Step 6: Deploy Workers

```bash
# Deploy seed worker
cd workers/progeodata-queue-seed
wrangler deploy

# Deploy consumer worker
cd ../progeodata-queue-consumer
wrangler deploy
```

#### Step 7: Trigger Initial Seed

```bash
# Test mode (15 ZIPs)
curl -X POST https://progeodata-queue-seed.YOUR-SUBDOMAIN.workers.dev/seed \
  -H "Content-Type: application/json" \
  -d '{"mode":"test","states":["FL"]}'

# Production mode (300+ ZIPs)
curl -X POST https://progeodata-queue-seed.YOUR-SUBDOMAIN.workers.dev/seed \
  -H "Content-Type: application/json" \
  -d '{"mode":"production","states":["FL","TX","CA"]}'
```

## Verification

### 1. Check Workers Deployed

```bash
# List deployments
wrangler deployments list --name=progeodata-queue-seed
wrangler deployments list --name=progeodata-queue-consumer

# Health checks
curl https://progeodata-queue-seed.YOUR-SUBDOMAIN.workers.dev/health
curl https://progeodata-queue-consumer.YOUR-SUBDOMAIN.workers.dev/health
```

### 2. Verify Queue Created

```bash
wrangler queues list
```

Should show:
- `progeodata-scrape-queue`
- `progeodata-scrape-dlq`

### 3. Check Database Tables

```bash
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM scrape_queue_state"
wrangler d1 execute estateflow-db --command="SELECT * FROM queue_health"
```

### 4. Monitor Queue Processing

```bash
# Watch seed worker
wrangler tail progeodata-queue-seed --format pretty

# Watch consumer worker
wrangler tail progeodata-queue-consumer --format pretty

# Watch scraper browser
wrangler tail scraper-browser --format pretty
```

### 5. Check Queue Status

```bash
curl https://progeodata-queue-seed.YOUR-SUBDOMAIN.workers.dev/status
```

Expected response:
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

### 6. Verify Data Ingestion

Wait a few minutes for processing, then check:

```bash
# Count total professionals scraped
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM raw_business_data"

# View recent scrapes
wrangler d1 execute estateflow-db --command="SELECT * FROM recent_queue_activity LIMIT 10"

# Check by state
wrangler d1 execute estateflow-db --command="SELECT state, COUNT(*) as count FROM raw_business_data GROUP BY state"
```

## Configuration

### Cron Schedule

Default: Daily at 6 AM UTC

To change, edit `workers/progeodata-queue-seed/wrangler.toml`:

```toml
[triggers]
crons = ["0 6 * * *"]  # Standard cron format

# Examples:
# Every hour:         "0 * * * *"
# Every 6 hours:      "0 */6 * * *"
# Twice daily:        "0 6,18 * * *"
# Every weekday:      "0 6 * * 1-5"
```

After changing, redeploy:
```bash
cd workers/progeodata-queue-seed
wrangler deploy
```

### Rate Limits

Default: 1 request per second per state

To change, update D1:

```sql
-- Increase to 2 requests per second
UPDATE rate_limits
SET requests_per_second = 2.0
WHERE source_type = 'FL_DBPR';

-- Check current rates
SELECT * FROM rate_limit_status;
```

### ZIP Code Datasets

To add more ZIPs, edit `workers/progeodata-queue-seed/src/index.ts`:

```typescript
// Add to PRODUCTION_ZIP_CODES
const PRODUCTION_ZIP_CODES = {
  FL: [
    '33101', '33109', // existing
    '33199', '33200', // add new ZIPs here
  ],
  // ...
};
```

Then redeploy the seed worker.

### Queue Batch Size

Default: 10 messages per batch

To change, edit `workers/progeodata-queue-consumer/wrangler.toml`:

```toml
[[queues.consumers]]
queue = "progeodata-scrape-queue"
max_batch_size = 20  # Increase to 20
```

## Monitoring

### Cloudflare Dashboard

1. Go to Workers & Pages
2. Select worker (seed or consumer)
3. View:
   - Requests per second
   - Success rate
   - CPU time
   - Errors

### Queue Dashboard

1. Workers & Pages → Queues
2. Select `progeodata-scrape-queue`
3. View:
   - Queue depth (messages waiting)
   - Messages processed
   - Consumer status

### Database Stats

```bash
# View queue health
wrangler d1 execute estateflow-db --command="SELECT * FROM queue_health"

# View recent activity
wrangler d1 execute estateflow-db --command="SELECT * FROM recent_queue_activity LIMIT 20"

# View schedule status
wrangler d1 execute estateflow-db --command="SELECT * FROM schedule_status"

# View rate limits
wrangler d1 execute estateflow-db --command="SELECT * FROM rate_limit_status"
```

### Real-time Logs

```bash
# All workers
wrangler tail progeodata-queue-seed --format pretty
wrangler tail progeodata-queue-consumer --format pretty
wrangler tail scraper-browser --format pretty

# Filter for errors only
wrangler tail progeodata-queue-consumer --format pretty | grep -i error

# Follow processing
wrangler tail progeodata-queue-consumer --format pretty | grep -i "processing\|completed\|failed"
```

## Troubleshooting

### Issue: No messages in queue

**Symptoms:**
- Queue depth is 0
- No activity in consumer logs

**Solutions:**
1. Check seed worker logs:
   ```bash
   wrangler tail progeodata-queue-seed
   ```

2. Check if items are being skipped (already processed):
   ```bash
   curl https://progeodata-queue-seed.YOUR-SUBDOMAIN.workers.dev/status
   ```

3. Clear state to re-queue:
   ```sql
   DELETE FROM scrape_queue_state WHERE status = 'completed';
   ```

4. Trigger manual seed:
   ```bash
   curl -X POST https://progeodata-queue-seed.YOUR-SUBDOMAIN.workers.dev/seed \
     -H "Content-Type: application/json" \
     -d '{"mode":"test"}'
   ```

### Issue: Messages stuck in queue

**Symptoms:**
- Queue depth increasing
- Consumer not processing

**Solutions:**
1. Check consumer health:
   ```bash
   curl https://progeodata-queue-consumer.YOUR-SUBDOMAIN.workers.dev/health
   ```

2. Check consumer logs for errors:
   ```bash
   wrangler tail progeodata-queue-consumer --format pretty
   ```

3. Check rate limits (might be throttled):
   ```bash
   wrangler d1 execute estateflow-db --command="SELECT * FROM rate_limit_status WHERE is_throttled = 1"
   ```

4. Restart consumer (redeploy):
   ```bash
   cd workers/progeodata-queue-consumer
   wrangler deploy
   ```

### Issue: High error rate

**Symptoms:**
- Many messages going to DLQ
- Consumer logs show errors

**Solutions:**
1. Check DLQ:
   ```bash
   wrangler queues consumer list progeodata-scrape-dlq
   ```

2. Check scraper-browser logs:
   ```bash
   wrangler tail scraper-browser --format pretty
   ```

3. Check if target sites are blocking:
   ```bash
   # Test scraper directly
   curl -X POST https://scraper-browser.YOUR-SUBDOMAIN.workers.dev \
     -H "Content-Type: application/json" \
     -d '{"state":"FL","profession":"real_estate","zip":"33139"}'
   ```

4. View error details in D1:
   ```sql
   SELECT * FROM queue_messages
   WHERE status = 'failed'
   ORDER BY received_at DESC
   LIMIT 10;
   ```

### Issue: Rate limit too aggressive

**Symptoms:**
- Processing very slow
- Long wait times in logs

**Solutions:**
1. Increase rate limit:
   ```sql
   UPDATE rate_limits
   SET requests_per_second = 2.0
   WHERE source_type = 'FL_DBPR';
   ```

2. Check current utilization:
   ```sql
   SELECT
     source_type,
     requests_per_second,
     current_minute_count,
     current_hour_count
   FROM rate_limits;
   ```

### Issue: Cron not triggering

**Symptoms:**
- No automatic daily seeding
- Must trigger manually

**Solutions:**
1. Check cron configuration:
   ```bash
   cd workers/progeodata-queue-seed
   cat wrangler.toml | grep -A 2 triggers
   ```

2. Check Cloudflare dashboard:
   - Workers & Pages → progeodata-queue-seed
   - Triggers tab → Cron Triggers

3. Verify cron syntax:
   ```toml
   [triggers]
   crons = ["0 6 * * *"]  # Must be valid cron format
   ```

4. Check last seed timestamp:
   ```bash
   # Get from KV
   wrangler kv:key get --namespace-id=YOUR_KV_ID last_cron_run
   ```

## Scaling Considerations

### Current Capacity

With default settings:
- **Rate**: 1 req/sec per state = 3 req/sec total
- **Processing**: ~86,400 ZIPs per day per state
- **Storage**: ~100k writes per day (D1 free tier limit)

### Scaling Up

To process more ZIPs:

1. **Increase rate limits**:
   ```sql
   UPDATE rate_limits
   SET requests_per_second = 5.0;  -- 5x faster
   ```

2. **Increase batch size**:
   ```toml
   max_batch_size = 50  -- Process 50 at once
   ```

3. **Multiple consumers**:
   Deploy multiple consumer workers pointing to same queue

4. **Upgrade D1**:
   Paid plan allows 100M writes/day (1000x more)

### Cost Estimates

**Free Tier (current):**
- Workers: 100k requests/day (free)
- D1: 100k writes/day (free)
- Queues: 1M operations/month (free)
- Browser: $5/month + $0.0001/second

**Scaled Production:**
- Workers Paid: $5/month + usage
- D1 Paid: $5/month + storage
- Browser: $5/month + ~$10-50/month usage

## Maintenance

### Daily Tasks

No daily maintenance required - system runs automatically.

### Weekly Tasks

1. Check queue health:
   ```bash
   curl https://progeodata-queue-seed.YOUR-SUBDOMAIN.workers.dev/status
   ```

2. Review error logs:
   ```bash
   wrangler tail progeodata-queue-consumer | grep -i error
   ```

3. Check DLQ size:
   ```bash
   wrangler queues list
   ```

### Monthly Tasks

1. Review scraping statistics:
   ```sql
   SELECT
     state,
     COUNT(*) as total_professionals,
     COUNT(DISTINCT city) as cities_covered
   FROM raw_business_data
   GROUP BY state;
   ```

2. Clean up old queue messages:
   ```sql
   DELETE FROM queue_messages
   WHERE received_at < datetime('now', '-30 days');
   ```

3. Update ZIP code lists if needed

## Rollback Procedure

If deployment fails or issues arise:

### Rollback Workers

```bash
# List recent deployments
wrangler deployments list --name=progeodata-queue-seed

# Rollback to previous version
wrangler rollback --name=progeodata-queue-seed --deployment-id=PREVIOUS_ID

# Same for consumer
wrangler rollback --name=progeodata-queue-consumer --deployment-id=PREVIOUS_ID
```

### Rollback Database Migration

```sql
-- Disable schedules
UPDATE scrape_schedule SET enabled = FALSE;

-- Clear queue state
DELETE FROM scrape_queue_state;

-- Drop new tables (if needed)
DROP TABLE IF EXISTS scrape_schedule;
DROP TABLE IF EXISTS queue_messages;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS scrape_queue_state;
```

### Pause System

```bash
# Stop sending new messages
wrangler d1 execute estateflow-db --command="UPDATE scrape_schedule SET enabled = FALSE"

# Or delete cron trigger temporarily
cd workers/progeodata-queue-seed
# Comment out cron in wrangler.toml
wrangler deploy
```

## Next Steps

After successful deployment:

1. **Monitor for 24 hours** - Watch logs and queue processing
2. **Scale to production** - Switch from test to production mode
3. **Add more states** - Expand beyond FL, TX, CA
4. **Optimize rate limits** - Tune based on observed performance
5. **Setup alerts** - Configure Cloudflare alerts for errors

## Support

- **Documentation**: See worker README files
- **Logs**: `wrangler tail <worker-name>`
- **Stats**: Worker `/stats` and `/health` endpoints
- **Database**: Query D1 views for monitoring

## Summary

You now have a fully automated 24/7 database population system:

- ✅ Daily cron seeding at 6 AM UTC
- ✅ Rate-limited scraping (1 req/sec per state)
- ✅ Automatic retries with exponential backoff
- ✅ Dead letter queue for failed messages
- ✅ Comprehensive logging and monitoring
- ✅ Service bindings for optimal performance

The system will continuously populate your database with professional data from state licensing databases across FL, TX, and CA.
