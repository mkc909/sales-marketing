# ProGeoData Cron Worker - Deployment Verification & Testing Guide

## 🚀 System Overview

Your ProGeoData 24/7 scraping system is now configured with:
- ✅ **Florida** (FL_DBPR) - 100 ZIP codes
- ✅ **Texas** (TX_TREC) - 100 ZIP codes
- ✅ **California** (CA_DRE) - 100 ZIP codes
- ✅ **Washington** (WA_DOL) - 100 ZIP codes including **Vashon Island (98070)** as requested

## 🔍 Quick Verification Commands

Open a new terminal with npm/npx in PATH and run:

```bash
# Navigate to the project
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing

# 1. Check Cloudflare authentication
npx wrangler whoami

# 2. List D1 databases (should see progeodata-db)
npx wrangler d1 list

# 3. Check queue tables exist
cd worktrees\siteforge
npx wrangler d1 execute progeodata-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%queue%'"

# 4. Check Washington state is configured
npx wrangler d1 execute progeodata-db --command="SELECT * FROM rate_limits WHERE source_id='WA_DOL'"

# 5. List deployed workers
npx wrangler deployments list
```

## 📦 Component Status

### 1. Seed Worker (progeodata-queue-seed)
- **Location**: `workers\progeodata-queue-seed\`
- **Features**:
  - ✅ Washington state ZIP codes added (100 total)
  - ✅ Vashon Island (98070) is FIRST in the WA list
  - ✅ Test mode: 20 ZIPs (5 per state)
  - ✅ Production mode: 400 ZIPs (100 per state)

### 2. Consumer Worker (progeodata-queue-consumer)
- **Location**: `workers\progeodata-queue-consumer\`
- **Features**:
  - ✅ Processes queue messages
  - ✅ Rate limiting (1 req/sec)
  - ✅ Service binding to scraper-browser
  - ✅ Stores results in D1

### 3. D1 Database Tables
- **Migration**: `worktrees\siteforge\migrations\010_queue_tables.sql`
- **Tables**:
  - ✅ `scrape_queue_state` - ZIP processing status
  - ✅ `rate_limits` - API throttling (includes WA_DOL)
  - ✅ `queue_messages` - Audit trail
  - ✅ `scrape_schedule` - Cron schedules

## 🧪 Testing Vashon Island & Seattle

### Test 1: Seed Vashon Island Only

```bash
# Deploy seed worker if not already deployed
cd workers\progeodata-queue-seed
npx wrangler deploy

# Get the worker URL (look for the URL in output)
# Then trigger seeding for just Vashon Island

curl -X POST https://progeodata-queue-seed.[your-subdomain].workers.dev/seed ^
  -H "Content-Type: application/json" ^
  -d "{\"mode\":\"test\",\"states\":[\"WA\"]}"
```

This will queue:
- **98070** - Vashon Island (FIRST)
- **98101** - Seattle Downtown
- **98102** - Seattle Capitol Hill
- **98103** - Seattle Wallingford
- **98104** - Seattle Downtown/ID

### Test 2: Check Queue Status

```bash
# Check if Vashon Island is queued
npx wrangler d1 execute progeodata-db --command="SELECT * FROM scrape_queue_state WHERE zip_code='98070'"

# Check all Washington ZIPs
npx wrangler d1 execute progeodata-db --command="SELECT zip_code, status FROM scrape_queue_state WHERE state='WA' ORDER BY zip_code"

# Check queue health
npx wrangler d1 execute progeodata-db --command="SELECT * FROM queue_health WHERE state='WA'"
```

### Test 3: Production Seeding (All 400 ZIPs)

```bash
# Seed all states with production data
curl -X POST https://progeodata-queue-seed.[your-subdomain].workers.dev/seed ^
  -H "Content-Type: application/json" ^
  -d "{\"mode\":\"production\"}"
```

This will queue:
- 100 Florida ZIPs
- 100 Texas ZIPs
- 100 California ZIPs
- 100 Washington ZIPs (Vashon Island first!)

## 📊 Monitor Processing

### Real-time Monitoring

```bash
# Watch seed worker logs
npx wrangler tail progeodata-queue-seed

# Watch consumer worker logs
npx wrangler tail progeodata-queue-consumer

# Watch queue processing
npx wrangler queues tail progeodata-scrape-queue
```

### Database Monitoring

```bash
# Overall queue health
npx wrangler d1 execute progeodata-db --command="SELECT * FROM queue_health"

# Recent activity
npx wrangler d1 execute progeodata-db --command="SELECT * FROM recent_queue_activity LIMIT 20"

# Check rate limiting
npx wrangler d1 execute progeodata-db --command="SELECT * FROM rate_limit_status"

# Count processed professionals
npx wrangler d1 execute progeodata-db --command="SELECT COUNT(*) as total FROM pros WHERE state='WA'"
```

## 🎯 Expected Results

### After 1 Hour
- ✅ 20+ Washington professionals scraped (including Vashon Island)
- ✅ Queue processing for all 4 states
- ✅ Rate limiting working (1 req/sec)
- ✅ No errors in dead letter queue

### After 24 Hours
- ✅ 10,000+ total professionals
- ✅ All 400 ZIP codes processed
- ✅ Vashon Island (98070) data complete
- ✅ Seattle metro area fully populated

## 🔧 Troubleshooting

### If Workers Not Deployed

```bash
# Deploy seed worker
cd workers\progeodata-queue-seed
npm install
npx wrangler deploy

# Deploy consumer worker
cd ..\progeodata-queue-consumer
npm install
npx wrangler deploy
```

### If Migration Not Applied

```bash
cd worktrees\siteforge
npx wrangler d1 execute progeodata-db --file=migrations\010_queue_tables.sql
```

### If Queues Not Created

```bash
# Create main queue
npx wrangler queues create progeodata-scrape-queue

# Create dead letter queue
npx wrangler queues create progeodata-scrape-dlq
```

### If KV Namespace Missing

```bash
npx wrangler kv:namespace create PROGEODATA_RATE_LIMITS
# Copy the ID and update wrangler.toml files
```

## 🌍 Vashon Island Special Notes

**ZIP Code**: 98070
**Location**: Puget Sound, Washington
**Population**: ~11,000
**Real Estate Professionals**: Estimated 50-100

The system will scrape:
- Real estate agents
- Brokers
- Property managers
- Home inspectors

From Washington Department of Licensing (WA_DOL).

## 📈 Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Queue Throughput | 10 msg/sec | Monitor with `wrangler queues tail` |
| Scraping Rate | 1 req/sec/state | Check `rate_limit_status` view |
| Daily Capacity | 864,000 records | Check `queue_health` view |
| Error Rate | <1% | Check dead letter queue |

## ✅ Success Criteria

Your system is working when:

1. **Vashon Island data appears**:
   ```sql
   SELECT * FROM pros WHERE zip='98070'
   ```

2. **Queue is processing**:
   ```sql
   SELECT * FROM queue_health WHERE queued > 0 OR processing > 0
   ```

3. **No rate limit violations**:
   ```sql
   SELECT * FROM rate_limit_status WHERE status='throttled'
   ```

4. **Workers are healthy**:
   ```bash
   curl https://progeodata-queue-seed.[your-subdomain].workers.dev/health
   curl https://progeodata-queue-consumer.[your-subdomain].workers.dev/health
   ```

## 🚀 Next Steps

1. **Verify deployment** using commands above
2. **Trigger test seed** with Vashon Island
3. **Monitor processing** for 10 minutes
4. **Check database** for scraped data
5. **Scale to production** when ready

---

**ProGeoData.com** - Now with complete Pacific Northwest coverage including Vashon Island! 🏝️