# Test Data Generation for ProGeoData

This directory contains comprehensive test data generation and import tools for the ProGeoData multi-industry platform.

## Overview

The test data generator creates realistic professional data across **6 industries**:
- **Real Estate**: Agents, Brokers
- **Legal**: Attorneys, Paralegals
- **Insurance**: Agents, Brokers
- **Mortgage**: Loan Officers, Brokers
- **Financial**: Advisors, Planners
- **Contractor**: General Contractors, Electricians, Plumbers, HVAC

## Quick Start

### 1. Generate Test Data

```bash
npm run generate-data
```

This creates 4 SQL files in the `data/` directory:
- `test-10.sql` - 10 records (for testing)
- `small-100.sql` - 100 records (small batch)
- `medium-1000.sql` - 1,000 records (medium batch)
- `large-10000.sql` - 10,000 records (large batch)

### 2. Progressive Import Testing

**ALWAYS follow this sequence - never skip stages!**

```bash
# Stage 1: Test import (10 records)
npm run import:test

# Verify results
npm run import:verify

# Stage 2: Small batch (100 records)
npm run import:small

# Stage 3: Medium batch (1,000 records)
npm run import:medium

# Stage 4: Large batch (10,000 records)
npm run import:large

# Verify final results
npm run import:verify
```

## Data Quality

### Realistic Data Features

**Names**: Diverse first and last names representing American demographics
**Companies**: Real company names for each industry (Keller Williams, State Farm, etc.)
**Licenses**: Proper format license numbers with state prefixes
**Locations**: Real cities across Florida, Texas, and California
**Specializations**: Industry-appropriate specializations (20+ per industry)
**Certifications**: Professional certifications (CRS, CFP, etc.)

### Geographic Distribution

**States**: FL, TX, CA
**Cities per state**: 15 major metropolitan areas
**Example cities**:
- Florida: Miami, Orlando, Tampa, Jacksonville, Naples
- Texas: Houston, Dallas, Austin, San Antonio, Plano
- California: Los Angeles, San Diego, San Francisco, San Jose

### Industry-Specific Data

#### Real Estate
- Companies: Keller Williams, RE/MAX, Coldwell Banker, Compass
- Specializations: Luxury Homes, Waterfront Properties, First-Time Buyers
- License: RE-FL-123456 format

#### Legal
- Companies: Morgan & Morgan, Greenberg Traurig, Holland & Knight
- Specializations: Personal Injury, Family Law, Corporate Law
- License: BAR-TX-123456 format

#### Insurance
- Companies: State Farm, Allstate, Progressive, Liberty Mutual
- Specializations: Auto, Home, Life, Business Insurance
- License: INS-CA-123456 format

#### Mortgage
- Companies: Quicken Loans, Wells Fargo, Chase Home Lending
- Specializations: FHA, VA, Conventional, Jumbo Loans
- License: NMLS-FL-123456 format

#### Financial
- Companies: Edward Jones, Morgan Stanley, Merrill Lynch
- Specializations: Retirement Planning, Wealth Management
- License: CFP-TX-123456 format

#### Contractor
- Companies: ABC Contractors, BuildRight Construction
- Specializations: Residential, Commercial, Remodeling, HVAC
- License: CL-CA-123456 format

## Generated Fields

Each professional record includes:

```javascript
{
  id: 1,
  slug: "john-smith-1",
  first_name: "John",
  last_name: "Smith",
  industry: "real_estate",
  profession: "agent",
  company: "Keller Williams Realty",
  license_number: "RE-FL-482951",
  license_state: "FL",
  years_experience: 12,
  specializations: ["Residential Sales", "Luxury Homes"],
  certifications: ["CRS - Certified Residential Specialist"],
  phone: "(305) 555-1234",
  email: "john.smith@kellerwilliams.com",
  website: "https://www.kellerwilliams.com",
  address: "1234 Main St",
  city: "Miami",
  state: "FL",
  zip_code: "33101",
  county: "Miami-Dade",
  service_regions: ["Miami", "Fort Lauderdale", "West Palm Beach"],
  bio: "John is a dedicated agent with 12 years of experience...",
  rating: 4.7,
  review_count: 89,
  languages: ["English", "Spanish"],
  verified: true,
  featured: false,
  active: true,
  created_at: "2025-11-30T...",
  updated_at: "2025-11-30T..."
}
```

## Import Process

### How It Works

1. **Pre-Import Checks**:
   - Query current database record count
   - Create backup of existing data
   - Validate SQL file exists

2. **Import Execution**:
   - Execute SQL file via Wrangler D1 CLI
   - Track import duration
   - Monitor for errors

3. **Verification**:
   - Query post-import record count
   - Compare expected vs. actual imported records
   - Analyze industry distribution
   - Check data quality (emails, phones, etc.)

4. **Logging**:
   - All imports logged to `import-log.json`
   - Backup information tracked
   - Import success/failure recorded

### Safety Features

- **Progressive Testing**: Start with 10 records, scale up gradually
- **Automatic Backups**: Database exported before each import
- **Verification**: Count validation after import
- **Rollback Support**: Instructions for manual rollback
- **Dry-Run Support**: (Future enhancement)

## Troubleshooting

### Import Count Mismatch

If imported count doesn't match expected:

```bash
# Check current database state
npm run import:verify

# Rollback if needed (shows instructions)
npm run import:rollback
```

### Database Quota Exceeded

D1 free tier limits:
- 100,000 rows written per day
- 5 GB total storage

**Solution**: Use smaller batches or wait for quota reset

### Wrangler Authentication

If you see auth errors:

```bash
wrangler login
```

### Missing Database

If database doesn't exist:

```bash
# Create database
wrangler d1 create estateflow-db

# Update wrangler.toml with database_id

# Run migrations
npm run db:migrate
```

## File Structure

```
scripts/
├── generate-test-data.js    # Main generator script
├── import-data.js            # Progressive import tool
└── README-DATA-GENERATION.md # This file

data/
├── test-10.sql               # 10 test records
├── small-100.sql             # 100 records
├── medium-1000.sql           # 1,000 records
└── large-10000.sql           # 10,000 records

backups/
└── backup-*.sql              # Automatic backups

import-log.json               # Import history and tracking
```

## Best Practices

### DO:
- ✅ Always start with `npm run import:test`
- ✅ Verify each import level before proceeding
- ✅ Review generated SQL files before importing
- ✅ Monitor database quota usage
- ✅ Keep backups of production data

### DON'T:
- ❌ Skip progressive testing stages
- ❌ Import large datasets without testing
- ❌ Ignore verification failures
- ❌ Delete backups before verifying success
- ❌ Run imports during production traffic

## Advanced Usage

### Custom Data Generation

Modify `generate-test-data.js` to customize:
- Industry distribution
- Geographic distribution
- Name diversity
- Company selection
- Specialization frequency

### Direct Database Access

```bash
# Query professionals
wrangler d1 execute estateflow-db --command="SELECT * FROM professionals LIMIT 10;"

# Check industry distribution
wrangler d1 execute estateflow-db --command="SELECT industry, COUNT(*) FROM professionals GROUP BY industry;"

# Find by state
wrangler d1 execute estateflow-db --command="SELECT * FROM professionals WHERE state='FL' LIMIT 5;"

# Search by city
wrangler d1 execute estateflow-db --command="SELECT * FROM professionals WHERE city='Miami' LIMIT 10;"
```

### Performance Testing

```bash
# Check import performance
npm run import:medium
# Note duration and optimize if needed

# Monitor database size
wrangler d1 info estateflow-db
```

## Next Steps After Import

1. **Test API Endpoints**:
   ```bash
   npm run smoke-test
   ```

2. **Verify Search Functionality**:
   - Test professional search by industry
   - Test location-based search
   - Test specialization filters

3. **Check Application**:
   ```bash
   npm run dev
   # Visit http://localhost:8788
   ```

4. **Deploy to Production**:
   ```bash
   npm run build
   npm run deploy
   ```

## Support

For issues or questions:
1. Check `import-log.json` for error details
2. Review Wrangler logs
3. Verify database schema matches migration files
4. Check D1 quota limits in Cloudflare dashboard

## License

Internal use only - ProGeoData platform
