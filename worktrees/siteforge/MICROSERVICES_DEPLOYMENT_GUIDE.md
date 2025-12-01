# EstateFlow Microservices Deployment Guide

Complete guide for deploying the three EstateFlow microservices to Cloudflare Workers.

## Quick Reference

### Services Created
1. **URL Shortener** - `workers/shortener/`
2. **QR Code Generator** - `workers/qr-generator/`
3. **Agent Ingestion** - `workers/agent-ingestion/`

### Deployment Script
- **Location**: `deploy-microservices.ps1`
- **Purpose**: Automated deployment of all services

---

## Pre-Deployment Checklist

### 1. Verify Prerequisites

```powershell
# Check Wrangler CLI
wrangler --version
# Expected: 3.x.x or higher

# Check authentication
wrangler whoami
# Should show your Cloudflare account

# Check Node.js
node --version
# Expected: 18.x.x or 20.x.x
```

### 2. Install Dependencies

```powershell
# For each service
cd workers/shortener
npm install

cd ../qr-generator
npm install

cd ../agent-ingestion
npm install
```

### 3. Create Cloudflare Resources

**Option A: Automated (Recommended)**
```powershell
.\deploy-microservices.ps1 -Service all -SetupResources -DryRun
# Review what will be created

.\deploy-microservices.ps1 -Service all -SetupResources
# Actually create resources
```

**Option B: Manual**

**URL Shortener Resources:**
```powershell
cd workers/shortener

# Create KV namespaces
wrangler kv:namespace create LINKS
wrangler kv:namespace create LINKS --preview
wrangler kv:namespace create ANALYTICS
wrangler kv:namespace create ANALYTICS --preview

# Create D1 database (optional)
wrangler d1 create estateflow-analytics
```

**QR Generator Resources:**
```powershell
cd workers/qr-generator

# Create R2 bucket
wrangler r2 bucket create estateflow-qr-codes

# Create KV namespace
wrangler kv:namespace create QR_CACHE
wrangler kv:namespace create QR_CACHE --preview
```

**Agent Ingestion Resources:**
```powershell
cd workers/agent-ingestion

# Create D1 database
wrangler d1 create estateflow-db

# Run database migrations
wrangler d1 execute estateflow-db --file=../../migrations/003_multi_industry_platform_safe.sql

# Create KV namespace
wrangler kv:namespace create INGESTION_STATUS
wrangler kv:namespace create INGESTION_STATUS --preview

# Create R2 bucket
wrangler r2 bucket create estateflow-imports
```

### 4. Update Configuration Files

After creating resources, you'll receive IDs that need to be added to `wrangler.toml` files.

**Example output when creating KV namespace:**
```
✨ Success!
Add the following to your wrangler.toml:
kv_namespaces = [
  { binding = "LINKS", id = "abc123def456ghi789" }
]
```

**Update each wrangler.toml:**

`workers/shortener/wrangler.toml`:
```toml
kv_namespaces = [
  { binding = "LINKS", id = "YOUR_LINKS_ID", preview_id = "YOUR_LINKS_PREVIEW_ID" },
  { binding = "ANALYTICS", id = "YOUR_ANALYTICS_ID", preview_id = "YOUR_ANALYTICS_PREVIEW_ID" }
]

[[d1_databases]]
binding = "DB"
database_name = "estateflow-analytics"
database_id = "YOUR_DATABASE_ID"
```

`workers/qr-generator/wrangler.toml`:
```toml
[[r2_buckets]]
binding = "QR_STORAGE"
bucket_name = "estateflow-qr-codes"

[[kv_namespaces]]
binding = "QR_CACHE"
id = "YOUR_QR_CACHE_ID"
preview_id = "YOUR_QR_CACHE_PREVIEW_ID"
```

`workers/agent-ingestion/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "estateflow-db"
database_id = "YOUR_DATABASE_ID"

[[kv_namespaces]]
binding = "INGESTION_STATUS"
id = "YOUR_INGESTION_STATUS_ID"
preview_id = "YOUR_INGESTION_STATUS_PREVIEW_ID"

[[r2_buckets]]
binding = "IMPORT_FILES"
bucket_name = "estateflow-imports"
```

### 5. Set Secrets

```powershell
# URL Shortener
cd workers/shortener
wrangler secret put ADMIN_KEY
# Enter a secure random string (e.g., generate with: openssl rand -hex 32)

wrangler secret put POSTHOG_KEY
# Enter your PostHog API key (or leave empty if not using)

# Agent Ingestion
cd ../agent-ingestion
wrangler secret put API_SECRET
# Enter a secure random string for API authentication
```

---

## Deployment Process

### Staging Deployment (Recommended First)

```powershell
# Deploy all services to staging
.\deploy-microservices.ps1 -Service all -Environment staging

# Or deploy individually
.\deploy-microservices.ps1 -Service shortener -Environment staging
.\deploy-microservices.ps1 -Service qr-generator -Environment staging
.\deploy-microservices.ps1 -Service agent-ingestion -Environment staging
```

### Test Staging Deployment

```powershell
# Test URL Shortener
curl https://estateflow-shortener-staging.workers.dev/health

# Test QR Generator
curl https://estateflow-qr-generator-staging.workers.dev/health

# Test Agent Ingestion
curl https://estateflow-agent-ingestion-staging.workers.dev/health
```

### Production Deployment

```powershell
# Deploy all services to production
.\deploy-microservices.ps1 -Service all -Environment production

# Deploy with verbose output
.\deploy-microservices.ps1 -Service all -Environment production -Verbose
```

### Deployment Script Options

```powershell
# View all options
Get-Help .\deploy-microservices.ps1 -Detailed

# Common deployment scenarios:

# 1. Deploy everything to staging with resource setup
.\deploy-microservices.ps1 -Service all -Environment staging -SetupResources

# 2. Deploy only one service
.\deploy-microservices.ps1 -Service agent-ingestion -Environment production

# 3. Dry run (see what would happen)
.\deploy-microservices.ps1 -Service all -Environment production -DryRun

# 4. Skip dependency installation (faster subsequent deploys)
.\deploy-microservices.ps1 -Service all -Environment production -SkipDependencies
```

---

## Post-Deployment Verification

### 1. Health Checks

```powershell
# URL Shortener
Invoke-WebRequest https://estateflow-shortener.workers.dev/health | ConvertFrom-Json

# QR Generator
Invoke-WebRequest https://estateflow-qr-generator.workers.dev/health | ConvertFrom-Json

# Agent Ingestion
Invoke-WebRequest https://estateflow-agent-ingestion.workers.dev/health | ConvertFrom-Json
```

Expected response for all:
```json
{
  "status": "healthy",
  "service": "service-name",
  "timestamp": "2024-11-30T...",
  "database": "connected"  // For services with D1
}
```

### 2. Functional Tests

**URL Shortener:**
```powershell
# Create a short link
$body = @{
  destination = "https://example.com"
  agentId = "test-agent"
  type = "profile"
} | ConvertTo-Json

Invoke-WebRequest -Uri https://estateflow-shortener.workers.dev/api/shorten `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer YOUR_ADMIN_KEY" } `
  -Body $body `
  -ContentType "application/json"
```

**QR Generator:**
```powershell
# Generate QR code
Invoke-WebRequest -Uri "https://estateflow-qr-generator.workers.dev/qr/test123?size=512" `
  -OutFile test-qr.png
```

**Agent Ingestion:**
```powershell
# Test single ingestion
$professional = @{
  industry = "real_estate"
  profession = "agent"
  name = "Test Agent"
  email = "test@example.com"
  phone = "555-123-4567"
  city = "Miami"
  state = "FL"
  zip_code = "33101"
  source = "test"
} | ConvertTo-Json

Invoke-WebRequest -Uri https://estateflow-agent-ingestion.workers.dev/api/ingest/single `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer YOUR_API_SECRET" } `
  -Body $professional `
  -ContentType "application/json"
```

### 3. Monitor Logs

```powershell
# Open separate terminals for each service

# Terminal 1: URL Shortener logs
cd workers/shortener
wrangler tail --format pretty

# Terminal 2: QR Generator logs
cd workers/qr-generator
wrangler tail --format pretty

# Terminal 3: Agent Ingestion logs
cd workers/agent-ingestion
wrangler tail --format pretty
```

---

## Service Integration

### Configure Service Bindings

For services that need to communicate with each other:

**Example: Main Remix app using Shortener**

In `wrangler.toml` (main app):
```toml
[[services]]
binding = "SHORTENER"
service = "estateflow-shortener"
environment = "production"

[[services]]
binding = "QR_GENERATOR"
service = "estateflow-qr-generator"
environment = "production"

[[services]]
binding = "AGENT_INGESTION"
service = "estateflow-agent-ingestion"
environment = "production"
```

In TypeScript (main app):
```typescript
interface Env {
  SHORTENER: Fetcher;
  QR_GENERATOR: Fetcher;
  AGENT_INGESTION: Fetcher;
}

// Use in loader/action
export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.env as Env;

  // Create short link
  const shortLinkResponse = await env.SHORTENER.fetch(
    new Request('https://shortener/api/shorten', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.ADMIN_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination: 'https://estateflow.com/agent/john-smith',
        agentId: 'agent-123',
        type: 'profile',
      }),
    })
  );

  const linkData = await shortLinkResponse.json();

  return json({ shortUrl: linkData.shortUrl });
}
```

---

## Monitoring & Maintenance

### Cloudflare Dashboard

1. Navigate to https://dash.cloudflare.com/
2. Select your account
3. Go to **Workers & Pages**
4. View deployed workers

For each service, you can:
- View request analytics
- Check error rates
- Monitor CPU usage
- Review logs

### Metrics to Monitor

**URL Shortener:**
- Requests per second
- Redirect latency (should be < 10ms)
- KV hit rate (should be > 99%)
- 404 rate (invalid slugs)

**QR Generator:**
- Generation time (first request: < 500ms)
- Cache hit rate (should be > 95%)
- R2 storage usage
- Error rate

**Agent Ingestion:**
- Batch processing time
- Validation error rate
- D1 write rate (monitor quota)
- Failed imports

### Set Up Alerts

In Cloudflare Dashboard:
1. Go to Notifications
2. Create alerts for:
   - High error rates (> 5%)
   - Increased latency (> 1 second)
   - Quota approaching limits
   - Service downtime

---

## Troubleshooting

### Common Issues

**Issue: "Resource not found" error**
```
Solution: Verify resource IDs in wrangler.toml match created resources
Check with: wrangler kv:namespace list, wrangler d1 list, wrangler r2 bucket list
```

**Issue: "Unauthorized" when calling API**
```
Solution: Check that secrets are set correctly
Verify with: wrangler secret list
Reset secret: wrangler secret put SECRET_NAME
```

**Issue: Service binding not working**
```
Solution:
1. Verify service name in wrangler.toml matches deployed service
2. Check environment matches (production vs staging)
3. Ensure dependent service is deployed first
```

**Issue: D1 migrations fail**
```
Solution:
1. Check migration SQL syntax
2. Verify database exists: wrangler d1 list
3. Run migrations manually: wrangler d1 execute DB_NAME --file=migration.sql
```

### Recovery Procedures

**Rollback a Service:**
```powershell
# View recent deployments
wrangler deployments list --name estateflow-shortener

# Rollback to previous version
wrangler rollback --message "Rollback due to errors"
```

**Restore from Backup:**
```powershell
# For D1 database
wrangler d1 execute estateflow-db --file=backup-YYYYMMDD.sql

# For R2 data
# Use Cloudflare Dashboard or rclone to restore
```

---

## Performance Optimization

### URL Shortener
- **Target**: < 10ms redirect latency
- **Optimization**: KV is already optimized, ensure minimal logic before redirect

### QR Generator
- **Target**: < 50ms for cached requests, < 500ms for generation
- **Optimization**:
  - Increase KV TTL for popular QR codes
  - Pre-generate QR codes for common sizes
  - Use R2 CDN caching headers

### Agent Ingestion
- **Target**: < 100ms per record, < 5s per 1000 records
- **Optimization**:
  - Batch records into groups of 100 for D1
  - Use transactions for atomic operations
  - Process large imports during off-peak hours

---

## Cost Management

### Monitor Usage

```powershell
# Check D1 usage
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM professionals"

# Check R2 storage
wrangler r2 bucket list

# View worker analytics in dashboard
```

### Optimize Costs

1. **KV Operations**: Included in Workers plan, no additional cost
2. **D1 Queries**: Monitor write rate (100k/day free tier)
3. **R2 Storage**: $0.015/GB/month - compress QR codes if needed
4. **Worker Requests**: 10M requests/month on paid plan ($5/month per worker)

**Estimated Monthly Cost:**
- Workers (3 services): $15/month
- D1: $5/month (moderate usage)
- R2: $3/month (QR codes + imports)
- **Total: ~$25/month**

---

## Security Checklist

- [ ] All secrets set via `wrangler secret` (not in wrangler.toml)
- [ ] API endpoints require authentication
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] CORS configured for production origins only
- [ ] No sensitive data in logs
- [ ] Regular security updates (npm audit)

---

## Deployment Checklist

### First-Time Deployment

- [ ] Prerequisites installed (Wrangler, Node.js)
- [ ] Authenticated with Cloudflare
- [ ] Resources created (KV, D1, R2)
- [ ] wrangler.toml updated with resource IDs
- [ ] Secrets configured
- [ ] Dependencies installed
- [ ] Deployed to staging
- [ ] Staging tests passed
- [ ] Deployed to production
- [ ] Production health checks passed
- [ ] Monitoring configured
- [ ] Alerts set up

### Subsequent Deployments

- [ ] Code changes tested locally
- [ ] TypeScript compilation passed
- [ ] Deployed to staging
- [ ] Staging tests passed
- [ ] Deployed to production
- [ ] Health checks passed
- [ ] Monitored for 15 minutes post-deployment

---

## Next Steps

After successful deployment:

1. **Integrate with Main App**: Add service bindings to main Remix app
2. **Set Up Monitoring**: Configure Cloudflare alerts
3. **Performance Testing**: Load test each service
4. **Documentation**: Update API documentation with actual URLs
5. **Training**: Train team on using the services

---

## Support & Resources

- **Service READMEs**: See individual service directories
- **Deployment Script Help**: `Get-Help .\deploy-microservices.ps1`
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/

---

## Appendix: Complete Deployment Commands

```powershell
# Full deployment from scratch

# 1. Setup
wrangler login
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge

# 2. Install dependencies (all services)
cd workers/shortener && npm install && cd ../..
cd workers/qr-generator && npm install && cd ../..
cd workers/agent-ingestion && npm install && cd ../..

# 3. Create resources and deploy (automated)
.\deploy-microservices.ps1 -Service all -Environment staging -SetupResources

# 4. Set secrets
cd workers/shortener
wrangler secret put ADMIN_KEY
wrangler secret put POSTHOG_KEY

cd ../agent-ingestion
wrangler secret put API_SECRET

cd ../..

# 5. Test staging
curl https://estateflow-shortener-staging.workers.dev/health
curl https://estateflow-qr-generator-staging.workers.dev/health
curl https://estateflow-agent-ingestion-staging.workers.dev/health

# 6. Deploy to production
.\deploy-microservices.ps1 -Service all -Environment production

# 7. Verify production
curl https://estateflow-shortener.workers.dev/health
curl https://estateflow-qr-generator.workers.dev/health
curl https://estateflow-agent-ingestion.workers.dev/health
```

---

**Deployment Complete!** 🎉

Your EstateFlow microservices are now running on Cloudflare's global network.
