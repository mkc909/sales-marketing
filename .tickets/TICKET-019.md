# Ticket #019: Add Texas (TX) Scraping Support

**Status:** 🔴 Open
**Priority:** MEDIUM
**Created:** 2024-12-01
**Assignee:** Code Agent
**Time Estimate:** 2 hours

## Description
Add support for scraping Texas real estate professionals from TREC (Texas Real Estate Commission).

## Target Website
- URL: https://www.trec.texas.gov/
- Search Page: License Holder Search
- Rate Limit: Unknown (test carefully)

## Implementation Tasks

### 1. Add TX Scraper Function
In `workers/scraper-browser/src/index.ts`:
```typescript
async function scrapeTXTREC(page: Page, params: SearchRequest): Promise<Professional[]> {
  // Implement TX-specific scraping logic
}
```

### 2. Update Main Scraper Router
```typescript
if (searchParams.state === 'TX') {
  results = await scrapeTXTREC(page, searchParams);
} else if (searchParams.state === 'FL') {
  results = await scrapeFLDBPR(page, searchParams);
}
```

### 3. Map TX Profession Codes
Research and map profession codes for:
- Real Estate Sales Agent
- Real Estate Broker
- Property Inspector
- Appraiser

## Test Command
```bash
curl -X POST https://scraper-browser.magicmike.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"state": "TX", "profession": "real_estate", "zip": "75001"}'
```

## Success Criteria
- [ ] TX scraping function implemented
- [ ] Returns real TX professional data
- [ ] Handles TX-specific license formats
- [ ] Respects TREC rate limits

## Notes
- TX has different license format than FL
- May need different form navigation
- Consider implementing state-specific rate limits