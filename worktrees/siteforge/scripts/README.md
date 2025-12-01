# EstateFlow Scraping & Data Pipeline

Automated business discovery, enrichment, and ghost profile generation system.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```env
GOOGLE_MAPS_API_KEY=your_api_key
FACEBOOK_ACCESS_TOKEN=your_token  # Optional
HUNTER_API_KEY=your_hunter_key     # Optional
SITE_BASE_URL=https://estateflow.com
```

### 3. Run Database Migration
```bash
npm run db:migrate
```

### 4. Test Pipeline
```bash
npm run scrape:pipeline "plumber" "San Juan, PR"
```

## Available Scripts

### Full Pipeline
```bash
# Run complete pipeline (scrape → ICP → enrich → profiles)
npm run scrape:pipeline "plumber" "San Juan, PR"

# Daily automation (5 predefined searches)
npm run scrape:daily

# View statistics
npm run scrape:stats
```

### Individual Components
```bash
# Google Maps scraping
npm run scrape:google "plumber" "San Juan, PR"

# Facebook scraping
npm run scrape:facebook "food truck" "Miami, FL"

# ICP analysis
npm run icp:analyze 123        # Single business
npm run icp:batch 100          # Batch (100 businesses)

# Lead enrichment
npm run enrich:single 123      # Single lead
npm run enrich:batch 100       # Batch (100 leads)

# Ghost profiles
npm run ghost:generate 123     # Single profile
npm run ghost:batch 50         # Batch (50 profiles)
```

## Architecture

### Triple D1 Database Schema

**DB_INGEST** (Raw Data)
- `raw_business_data` - Scraped businesses
- `scraping_jobs` - Job tracking
- `api_usage` - API monitoring

**DB_STAGING** (Enriched Leads)
- `icp_signals` - ICP detection
- `enriched_leads` - Validated leads
- `lead_conversions` - Tracking

**DB_PROD** (Ghost Profiles)
- `ghost_profiles` - Public profiles
- `claim_requests` - Business claims

### Data Flow
```
Google Maps → raw_business_data → icp_signals → enriched_leads → ghost_profiles
Facebook    ↗                                                           ↓
                                                                   Public Website
```

## Key Features

### 1. ICP Signal Detection (90% accuracy target)
- No website businesses
- Unmappable addresses (Int, Km, Bo)
- Mobile businesses (food trucks)
- Ghost businesses (social only)
- Complex addresses

### 2. Lead Scoring
- **Grade A** (80-100): Hot leads
- **Grade B** (60-79): Qualified leads
- **Grade C** (40-59): Nurture
- **Grade D** (0-39): Low priority

### 3. Ghost Profiles
- SEO-optimized content
- Schema.org markup
- Auto-generated descriptions
- "Claim This Business" CTAs

## Rate Limits

- **Google Maps**: 100 businesses/hour
- **Facebook**: 200 calls/hour
- **Hunter.io**: 25 searches/month (free tier)

## Daily Automation

Predefined searches for Puerto Rico:
- Plumbers in San Juan
- Electricians in Bayamón
- Food trucks in Ponce
- Landscapers in Caguas
- Contractors in Carolina

Schedule with cron:
```bash
0 2 * * * cd /path/to/siteforge && npm run scrape:daily
```

## File Structure

```
scripts/
├── scrapers/
│   ├── google-maps-scraper.js     # Google Maps API integration
│   └── facebook-scraper.js        # Facebook Graph API
├── icp-detector.js                # ICP signal detection
├── enrichment-pipeline.js         # Lead enrichment
├── ghost-profile-generator.js     # Profile generation
└── scraping-orchestrator.js       # Pipeline coordinator
```

## Monitoring

### View API Usage
```bash
wrangler d1 execute estateflow-db --command="
  SELECT api_provider, COUNT(*) as calls, SUM(success) as successful
  FROM api_usage WHERE created_at >= date('now', '-7 days')
  GROUP BY api_provider
"
```

### View High-Value Leads
```bash
wrangler d1 execute estateflow-db --command="
  SELECT * FROM high_value_leads LIMIT 20
"
```

### Check Job Status
```bash
wrangler d1 execute estateflow-db --command="
  SELECT * FROM scraping_jobs ORDER BY created_at DESC LIMIT 10
"
```

## Revenue Model

**Target**: $2,450 MRR by Day 90

- 5,000 ghost profiles
- 2% claim rate (100 claims)
- 50% paid conversion
- 50 customers × $49/month

**12-Month Target**: $24,500 MRR (500 customers)

## Documentation

- [Full Pipeline Guide](../docs/SCRAPING_PIPELINE_GUIDE.md)
- [Database Schema](../docs/UNIFIED_PLATFORM_ARCHITECTURE.md)
- [Deployment Guide](../DEPLOYMENT_INSTRUCTIONS.md)

## Troubleshooting

**API Key Issues**
- Check `.env` file exists
- Verify API key format
- Restart Node process

**Rate Limits**
- Check `api_usage` table
- Adjust batch sizes
- Increase intervals

**No Results**
- Verify search query
- Check location spelling
- Increase search radius

## Support

Run statistics to check system health:
```bash
npm run scrape:stats
```

View database views:
- `high_value_leads` - Best leads for outreach
- `publishable_profiles` - Profiles ready to publish
- `job_performance` - Scraping job metrics
