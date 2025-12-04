# ProGeoData Cron Worker - Quick Start Guide

## 🚀 5-Minute Deployment

Deploy the complete ProGeoData Cron Worker system for 24/7 database population.

### Prerequisites

```bash
# Check requirements
node --version          # Need v18+
npm --version          # Need v8+
wrangler --version     # Need v3+

# Install Wrangler if missing
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login
```

### Step 1: Deploy Everything (2 minutes)

```powershell
# Windows PowerShell
cd c:\dev\GITHUB_MKC909_REPOS\sales-marketing
.\scripts\progeodata\deploy-all.ps1
```

This script will:
- Create D1 database
- Apply migrations
- Create Cloudflare Queues
- Deploy all workers
- Configure bindings

### Step 2: Run Stage 1 Test (1 minute)

```powershell
# Test with 10 ZIP codes
.\scripts\progeodata\test-progressive.ps1 -Stage stage1
```

Expected output:
- 10 ZIP codes queued
- Processing complete in ~30 seconds
- Records saved to D1

### Step 3: Monitor System (1 minute)

Open monitoring dashboard:
```
https://progeodata-coordinator.[your-subdomain].workers.dev/dashboard
```

Check worker logs:
```bash
wrangler tail progeodata-consumer
```

Check database:
```bash
wrangler d1 execute progeodata --command="SELECT COUNT(*) FROM pros"
```

## 📊 System Status URLs

After deployment, access these endpoints:

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Dashboard | `https://progeodata-coordinator.[subdomain].workers.dev/dashboard` | Visual monitoring |
| Status API | `https://progeodata-coordinator.[subdomain].workers.dev/status` | JSON status |
| Seed Status | `https://progeodata-seed.[subdomain].workers.dev/status` | Queue seeding status |
| Consumer Health | `https://progeodata-consumer.[subdomain].workers.dev/health` | Worker health |

## 🧪 Progressive Testing Stages

Run tests in order to ensure system stability:

### Stage 1: Minimal Test
```powershell
.\scripts\progeodata\test-progressive.ps1 -Stage stage1
# 10 ZIPs, 1 worker, ~30 seconds
```

### Stage 2: Small Scale
```powershell
.\scripts\progeodata\test-progressive.ps1 -Stage stage2
# 100 ZIPs, 2 workers, ~2 minutes
```

### Stage 3: Medium Scale
```powershell
.\scripts\progeodata\test-progressive.ps1 -Stage stage3
# 1,000 ZIPs, 5 workers, ~10 minutes
```

### Stage 4: Large Scale
```powershell
.\scripts\progeodata\test-progressive.ps1 -Stage stage4
# 10,000 ZIPs, 10 workers, ~30 minutes
```

### Stage 5: Production
```powershell
.\scripts\progeodata\test-progressive.ps1 -Stage stage5
# All ZIPs, 10+ workers, 24/7 operation
```

## 🔧 Manual Operations

### Trigger Manual Seed

```bash
# Seed specific state
curl -X POST https://progeodata-seed.[subdomain].workers.dev/trigger/FL

# Seed all configured states
curl -X POST https://progeodata-seed.[subdomain].workers.dev/seed
```

### Scale Workers

Deploy additional consumer instances:

```bash
cd workers/progeodata-consumer

# Deploy worker 2
wrangler deploy --env worker02

# Deploy worker 3
wrangler deploy --env worker03

# Continue up to worker10
```

### Database Operations

```bash
# Check queue state
wrangler d1 execute progeodata --command="SELECT * FROM queue_state"

# Check worker health
wrangler d1 execute progeodata --command="SELECT * FROM worker_health"

# Check processing stats
wrangler d1 execute progeodata --command="SELECT COUNT(*) as count, SUM(records_saved) as total FROM processing_log WHERE datetime(created_at) > datetime('now', '-1 hour')"

# Check errors
wrangler d1 execute progeodata --command="SELECT * FROM error_log ORDER BY created_at DESC LIMIT 10"
```

## 📈 Performance Metrics

Expected performance with 10 workers:

| Metric | Target | Actual |
|--------|--------|---------|
| Processing Rate | 10+ records/sec | TBD |
| Queue Throughput | 864,000 records/day | TBD |
| Error Rate | < 1% | TBD |
| Worker Uptime | > 99% | TBD |
| Response Time | < 5 sec/ZIP | TBD |

## 🚨 Troubleshooting

### Workers Not Processing

```bash
# Check worker health
wrangler d1 execute progeodata --command="SELECT * FROM worker_health"

# Check for errors
wrangler tail progeodata-consumer

# Restart worker
wrangler deploy --env production
```

### Queue Stuck

```bash
# Check queue state
wrangler d1 execute progeodata --command="SELECT * FROM queue_state"

# Manually trigger coordinator
curl https://progeodata-coordinator.[subdomain].workers.dev/trigger

# Force seed
curl -X POST https://progeodata-seed.[subdomain].workers.dev/seed
```

### Database Issues

```bash
# Check D1 status
wrangler d1 list

# Re-apply migrations
wrangler d1 execute progeodata --file=migrations/progeodata/001_queue_management.sql

# Check write limits
wrangler d1 execute progeodata --command="SELECT COUNT(*) FROM pros"
```

### Rate Limiting Errors

```bash
# Check rate limits
wrangler d1 execute progeodata --command="SELECT * FROM rate_limits"

# Adjust rate limit
wrangler d1 execute progeodata --command="UPDATE rate_limits SET requests_per_second = 0.5 WHERE source = 'FL_DBPR'"
```

## 📝 Configuration

### Environment Variables

Edit `wrangler.toml` files to adjust:

```toml
[vars]
# Seed Worker
BATCH_SIZE = "100"        # ZIPs per queue batch
STATES = "FL,TX,CA"      # States to process
ZIP_LIMIT = "0"          # 0 = unlimited

# Consumer Worker
RATE_LIMIT_PER_SECOND = "1"  # Requests per second
MAX_RETRIES = "3"            # Retry attempts
WORKER_ID = "consumer-01"    # Worker identifier

# Coordinator
MIN_QUEUE_DEPTH = "100"      # Minimum queue items
SEED_THRESHOLD = "50"        # Trigger seed below this
ALERT_THRESHOLD_ERROR_RATE = "0.1"  # 10% error threshold
```

### Cron Schedule

Edit coordinator's `wrangler.toml`:

```toml
[triggers]
crons = ["* * * * *"]  # Every minute (default)
# crons = ["*/5 * * * *"]  # Every 5 minutes
# crons = ["0 * * * *"]    # Every hour
```

## 🎯 Next Steps

1. **Complete Testing**: Run through all progressive test stages
2. **Monitor Performance**: Watch dashboard for 24 hours
3. **Optimize Workers**: Adjust worker count based on load
4. **Enable Alerts**: Set up email/webhook notifications
5. **Schedule Maintenance**: Plan for database cleanup

## 📞 Support

- **Dashboard**: Monitor real-time status
- **Logs**: `wrangler tail [worker-name]`
- **Database**: Check D1 tables for detailed info
- **Documentation**: See `PROGEODATA_CRON_WORKER_IMPLEMENTATION_PLAN.md`

## ✅ Success Checklist

- [ ] All workers deployed successfully
- [ ] Stage 1 test passed (10 ZIPs)
- [ ] Stage 2 test passed (100 ZIPs)
- [ ] Dashboard accessible and showing data
- [ ] No errors in last hour
- [ ] Pros table has records
- [ ] Queue processing automatically
- [ ] Coordinator triggering seeds
- [ ] Rate limiting working
- [ ] Workers healthy

Once all items are checked, the system is ready for production!