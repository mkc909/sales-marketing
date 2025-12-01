# Scraper Browser - Cloudflare Browser Rendering Worker

## Overview

This worker uses Cloudflare's Browser Rendering API to scrape professional licensing data in real-time from state licensing boards, starting with Florida DBPR.

## Features

- **Cloudflare Browser Rendering** - No localhost dependencies
- **FL DBPR Integration** - Real estate, insurance, contractor data
- **24-hour KV Caching** - Reduces duplicate scraping
- **Rate Limiting** - 1 request/second to respect state boards
- **Mock Fallback** - Returns sample data if scraping fails

## Deployment

### 1. Install Dependencies

```bash
cd workers/scraper-browser
npm install
```

### 2. Create KV Namespace (Optional)

```bash
wrangler kv:namespace create "CACHE"
```

Update the namespace ID in `wrangler.toml`.

### 3. Enable Browser Rendering

Browser Rendering is a **paid add-on** for Cloudflare Workers.

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your account
3. Go to "Browser Rendering" tab
4. Enable Browser Rendering ($5/month + usage)

### 4. Deploy

```bash
npm run deploy

# or directly
wrangler deploy
```

Expected output:
```
Published scraper-browser (X.XX sec)
  https://scraper-browser.magicmike.workers.dev
```

## API Endpoints

### POST /
Search for professionals by location

**Request:**
```json
{
  "state": "FL",
  "profession": "real_estate",
  "zip": "33139",
  "limit": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "name": "John Smith",
      "license_number": "FL3000001",
      "license_status": "Active",
      "company": "Keller Williams",
      "city": "Miami",
      "state": "FL"
    }
  ],
  "source": "live",
  "scraped_at": "2024-12-01T00:00:00Z"
}
```

## Supported States & Professions

### Florida (FL)
- `real_estate` - Real Estate Sales Associate
- `real_estate_broker` - Real Estate Broker
- `insurance` - Insurance Agent
- `contractor` - General Contractor
- `attorney` - Attorney
- `dentist` - Dentist

### Coming Soon
- Texas (TX)
- California (CA)
- New York (NY)

## Testing

### Local Development
```bash
npm run dev
```

### Test Scraping
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"state": "FL", "profession": "real_estate", "zip": "33139"}'
```

### Production Test
```bash
curl -X POST https://scraper-browser.magicmike.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"state": "FL", "profession": "real_estate", "zip": "33139"}'
```

## Rate Limits

- FL DBPR: 1 request per second
- Browser Rendering API: 100 concurrent browsers
- KV Cache: 24-hour TTL

## Troubleshooting

### "Browser Rendering not enabled"
Enable Browser Rendering in Cloudflare Dashboard (paid add-on).

### "Timeout waiting for selector"
FL DBPR may have changed their HTML. Check selectors in `src/index.ts`.

### Getting mock data instead of real data
This is normal during high load or when scraping fails. The worker returns mock data to maintain availability.

## Cost Estimates

- Browser Rendering: $5/month base + $0.00002 per browser second
- Average scrape: ~5 seconds = $0.0001 per request
- 10,000 requests/month = ~$1 in usage
- Total: ~$6/month for moderate usage

## Architecture

```
User Request
    ↓
scraper-api.workers.dev (Edge caching)
    ↓
scraper-browser.workers.dev (This worker)
    ↓
FL DBPR Website (Real data)
    ↓
Response with real professional data
```

## Environment Variables

- `RATE_LIMIT_DELAY` - Milliseconds between requests (default: 1000)
- `DEBUG` - Enable debug logging (development only)

## Security Notes

- No API keys required for FL DBPR
- User-Agent rotation implemented
- Respects robots.txt and rate limits
- No personal data is stored permanently