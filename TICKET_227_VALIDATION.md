# Ticket #227 - ProGeoData Cron Worker Validation

## ✅ Deployment Status: COMPLETE

The ProGeoData 24/7 database population system has been deployed with:
- **Washington state support** (WA_DOL)
- **Vashon Island ZIP (98070)** as first Washington ZIP
- **400+ total ZIP codes** across FL, TX, CA, WA

## 🔍 VALIDATION STEPS

### Step 1: Trigger Test Seed (20 ZIPs)

```bash
# Navigate to project
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge

# Trigger test seeding
curl -X POST https://progeodata-queue-seed.magicmike.workers.dev/seed ^
  -H "Content-Type: application/json" ^
  -d "{\"mode\":\"test\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "mode": "test",
  "states": "all",
  "result": {
    "queued": 20,
    "skipped": 0,
    "errors": 0
  }
}
```

### Step 2: Wait 2-3 Minutes for Processing

The queue consumer will start processing immediately. Each ZIP takes about 5-10 seconds.

### Step 3: Check Database Population

```bash
# Check total professional count
npx wrangler d1 execute progeodata-db --command="SELECT COUNT(*) as total FROM pros"

# Check by state
npx wrangler d1 execute progeodata-db --command="SELECT state, COUNT(*) as count FROM pros GROUP BY state"

# Check Vashon Island specifically
npx wrangler d1 execute progeodata-db --command="SELECT COUNT(*) as count FROM pros WHERE zip='98070'"
```

### Step 4: Monitor Queue Health

```bash
# View queue processing status
npx wrangler d1 execute progeodata-db --command="SELECT * FROM queue_health"

# Check recent activity
npx wrangler d1 execute progeodata-db --command="SELECT zip_code, state, status, records_found FROM scrape_queue_state WHERE status='completed' LIMIT 10"
```

### Step 5: Check Worker Health

```bash
# Seed worker health
curl https://progeodata-queue-seed.magicmike.workers.dev/health

# Consumer worker health
curl https://progeodata-queue-consumer.magicmike.workers.dev/health

# Queue status
curl https://progeodata-queue-seed.magicmike.workers.dev/status
```

## ✅ SUCCESS CRITERIA FOR VALIDATION

| Criterion | How to Verify | Expected Result |
|-----------|--------------|-----------------|
| **Workers Deployed** | Check health endpoints | Both return 200 OK |
| **Queue Processing** | `SELECT * FROM queue_health` | Shows queued/processing > 0 |
| **Database Growing** | `SELECT COUNT(*) FROM pros` | Count increases after seeding |
| **Vashon Island** | `SELECT * FROM pros WHERE zip='98070'` | Returns professionals |
| **No Errors** | Check dead letter queue | Empty or minimal failures |

## 📊 EXPECTED METRICS

After test seed (20 ZIPs):
- **Time to process**: 3-5 minutes
- **Records expected**: 100-500 professionals
- **States covered**: FL (5), TX (5), CA (5), WA (5)
- **Vashon Island**: Should have 5-20 professionals

## 🔴 IF VALIDATION FAILS

### Issue: "Workers not found"
```bash
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\workers\progeodata-queue-seed
npx wrangler deploy

cd ..\progeodata-queue-consumer
npx wrangler deploy
```

### Issue: "Database not found"
```bash
npx wrangler d1 create progeodata-db
# Update wrangler.toml with database_id
```

### Issue: "Queue not processing"
```bash
# Check queue exists
npx wrangler queues list

# Monitor queue
npx wrangler queues tail progeodata-scrape-queue

# Check consumer logs
npx wrangler tail progeodata-queue-consumer
```

### Issue: "No data in pros table"
```bash
# Check if scraper-browser is deployed
npx wrangler deployments list | grep scraper-browser

# Check raw_business_data table
npx wrangler d1 execute progeodata-db --command="SELECT COUNT(*) FROM raw_business_data"
```

## 🟢 VALIDATION COMPLETE CHECKLIST

- [ ] Seed endpoint returns success
- [ ] Queue health shows activity
- [ ] Database record count increases
- [ ] Vashon Island (98070) has data
- [ ] No critical errors in logs

## 📝 EVIDENCE FOR TICKET

Once validated, update ticket with:

```markdown
## Validation Evidence

**Test Seed Response:**
[Paste curl response]

**Database Population:**
- Initial count: 0
- After 5 minutes: [count]
- States with data: FL, TX, CA, WA

**Vashon Island Data:**
- ZIP 98070: [X] professionals found

**Queue Processing:**
- Queued: 20
- Processed: 20
- Failed: 0

**System Status:** ✅ OPERATIONAL
```

## 🚀 PRODUCTION DEPLOYMENT

After successful validation:

```bash
# Trigger full production seed (400 ZIPs)
curl -X POST https://progeodata-queue-seed.magicmike.workers.dev/seed ^
  -H "Content-Type: application/json" ^
  -d "{\"mode\":\"production\"}"
```

This will queue all 400 ZIP codes and run for 24+ hours to populate the full database.

---

**ProGeoData.com** - 24/7 Database Population System
**Ticket #227** - Ready for Validation