# ProGeoData Queue Consumer - Quick Start

One-page reference for deploying and operating the queue consumer worker.

## Deploy in 5 Steps

```bash
# 1. Create queue
wrangler queues create progeodata-scrape-queue
wrangler queues create progeodata-scrape-dlq

# 2. Create KV namespace
wrangler kv:namespace create RATE_LIMIT_STATE
# Copy the 'id' and update wrangler.toml

# 3. Apply DLQ migration
wrangler d1 execute estateflow-db --file=migrations/001_dead_letter_queue.sql

# 4. Install and build
npm install && npm run build

# 5. Deploy
wrangler deploy
```

## Verify Deployment

```bash
# Health check
curl https://progeodata-queue-consumer.<subdomain>.workers.dev/health

# Stats
curl https://progeodata-queue-consumer.<subdomain>.workers.dev/stats | jq

# Automated tests
WORKER_URL=https://your-worker.workers.dev node test/verify-deployment.js
```

## Monitor

```bash
# Live logs
wrangler tail progeodata-queue-consumer --format pretty

# Queue status
wrangler queues consumer list progeodata-scrape-queue

# Check D1 data
wrangler d1 execute estateflow-db \
  --command="SELECT COUNT(*) FROM raw_business_data WHERE source='FL_DBPR'"
```

## Common Operations

### Check Queue Health
```sql
wrangler d1 execute estateflow-db \
  --command="SELECT * FROM queue_health"
```

### View Recent Activity
```sql
wrangler d1 execute estateflow-db \
  --command="SELECT * FROM recent_queue_activity LIMIT 10"
```

### Check Rate Limits
```sql
wrangler d1 execute estateflow-db \
  --command="SELECT * FROM rate_limit_status"
```

### View Failed Messages (DLQ)
```sql
wrangler d1 execute estateflow-db \
  --command="SELECT * FROM dlq_unresolved LIMIT 10"
```

### Adjust Rate Limit
```sql
wrangler d1 execute estateflow-db \
  --command="UPDATE rate_limits SET requests_per_second = 2.0 WHERE source_type = 'FL_DBPR'"
```

### Clear Throttle
```sql
wrangler d1 execute estateflow-db \
  --command="UPDATE rate_limits SET is_throttled = FALSE, throttled_until = NULL WHERE source_type = 'FL_DBPR'"
```

## Troubleshooting

### Messages not processing
```bash
# Check consumer registration
wrangler queues consumer list progeodata-scrape-queue

# Check worker logs
wrangler tail progeodata-queue-consumer

# Verify scraper-browser is deployed
wrangler deployments list | grep scraper-browser
```

### High retry rate
```bash
# Check scraper logs
wrangler tail scraper-browser

# Check recent errors
wrangler d1 execute estateflow-db \
  --command="SELECT * FROM queue_messages WHERE status='failed' ORDER BY received_at DESC LIMIT 10"
```

### DLQ filling up
```bash
# List DLQ messages
wrangler d1 execute estateflow-db \
  --command="SELECT * FROM dead_letter_queue WHERE resolved=FALSE"

# Resolve a DLQ message
wrangler d1 execute estateflow-db \
  --command="UPDATE dead_letter_queue SET resolved=TRUE, resolved_at=CURRENT_TIMESTAMP, resolution_notes='Fixed manually' WHERE id=123"
```

## Configuration Files

### Update Database ID
Edit `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_id = "your-actual-database-id"  # ← Change this
```

### Update KV Namespace
Edit `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_STATE"
id = "your-actual-kv-id"  # ← Change this
```

### Update Service Binding
Edit `wrangler.toml`:
```toml
[[services]]
binding = "SCRAPER"
service = "scraper-browser"  # ← Must match deployed worker name
```

## Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/stats` | GET | Queue statistics |

## Database Tables

| Table | Purpose |
|-------|---------|
| `raw_business_data` | Scraped professional data |
| `scrape_queue_state` | ZIP processing status |
| `rate_limits` | Rate limit config & tracking |
| `queue_messages` | Processing audit log |
| `dead_letter_queue` | Failed message tracking |

## Views

| View | Purpose |
|------|---------|
| `queue_health` | Queue status by state/source |
| `recent_queue_activity` | Last 100 messages |
| `rate_limit_status` | Current rate limit usage |
| `dlq_unresolved` | Unresolved DLQ messages |

## Message Structure

```json
{
  "zip_code": "33139",
  "state": "FL",
  "source_type": "FL_DBPR",
  "profession": "real_estate",
  "priority": 5,
  "scheduled_at": "2025-12-03T12:00:00Z"
}
```

## Rate Limits by Source

| Source | Default Rate | Adjustable |
|--------|--------------|------------|
| FL_DBPR | 1 req/sec | Yes (D1) |
| TX_TREC | 1 req/sec | Yes (D1) |
| CA_DRE | 0.5 req/sec | Yes (D1) |
| WA_DOL | 1 req/sec | Yes (D1) |

## Resource Limits

| Resource | Free Tier | Paid |
|----------|-----------|------|
| Queue messages | 1M/month | Unlimited |
| D1 writes | 100k/day | 50M/month |
| KV reads | 10M/month | Unlimited |
| Worker invocations | 100k/day | Unlimited |

## Performance Metrics

| Metric | Typical Value |
|--------|---------------|
| Messages/batch | 1-10 |
| Processing time | 6-16 sec/message |
| Service binding latency | <10ms |
| D1 write latency | 50-100ms |
| Scrape duration | 5-15 sec |

## Cost Estimate

For 1 million messages processed:
- Queue operations: $0.40
- D1 writes (1M): Included in free tier or $0.50
- KV operations: Included in free tier
- Worker invocations: Included in paid plan

**Total**: ~$0.40-$1.00 per million messages

## Support

- **Full docs**: See `README.md`
- **Deployment guide**: See `DEPLOYMENT.md`
- **Implementation summary**: See `IMPLEMENTATION_SUMMARY.md`
- **Cloudflare Queues**: https://developers.cloudflare.com/queues/

## Status

✅ **Production Ready** - All features implemented and tested
