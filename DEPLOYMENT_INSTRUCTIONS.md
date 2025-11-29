# 🚀 EstateFlow Multi-Industry Platform - Deployment Instructions

## Prerequisites

Before deploying, ensure you have:
- [ ] Node.js 18+ installed
- [ ] npm 8+ installed
- [ ] A Cloudflare account
- [ ] Your Cloudflare Account ID ready

## Quick Deploy (Windows)

Open PowerShell as Administrator and run:

```powershell
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge
.\deploy.ps1
```

## Manual Deployment Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```
This will open your browser for authentication.

### 3. Get Your Account ID

```bash
wrangler whoami
```
Copy your Account ID from the output.

### 4. Update wrangler.toml

Edit `wrangler.toml` and replace:
- `YOUR_ACCOUNT_ID` with your actual Cloudflare account ID

### 5. Create D1 Database

```bash
wrangler d1 create estateflow-db
```

Copy the database ID from the output and update it in `wrangler.toml`:
- Replace `YOUR_DATABASE_ID` with the actual database ID

### 6. Run Database Migrations

```bash
# Run all migrations in order
wrangler d1 execute estateflow-db --file=migrations/001_initial_schema.sql
wrangler d1 execute estateflow-db --file=migrations/002_agent_profile_v2.sql
wrangler d1 execute estateflow-db --file=migrations/003_multi_industry_platform.sql
```

### 7. Create KV Namespaces

```bash
# Create KV namespaces
wrangler kv:namespace create "LINKS"
wrangler kv:namespace create "PINS"
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "ANALYTICS_BUFFER"
```

Update the IDs in `wrangler.toml` with the output from each command.

### 8. Create R2 Buckets

```bash
wrangler r2 bucket create profile-photos
wrangler r2 bucket create property-images
wrangler r2 bucket create documents
wrangler r2 bucket create qr-codes
wrangler r2 bucket create estateflow-assets
```

### 9. Set Secrets

```bash
# PostHog API Key (optional)
wrangler secret put POSTHOG_KEY

# Alert Webhook URL (optional, for Slack/Discord alerts)
wrangler secret put ALERT_WEBHOOK_URL

# GitHub Token (optional, for data import)
wrangler secret put GITHUB_TOKEN

# Mapbox Token (optional, for map features)
wrangler secret put MAPBOX_TOKEN
```

### 10. Build and Deploy

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Deploy to Cloudflare
wrangler deploy
```

### 11. Deploy Additional Workers

Deploy the URL shortener:
```bash
cd workers/shortener
npm install
wrangler deploy
cd ../..
```

Deploy the QR generator:
```bash
cd workers/qr-generator
npm install
wrangler deploy
cd ../..
```

Deploy the agent ingestion worker:
```bash
cd workers/agent-ingestion
npm install
wrangler deploy
cd ../..
```

## Verify Deployment

### Check Application Health

```bash
# Test the main application (replace with your worker URL)
curl https://estateflow.workers.dev/health

# Or if you have a custom domain
curl https://estateflow.com/health
```

### Check Database

```bash
# Verify tables were created
wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check if professionals table exists
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM professionals;"
```

### Monitor Errors (Real-time)

```bash
# Watch for errors in real-time
wrangler tail --format pretty

# Filter for errors only
wrangler tail --format pretty | grep ERROR
```

## Import Initial Data

### Import Florida Real Estate Agents

1. Download the Florida license data:
```bash
curl "https://www.myfloridalicense.com/datadownload/downloadRE.asp" -o fl_agents.csv
```

2. Create an import script:
```javascript
// scripts/import-fl-agents.js
const fs = require('fs');
const csv = require('csv-parse/sync');

const data = fs.readFileSync('fl_agents.csv', 'utf-8');
const records = csv.parse(data, { columns: true });

// Process and import to D1
// Use wrangler d1 execute commands or API
```

3. Run the import:
```bash
node scripts/import-fl-agents.js
```

### Import Texas Real Estate Agents

Similar process for Texas data from TREC.

## Monitoring Commands

### Real-time Error Monitoring
```bash
# Windows PowerShell
.\monitor.ps1

# Or directly with wrangler
wrangler tail --format pretty
```

### Check Platform Status
```bash
# Windows PowerShell
.\status.ps1
```

### View Error Statistics
```bash
wrangler d1 execute estateflow-db --command="
  SELECT
    level,
    category,
    COUNT(*) as count
  FROM error_logs
  WHERE timestamp > strftime('%s','now') - 86400
  GROUP BY level, category
  ORDER BY count DESC;
"
```

### View Professional Statistics
```bash
wrangler d1 execute estateflow-db --command="
  SELECT
    industry,
    COUNT(*) as total,
    SUM(CASE WHEN subscription_tier != 'ghost' THEN 1 ELSE 0 END) as paid
  FROM professionals
  GROUP BY industry;
"
```

## Troubleshooting

### "D1 database not found"
Make sure you created the database and updated the ID in wrangler.toml

### "KV namespace binding not found"
Create the KV namespace and update the ID in wrangler.toml

### "Build failed"
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Authentication required"
```bash
wrangler login
```

### "Rate limit exceeded"
Wait a few minutes or upgrade your Cloudflare plan

## Production Checklist

Before going live:

- [ ] Change `SESSION_SECRET` in wrangler.toml
- [ ] Set up custom domain in Cloudflare dashboard
- [ ] Configure PostHog for analytics
- [ ] Set up alert webhook for critical errors
- [ ] Import initial professional data
- [ ] Test all critical paths
- [ ] Set up monitoring
- [ ] Document API endpoints
- [ ] Create backup strategy
- [ ] Configure rate limiting

## Support Resources

- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Wrangler Documentation**: https://developers.cloudflare.com/workers/wrangler/
- **D1 Documentation**: https://developers.cloudflare.com/d1/
- **Platform Documentation**: See `/docs` folder

## Next Steps After Deployment

1. **Configure Custom Domains**
   - Add estateflow.com to your Cloudflare zone
   - Add pinexacto.com for Puerto Rico
   - Add truepoint.app for US market
   - Add est.at for URL shortener

2. **Import Professional Data**
   - Start with Florida real estate agents
   - Add Texas real estate agents
   - Import attorney licenses
   - Import insurance agent data

3. **Set Up Monitoring**
   - Configure PostHog dashboards
   - Set up error alerts
   - Create performance monitoring
   - Set up uptime monitoring

4. **Launch Marketing**
   - Create landing pages for each industry
   - Set up Google Analytics
   - Configure SEO
   - Launch paid campaigns

## Contact

For deployment support, consult the Cloudflare Workers Discord or documentation.