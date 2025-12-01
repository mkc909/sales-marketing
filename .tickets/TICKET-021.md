# Ticket #021: Setup Monitoring and Analytics

**Status:** 🔴 Open
**Priority:** LOW
**Created:** 2024-12-01
**Assignee:** Code Agent
**Time Estimate:** 45 minutes

## Description
Implement monitoring to track scraping success rates, performance, and costs.

## Monitoring Requirements

### 1. Track Metrics
- Scraping success/failure rate
- Response times (P50, P95, P99)
- Cache hit rate
- Browser Rendering usage ($)
- Error types and frequency

### 2. Add Logging
In both workers, add structured logging:
```javascript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'scrape_complete',
  state: 'FL',
  profession: 'real_estate',
  zip: '33139',
  duration_ms: 5234,
  source: 'live',
  result_count: 10,
  cache_hit: false
}));
```

### 3. Setup Cloudflare Analytics
- Workers & Pages → Analytics
- Set up custom dashboards
- Configure alerts for errors

### 4. Cost Tracking
Track Browser Rendering costs:
```javascript
// After each browser session
console.log({
  event: 'browser_usage',
  duration_seconds: 5,
  estimated_cost: 0.0001
});
```

## Monitoring Commands

### View Real-Time Logs
```bash
wrangler tail scraper-browser --format pretty
wrangler tail scraper-api --format pretty
```

### Check Worker Status
```bash
curl https://scraper-browser.magicmike.workers.dev/health
curl https://scraper-api.magicmike.workers.dev/health
```

## Success Criteria
- [ ] Structured logging implemented
- [ ] Can track success rates
- [ ] Can measure performance
- [ ] Can estimate monthly costs
- [ ] Alerts configured for failures

## Dashboard Metrics
- Total requests/day
- Success rate %
- Average response time
- Cache hit rate %
- Estimated monthly cost
- Error rate by type