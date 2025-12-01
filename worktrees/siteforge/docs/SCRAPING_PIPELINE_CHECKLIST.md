# Scraping Pipeline - Production Deployment Checklist

## Pre-Deployment (15 minutes)

### 1. Environment Setup
- [ ] Navigate to project: `cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge`
- [ ] Install dependencies: `npm install`
- [ ] Verify Node version >= 18: `node --version`
- [ ] Verify Wrangler installed: `wrangler --version`

### 2. API Key Configuration
- [ ] Create `.env` file in project root
- [ ] Add `GOOGLE_MAPS_API_KEY=your_key`
- [ ] Add `FACEBOOK_ACCESS_TOKEN=your_token` (optional)
- [ ] Add `HUNTER_API_KEY=your_key` (optional)
- [ ] Add `SITE_BASE_URL=https://estateflow.com`
- [ ] Add `SITE_NAME=EstateFlow`
- [ ] Test environment loading: `node -e "console.log(process.env.GOOGLE_MAPS_API_KEY)"`

### 3. Database Migration
- [ ] Verify D1 database exists: `wrangler d1 list`
- [ ] Run all migrations: `npm run db:migrate`
- [ ] Verify tables created:
```bash
wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```
- [ ] Check for these tables:
  - `raw_business_data`
  - `icp_signals`
  - `enriched_leads`
  - `ghost_profiles`
  - `scraping_jobs`
  - `api_usage`

## Component Testing (30 minutes)

### 4. Google Maps Scraper Test
- [ ] Run test scrape: `npm run scrape:google "plumber" "San Juan, PR" -- --radius=10000`
- [ ] Verify output shows:
  - "Found X businesses" message
  - Business names being processed
  - "Completed" summary with stats
- [ ] Check database for results:
```bash
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) as count FROM raw_business_data WHERE source='google_maps'"
```
- [ ] Expected: At least 5-10 records

### 5. Facebook Scraper Test (Optional)
- [ ] If Facebook token configured, run: `npm run scrape:facebook "food truck" "Miami, FL"`
- [ ] Verify businesses found
- [ ] Check for no_website detection
- [ ] Verify database records:
```bash
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) as count FROM raw_business_data WHERE source='facebook'"
```

### 6. ICP Detector Test
- [ ] Run batch analysis: `npm run icp:batch 10`
- [ ] Verify output shows:
  - ICP scores (0-100)
  - Categories (high/medium/low)
  - Signal types detected
- [ ] Check database:
```bash
wrangler d1 execute estateflow-db --command="SELECT icp_category, COUNT(*) FROM icp_signals GROUP BY icp_category"
```
- [ ] Expected: Mix of high/medium/low categories

### 7. Enrichment Pipeline Test
- [ ] Run batch enrichment: `npm run enrich:batch 10`
- [ ] Verify output shows:
  - Lead scores (0-100)
  - Lead grades (A/B/C/D)
  - Phone validation results
- [ ] Check database:
```bash
wrangler d1 execute estateflow-db --command="SELECT lead_grade, COUNT(*) FROM enriched_leads GROUP BY lead_grade"
```
- [ ] Expected: Distribution across grades

### 8. Ghost Profile Generator Test
- [ ] Run batch generation: `npm run ghost:batch 5`
- [ ] Verify output shows:
  - Profile slugs created
  - URLs generated
  - "Profile created" messages
- [ ] Check database:
```bash
wrangler d1 execute estateflow-db --command="SELECT slug, business_name, meta_title FROM ghost_profiles LIMIT 5"
```
- [ ] Verify slugs are URL-safe (lowercase, hyphens, no spaces)
- [ ] Verify meta_title includes business name + location

## Integration Testing (20 minutes)

### 9. Full Pipeline Test
- [ ] Run complete pipeline: `npm run scrape:pipeline "plumber" "San Juan, PR"`
- [ ] Monitor output for all 4 steps:
  - ✅ Step 1: Scraping businesses
  - ✅ Step 2: Detecting ICP signals
  - ✅ Step 3: Enriching leads
  - ✅ Step 4: Generating ghost profiles
- [ ] Verify final report shows:
  - Businesses scraped: >0
  - ICP high matches: >0
  - Leads enriched: >0
  - Profiles generated: >0
  - Throughput: ~0.5-2 businesses/minute
- [ ] Check all 3 database layers populated:
```bash
wrangler d1 execute estateflow-db --command="
  SELECT
    (SELECT COUNT(*) FROM raw_business_data) as raw_count,
    (SELECT COUNT(*) FROM enriched_leads) as enriched_count,
    (SELECT COUNT(*) FROM ghost_profiles) as profile_count
"
```

### 10. Statistics Dashboard Test
- [ ] Run: `npm run scrape:stats`
- [ ] Verify output shows:
  - Scraped data by source
  - ICP distribution
  - Lead grades
  - Profile counts
- [ ] Check all counts are non-zero

## Production Setup (15 minutes)

### 11. Daily Automation Configuration

**Windows (Task Scheduler)**:
```powershell
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run scrape:daily" -WorkingDirectory "C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "EstateFlow Daily Scraping" -Description "Automated daily business scraping"
```

**Linux/Mac (Cron)**:
```bash
# Open crontab
crontab -e

# Add this line (runs at 2 AM daily)
0 2 * * * cd /path/to/siteforge && npm run scrape:daily >> /var/log/scraping.log 2>&1
```

- [ ] Scheduled task created
- [ ] Test run manually: `npm run scrape:daily` (WARNING: Takes 2-3 hours)
- [ ] Verify log output

### 12. Monitoring Setup

**API Usage Alerts**:
- [ ] Set up Google Cloud quota alerts (80% of free tier)
- [ ] Create alert for 22,800 requests/month (80% of 28,500)

**Database Monitoring**:
- [ ] Create daily stats query script:
```bash
# Save as check-pipeline-health.sh
wrangler d1 execute estateflow-db --command="
  SELECT
    'Today Raw Scraped' as metric,
    COUNT(*) as value
  FROM raw_business_data
  WHERE DATE(scraped_at) = DATE('now')

  UNION ALL

  SELECT
    'Today Profiles Generated',
    COUNT(*)
  FROM ghost_profiles
  WHERE DATE(created_at) = DATE('now')
"
```
- [ ] Test health check: `bash check-pipeline-health.sh`

**Error Monitoring**:
- [ ] Set up Wrangler tail: `npm run monitor:errors`
- [ ] Verify error logs are visible

### 13. Documentation Review
- [ ] Read `docs/SCRAPING_PIPELINE_GUIDE.md` (15 minutes)
- [ ] Bookmark for reference
- [ ] Review troubleshooting section

## Post-Deployment Validation (24 hours later)

### 14. First Day Review
- [ ] Check daily automation ran successfully:
```bash
wrangler d1 execute estateflow-db --command="
  SELECT * FROM scraping_jobs
  WHERE created_at >= date('now', '-1 day')
  ORDER BY created_at DESC
"
```
- [ ] Verify status = 'completed' for all jobs
- [ ] Check total records created:
```bash
wrangler d1 execute estateflow-db --command="
  SELECT
    COUNT(*) as total_businesses,
    COUNT(CASE WHEN scraped_at >= datetime('now', '-1 day') THEN 1 END) as last_24h
  FROM raw_business_data
"
```
- [ ] Expected: 100-200 new businesses in 24 hours

### 15. Data Quality Check
- [ ] Review sample ghost profiles:
```bash
wrangler d1 execute estateflow-db --command="
  SELECT business_name, slug, meta_title, meta_description
  FROM ghost_profiles
  ORDER BY created_at DESC
  LIMIT 5
"
```
- [ ] Verify:
  - Business names are clean (no weird characters)
  - Slugs are URL-safe
  - Meta titles are descriptive
  - Meta descriptions have location + category

### 16. API Usage Check
- [ ] Check Google Maps usage:
```bash
wrangler d1 execute estateflow-db --command="
  SELECT
    api_provider,
    COUNT(*) as total_calls,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
    DATE(created_at) as day
  FROM api_usage
  WHERE created_at >= date('now', '-7 days')
  GROUP BY api_provider, DATE(created_at)
  ORDER BY day DESC
"
```
- [ ] Verify daily usage < 1,000 calls (well within free tier)

## Weekly Maintenance (ongoing)

### 17. Weekly Health Check
- [ ] Run statistics: `npm run scrape:stats`
- [ ] Review metrics:
  - ICP match rate (should be 30-50%)
  - Lead grade distribution (30% A, 40% B, 20% C, 10% D)
  - Profile generation rate (20-30% of scraped)
- [ ] Check for anomalies

### 18. Quality Assurance
- [ ] Manually review 10 random ghost profiles
- [ ] Check for:
  - Accurate business information
  - Proper SEO tags
  - Valid Schema.org markup
  - Correct claim CTAs
- [ ] Fix any template issues

### 19. Performance Optimization
- [ ] Review slow queries:
```bash
wrangler d1 execute estateflow-db --command="
  SELECT * FROM scraping_jobs
  WHERE CAST((julianday(completed_at) - julianday(started_at)) * 24 * 60 AS INTEGER) > 120
  ORDER BY created_at DESC
"
```
- [ ] Investigate jobs taking >2 hours
- [ ] Optimize batch sizes if needed

## Troubleshooting Reference

### Issue: "API key not found"
**Fix**:
```bash
# Check .env file exists
ls .env

# Verify contents
cat .env | grep GOOGLE_MAPS_API_KEY

# Restart Node process
```

### Issue: "Rate limit exceeded"
**Fix**:
```bash
# Check API usage
npm run scrape:stats

# Wait for reset (check api_usage table for rate_limit_reset)
wrangler d1 execute estateflow-db --command="SELECT * FROM api_usage ORDER BY created_at DESC LIMIT 5"
```

### Issue: "No businesses found"
**Fix**:
- Verify search query is specific: `"plumber"` not `"plumbers"`
- Check location spelling: `"San Juan, PR"` not `"san juan"`
- Increase radius: `--radius=100000` (100km)

### Issue: "Database error: table not found"
**Fix**:
```bash
# Re-run migration
npm run db:migrate

# Verify tables
wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

## Success Criteria

Pipeline is production-ready when:
- ✅ All component tests pass
- ✅ Full pipeline test completes without errors
- ✅ Database has records in all 3 layers
- ✅ Daily automation is scheduled
- ✅ Monitoring is set up
- ✅ First 24-hour run completes successfully
- ✅ Ghost profiles have valid SEO markup
- ✅ API usage is within free tier limits

## Expected First Week Results

| Metric | Target | Check |
|--------|--------|-------|
| Businesses scraped | 500-1,000 | `SELECT COUNT(*) FROM raw_business_data` |
| High ICP matches | 150-300 | `SELECT COUNT(*) FROM icp_signals WHERE icp_category='high'` |
| Grade A/B leads | 100-200 | `SELECT COUNT(*) FROM enriched_leads WHERE lead_grade IN ('A','B')` |
| Ghost profiles | 50-100 | `SELECT COUNT(*) FROM ghost_profiles` |
| API calls/day | 100-200 | Check api_usage table |

## Support Resources

- **Documentation**: `docs/SCRAPING_PIPELINE_GUIDE.md`
- **Quick Reference**: `scripts/README.md`
- **Architecture**: `docs/EPIC-002_IMPLEMENTATION_SUMMARY.md`
- **Database Schema**: `migrations/005_scraping_pipeline.sql`

## Emergency Contacts

If pipeline fails catastrophically:
1. Stop daily automation (disable cron/task)
2. Check error logs: `wrangler tail --format pretty`
3. Review last job: `SELECT * FROM scraping_jobs ORDER BY created_at DESC LIMIT 1`
4. Check API quotas (Google Cloud Console)
5. Restart with manual test: `npm run scrape:pipeline "plumber" "San Juan, PR"`

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Sign-off**: _________________ (After 7-day successful operation)
