# Ticket #017: Test E2E Scraping Flow

**Status:** 🟡 Blocked
**Priority:** HIGH
**Created:** 2024-12-01
**Assignee:** Code Agent
**Blocked By:** TICKET-023 (Error 1042)
**Time Estimate:** 10 minutes

## Description
Test the complete end-to-end flow from scraper-api to browser-worker to FL DBPR to verify real data scraping works.

## Test Commands

### 1. Test Browser Worker Directly
```bash
curl -X POST https://scraper-browser.magicmike.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"state": "FL", "profession": "real_estate", "zip": "33139", "limit": 5}'
```

### 2. Test Through Scraper API
```bash
curl -X POST https://scraper-api.magicmike.workers.dev/search \
  -H "Content-Type: application/json" \
  -d '{"state": "FL", "profession": "real_estate", "zip": "33139"}'
```

### 3. Test Cache Hit
Run the same command twice - second should be faster (cached)

## Success Criteria
- [ ] Browser worker returns data (real or mock)
- [ ] Scraper API returns data through browser worker
- [ ] Cache hit is faster than cache miss
- [ ] No timeout errors
- [ ] Response includes `source` field (live/mock/cache)

## Expected Response Structure
```json
{
  "results": [
    {
      "name": "Professional Name",
      "license_number": "FL1234567",
      "license_status": "Active",
      "company": "Company Name",
      "city": "Miami",
      "state": "FL"
    }
  ],
  "source": "live|mock|cache",
  "scraped_at": "2024-12-01T00:00:00Z"
}
```

## Notes
- If getting mock data, Browser Rendering may not be enabled ($5/month)
- First request may take 5-10 seconds (scraping)
- Cached requests should return in <500ms