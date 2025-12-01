# Scraping Pipeline Guide

## Overview

The EstateFlow scraping and data pipeline is designed to automatically discover, enrich, and onboard businesses without websites as ghost profiles. The system operates across three separate D1 databases to maintain data quality and separation of concerns.

## Architecture: Triple D1 Schema

### Database 1: DB_INGEST (Raw Data)
**Purpose**: Store raw, unprocessed business data from scraping sources

**Tables**:
- `raw_business_data` - All scraped businesses (Google Maps, Facebook, manual)
- `scraping_jobs` - Job tracking and scheduling
- `api_usage` - API quota monitoring

**Data Flow**: Scrapers → DB_INGEST

### Database 2: DB_STAGING (Enriched Leads)
**Purpose**: Validated, enriched, and scored leads ready for sales outreach

**Tables**:
- `icp_signals` - Ideal Customer Profile signal detection
- `enriched_leads` - Validated contact info, social proof, lead scoring
- `lead_conversions` - Conversion tracking

**Data Flow**: DB_INGEST → ICP Detector → Enrichment Pipeline → DB_STAGING

### Database 3: DB_PROD (Ghost Profiles)
**Purpose**: SEO-optimized, publicly-facing business profiles

**Tables**:
- `ghost_profiles` - Auto-generated business profiles
- `claim_requests` - Business owners requesting profile claims

**Data Flow**: DB_STAGING → Ghost Profile Generator → DB_PROD

## Pipeline Components

### 1. Google Maps Scraper (`scripts/scrapers/google-maps-scraper.js`)

**Purpose**: Discover businesses using Google Maps Places API

**Features**:
- Rate limiting: 100 businesses/hour (36 seconds between requests)
- Batch processing: 20 results per search
- Automatic retries: 3 attempts with exponential backoff
- ICP signal pre-detection (no website, unmappable address)

**Usage**:
```bash
# CLI
node scripts/scrapers/google-maps-scraper.js "plumber" "San Juan, PR" --radius=50000

# NPM script
npm run scrape:google "plumber" "San Juan, PR"
```

**Configuration**:
- Environment: `GOOGLE_MAPS_API_KEY`
- Rate limit: 100 req/hour (configurable)
- Batch size: 20 results
- Max retries: 3

**Data Extracted**:
- Business name, address, city, state, postal code
- Phone number, website
- Latitude/longitude (for mapping)
- Categories, hours, rating, reviews
- Place ID (Google Maps reference)

### 2. Facebook Pages Scraper (`scripts/scrapers/facebook-scraper.js`)

**Purpose**: Find businesses with Facebook presence but no website

**Features**:
- Rate limiting: 200 calls/hour (18 seconds between requests)
- Facebook Graph API v18.0
- Engagement metrics extraction (followers, engagement rate)
- Public page search (no special permissions needed)

**Usage**:
```bash
# CLI
node scripts/scrapers/facebook-scraper.js "food truck" "Miami, FL" --category=FOOD_BEVERAGE

# NPM script
npm run scrape:facebook "food truck" "Miami, FL"
```

**Configuration**:
- Environment: `FACEBOOK_ACCESS_TOKEN`
- Rate limit: 200 req/hour
- Search radius: 50km default

**Data Extracted**:
- Page name, about, category
- Address, location, phone, email
- Followers, engagement metrics
- Hours, rating, reviews
- Facebook page URL

**ICP Focus**: Prioritizes businesses without websites (high-value leads)

### 3. ICP Signal Detector (`scripts/icp-detector.js`)

**Purpose**: Identify ideal customer profile matches (90% target accuracy)

**Signal Types**:

1. **No Website** (30 points)
   - Business has no website URL
   - Highest ICP signal

2. **Unmappable Address** (25 points)
   - Contains: Int, Km, Bo, Urb, Carr (Puerto Rico patterns)
   - Address length > 100 characters
   - Complex multi-unit addresses

3. **Mobile Business** (20 points)
   - Food truck, mobile service keywords
   - "We come to you" patterns

4. **Ghost Business** (15 points)
   - Social media only (Facebook/Instagram)
   - No official website presence

5. **Complex Address** (10 points)
   - Multi-suite buildings
   - Shopping plaza locales
   - Multiple apartment numbers

**Scoring**:
- **ICP Score**: 0-100 (higher = better match)
- **Categories**: High (70+), Medium (40-69), Low (0-39)
- **Address Complexity**: 0-100 (higher = harder to find)
- **Findability Score**: 0-100 (lower = harder to find)

**Usage**:
```bash
# Analyze single business
npm run icp:analyze 123

# Batch analyze (100 businesses)
npm run icp:batch 100
```

**Output**:
- Detailed signal breakdown
- ICP category classification
- Specific recommendations per signal type

### 4. Lead Enrichment Pipeline (`scripts/enrichment-pipeline.js`)

**Purpose**: Transform raw data into sales-ready leads with validated contact info

**Enrichment Steps**:

1. **Phone Validation**
   - libphonenumber-js validation
   - E.164 format normalization
   - Country code handling

2. **Email Discovery**
   - Check raw data for existing email
   - Extract from website (if available)
   - Hunter.io API lookup (optional)
   - Generate likely patterns (info@domain.com)

3. **Address Normalization**
   - Standardize abbreviations (St. → Street)
   - Remove extra whitespace
   - Format consistency

4. **Social Media Enrichment**
   - Facebook followers/engagement
   - Instagram presence detection
   - Social proof metrics

5. **Business Intelligence**
   - Verified business status
   - Review count/rating analysis
   - Years in business estimation

6. **Lead Scoring** (0-100)
   - Contact info completeness: 45 points max
   - Social proof: 25 points max
   - Business verification: 15 points max
   - Operating hours: 10 points max
   - ICP bonus: 0-10 points

**Lead Grades**:
- **A Grade**: 80-100 (hot leads, immediate outreach)
- **B Grade**: 60-79 (qualified leads, schedule outreach)
- **C Grade**: 40-59 (nurture campaigns)
- **D Grade**: 0-39 (low priority)

**Usage**:
```bash
# Enrich single lead
npm run enrich:single 123

# Batch enrich (100 leads, ICP score >= 40)
npm run enrich:batch 100
```

**Configuration**:
- Environment: `HUNTER_API_KEY` (optional email finder)
- Rate limit: 5 seconds between API calls
- Batch size: 100 leads

### 5. Ghost Profile Generator (`scripts/ghost-profile-generator.js`)

**Purpose**: Auto-generate SEO-optimized business profiles for unclaimed businesses

**Features**:

1. **SEO Optimization**
   - Auto-generated meta titles and descriptions
   - Keyword extraction (location + category)
   - URL-safe slugs (business-name-city-state)
   - Schema.org LocalBusiness markup

2. **Content Generation**
   - Template-based descriptions (AI-ready architecture)
   - Category-specific services lists
   - About sections with social proof
   - Service area generation

3. **Structured Data**
   - JSON-LD Schema.org markup
   - GeoCoordinates for maps
   - AggregateRating (if reviews exist)
   - Business hours

4. **Claim Funnel**
   - "Claim This Business" CTAs
   - Claim tracking (is_claimed field)
   - Conversion event tracking

**Usage**:
```bash
# Generate single profile
npm run ghost:generate 123

# Batch generate (50 profiles, Grade A/B only)
npm run ghost:batch 50
```

**Profile URL Format**:
```
https://estateflow.com/[category]/[business-name-city-state]
```

**Example**:
```
https://estateflow.com/plumber/rapid-plumbing-services-san-juan-pr
```

### 6. Pipeline Orchestrator (`scripts/scraping-orchestrator.js`)

**Purpose**: Coordinate entire pipeline from scraping to ghost profiles

**Workflow**:
1. Scrape businesses (Google + Facebook)
2. Detect ICP signals
3. Enrich high-value leads
4. Generate ghost profiles
5. Generate performance report

**Usage**:
```bash
# Single search pipeline
npm run scrape:pipeline "plumber" "San Juan, PR"

# Daily automation (5 predefined searches)
npm run scrape:daily

# View pipeline statistics
npm run scrape:stats
```

**Daily Automation Searches** (Puerto Rico focus):
- Plumbers in San Juan
- Electricians in Bayamón
- Food trucks in Ponce
- Landscapers in Caguas
- Contractors in Carolina

**Performance Metrics**:
- Total businesses scraped
- ICP match rate (high-value %)
- Enrichment conversion rate
- Ghost profile generation rate
- Throughput (businesses/minute)

## Setup Instructions

### 1. Install Dependencies
```bash
cd worktrees/siteforge
npm install
```

**New Dependencies**:
- `@googlemaps/google-maps-services-js` - Google Maps API client
- `axios` - HTTP client for Facebook API
- `libphonenumber-js` - Phone number validation
- `slugify` - URL-safe slug generation

### 2. Configure API Keys

Create `.env` file in `worktrees/siteforge`:

```env
# Required
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Optional (Facebook scraping)
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token

# Optional (Email enrichment)
HUNTER_API_KEY=your_hunter_io_api_key

# Site configuration
SITE_BASE_URL=https://estateflow.com
SITE_NAME=EstateFlow
```

**Getting API Keys**:

**Google Maps API**:
1. Go to Google Cloud Console
2. Enable Places API and Geocoding API
3. Create API key with Places API restriction
4. Set quota alerts (free tier: 28,500 requests/month)

**Facebook Access Token**:
1. Create Facebook App at developers.facebook.com
2. Add "Pages" permission
3. Generate access token
4. Use Graph API Explorer to test

**Hunter.io** (optional):
1. Sign up at hunter.io
2. Free tier: 25 searches/month
3. Copy API key from dashboard

### 3. Run Database Migration

```bash
# Apply all migrations including scraping pipeline
npm run db:migrate
```

This creates all necessary tables in D1 database.

### 4. Test Pipeline Components

```bash
# Test Google Maps scraper (10 results max)
npm run scrape:google "plumber" "San Juan, PR" -- --radius=10000

# Test ICP detection
npm run icp:batch 10

# Test enrichment
npm run enrich:batch 10

# Test ghost profile generation
npm run ghost:batch 5
```

## Usage Examples

### Example 1: Find Plumbers in San Juan

```bash
# Run complete pipeline
npm run scrape:pipeline "plumber" "San Juan, PR"
```

**Expected Output**:
```
================================================================================
SCRAPING PIPELINE ORCHESTRATOR
================================================================================

Search: "plumber" in San Juan, PR
Sources: google, facebook

[Job 1] Created

--------------------------------------------------------------------------------
STEP 1: SCRAPING BUSINESSES
--------------------------------------------------------------------------------
[Search] Query: "plumber" | Location: "San Juan, PR"
[Search] Page 1: Found 20 businesses
[1/20] Processing: Rapid Plumbing Services
...
[Job 1] Completed: { total: 35, saved: 32, failed: 3, icpMatches: 18 }

--------------------------------------------------------------------------------
STEP 2: DETECTING ICP SIGNALS
--------------------------------------------------------------------------------
[ICP] Found 32 businesses to analyze
[ICP] Analyzing: Rapid Plumbing Services
[ICP] Score: 85/100 | Category: high
...
[ICP] Batch complete: { total: 32, analyzed: 32, high: 18, medium: 10, low: 4 }

--------------------------------------------------------------------------------
STEP 3: ENRICHING LEADS
--------------------------------------------------------------------------------
[Enrich] Found 18 businesses to enrich
[Enrich] Processing: Rapid Plumbing Services
[Enrich] Score: 92/100 | Grade: A
...
[Enrich] Batch complete: { total: 18, enriched: 18, gradeA: 12, gradeB: 6 }

--------------------------------------------------------------------------------
STEP 4: GENERATING GHOST PROFILES
--------------------------------------------------------------------------------
[Ghost] Found 12 leads to generate profiles for
[Ghost] Generating profile for: Rapid Plumbing Services
[Ghost] Profile created: rapid-plumbing-services-san-juan-pr
[Ghost] URL: https://estateflow.com/plumber/rapid-plumbing-services-san-juan-pr
...
[Ghost] Batch complete: { total: 12, generated: 12 }

================================================================================
PIPELINE COMPLETE - FINAL REPORT
================================================================================

📊 SCRAPING RESULTS:
   Total Businesses Scraped: 32
   ├─ Google Maps: 32
   └─ Facebook: 0

🎯 ICP ANALYSIS:
   Total Analyzed: 32
   ├─ High ICP Match: 18 (56.25%)
   ├─ Medium ICP Match: 10
   └─ Low ICP Match: 4

💎 LEAD ENRICHMENT:
   Total Enriched: 18
   ├─ Grade A: 12
   ├─ Grade B: 6
   ├─ Grade C: 0
   └─ Grade D: 0

👻 GHOST PROFILES:
   Profiles Generated: 12
   Conversion Rate: 37.50%

⏱️  PERFORMANCE:
   Total Duration: 1847s
   Throughput: 1.0 businesses/minute
```

### Example 2: Daily Automation

```bash
# Run daily automation (5 searches, ~2.5 hours)
npm run scrape:daily
```

**Schedule with Cron** (Linux/Mac):
```cron
# Run daily at 2 AM
0 2 * * * cd /path/to/siteforge && npm run scrape:daily
```

**Schedule with Task Scheduler** (Windows):
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run scrape:daily" -WorkingDirectory "C:\path\to\siteforge"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "EstateFlow Daily Scraping" -Description "Daily business scraping pipeline"
```

### Example 3: View Statistics

```bash
npm run scrape:stats
```

**Expected Output**:
```json
{
  "scraped": {
    "results": [
      { "source": "google_maps", "count": 1250, "no_website": 425 },
      { "source": "facebook", "count": 380, "no_website": 380 }
    ]
  },
  "icp": {
    "results": [
      { "icp_category": "high", "count": 687, "avg_score": 78.5 },
      { "icp_category": "medium", "count": 543, "avg_score": 52.3 },
      { "icp_category": "low", "count": 400, "avg_score": 28.1 }
    ]
  },
  "leads": {
    "results": [
      { "lead_grade": "A", "count": 456, "avg_score": 87.2, "avg_conversion": 0.72 },
      { "lead_grade": "B", "count": 231, "avg_score": 68.5, "avg_conversion": 0.51 },
      { "lead_grade": "C", "count": 89, "avg_score": 48.3, "avg_conversion": 0.31 },
      { "lead_grade": "D", "count": 45, "avg_score": 32.1, "avg_conversion": 0.18 }
    ]
  },
  "profiles": {
    "total": 456,
    "published": 412,
    "claimed": 38,
    "avg_views": 127.5,
    "avg_clicks": 8.3
  }
}
```

## Rate Limiting & Quotas

### Google Maps API
- **Free Tier**: 28,500 requests/month ($200 credit)
- **Pipeline Rate**: 100 businesses/hour = 36 seconds/request
- **Daily Max**: 2,400 businesses/day (at 100/hour × 24 hours)
- **Monthly Est**: 72,000 businesses (well within free tier with search limits)

**Cost Beyond Free Tier**: $5 per 1,000 requests

### Facebook Graph API
- **Free Tier**: Unlimited requests with rate limiting
- **Pipeline Rate**: 200 calls/hour = 18 seconds/request
- **Rate Limits**: 200 calls/hour/user, 600/hour/app
- **No Cost**: Facebook API is free for public data

### Hunter.io Email Finder
- **Free Tier**: 25 searches/month
- **Paid**: $49/month for 500 searches
- **Usage**: Optional (only for email enrichment)

**Recommendation**: Run daily automation with Hunter.io disabled, manually enrich high-value leads

## Monitoring & Troubleshooting

### Check API Usage

```bash
# View API usage log
wrangler d1 execute estateflow-db --command="
  SELECT
    api_provider,
    COUNT(*) as total_calls,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
  FROM api_usage
  WHERE created_at >= date('now', '-7 days')
  GROUP BY api_provider
"
```

### View Job History

```bash
# Recent scraping jobs
wrangler d1 execute estateflow-db --command="
  SELECT
    id,
    job_name,
    status,
    total_processed,
    total_success,
    created_at,
    completed_at
  FROM scraping_jobs
  ORDER BY created_at DESC
  LIMIT 10
"
```

### Find High-Value Leads

```bash
# Grade A leads not yet profiled
wrangler d1 execute estateflow-db --command="
  SELECT
    el.business_name,
    el.lead_score,
    icp.icp_score,
    rb.city,
    rb.phone,
    rb.website
  FROM enriched_leads el
  JOIN raw_business_data rb ON el.raw_business_id = rb.id
  JOIN icp_signals icp ON icp.raw_business_id = rb.id
  LEFT JOIN ghost_profiles gp ON gp.enriched_lead_id = el.id
  WHERE el.lead_grade = 'A'
    AND gp.id IS NULL
  ORDER BY el.lead_score DESC
  LIMIT 20
"
```

### Common Issues

**1. "API key not found"**
- Check `.env` file exists in `worktrees/siteforge`
- Verify API key is correct format
- Restart Node process to reload environment

**2. "Rate limit exceeded"**
- Wait for rate limit reset (check `api_usage` table)
- Reduce batch sizes
- Increase request intervals

**3. "No businesses found"**
- Verify search query is specific enough
- Check location spelling
- Try broader radius

**4. "Database error: table not found"**
- Run database migration: `npm run db:migrate`
- Check Wrangler configuration points to correct D1 database

## Best Practices

### 1. Start Small, Scale Gradually
- Test with single searches before daily automation
- Monitor API quotas closely
- Adjust rate limits based on actual needs

### 2. Focus on High-Value Categories
- Prioritize businesses without websites (no_website = TRUE)
- Target mobile businesses (food trucks, service providers)
- Focus on Puerto Rico initially (unmappable addresses)

### 3. Validate Data Quality
- Regularly check ICP detection accuracy
- Manually review sample ghost profiles
- Monitor conversion rates from profile views → claims

### 4. Optimize for Conversions
- A/B test ghost profile descriptions
- Track which ICP signals convert best
- Refine lead scoring weights based on actual conversions

### 5. Respect Rate Limits
- Never disable rate limiting
- Use batch operations during off-hours
- Monitor `api_usage` table for quota alerts

## Next Steps

### Phase 1: Setup & Testing (Week 1)
- [ ] Install dependencies
- [ ] Configure API keys
- [ ] Run database migration
- [ ] Test each component individually
- [ ] Run 5 test searches (different categories/cities)

### Phase 2: Daily Automation (Week 2-3)
- [ ] Schedule daily automation
- [ ] Monitor API usage and costs
- [ ] Review ICP detection accuracy
- [ ] Adjust scoring weights if needed

### Phase 3: Ghost Profile Publishing (Week 4)
- [ ] Review and publish 50 sample profiles
- [ ] Set up claim request handling
- [ ] Monitor profile views and conversions
- [ ] Create claim funnel email sequences

### Phase 4: Scale & Optimize (Month 2+)
- [ ] Expand to new markets (Florida, Texas)
- [ ] Add AI-powered content generation
- [ ] Implement auto-publishing for high-confidence profiles
- [ ] Build sales CRM integration

## Revenue Projections

**Conservative Estimates** (based on 90-day pipeline):

- **Day 1-30**: 1,500 ghost profiles generated
- **Day 31-60**: 3,500 ghost profiles (growing daily automation)
- **Day 61-90**: 5,000 ghost profiles (multiple markets)

**Conversion Assumptions**:
- 2% claim rate (100 claims at 5,000 profiles)
- 50% conversion to paid ($49/month)
- 50 paying customers × $49 = **$2,450/month MRR by Day 90**

**At Scale** (12 months):
- 50,000 ghost profiles
- 1,000 claims (2%)
- 500 paying customers
- **$24,500/month MRR** ($294k ARR)

## Support & Resources

**Documentation**:
- [Database Schema](./UNIFIED_PLATFORM_ARCHITECTURE.md)
- [Multi-Industry Guide](./MULTI_INDUSTRY_IMPLEMENTATION_SUMMARY.md)
- [Deployment Guide](../DEPLOYMENT_INSTRUCTIONS.md)

**API Documentation**:
- [Google Maps Places API](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [Hunter.io API](https://hunter.io/api-documentation)

**Questions?**
- Check D1 database views: `high_value_leads`, `publishable_profiles`
- Review `scraping_jobs` table for job history
- Check logs with `wrangler tail`
