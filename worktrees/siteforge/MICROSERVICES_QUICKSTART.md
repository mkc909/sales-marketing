# EstateFlow Microservices - Quick Start Guide

Get the three microservices up and running in under 10 minutes.

## Prerequisites

```powershell
# Verify you have everything installed
wrangler --version  # Should be 3.x.x+
node --version      # Should be 18.x.x or 20.x.x+
wrangler whoami     # Should show your Cloudflare account
```

If missing, install:
- **Wrangler**: `npm install -g wrangler`
- **Node.js**: https://nodejs.org/ (LTS version)
- **Authenticate**: `wrangler login`

## Fast Track Deployment

### Step 1: Install Dependencies (2 minutes)

```powershell
cd workers/shortener && npm install && cd ../..
cd workers/qr-generator && npm install && cd ../..
cd workers/agent-ingestion && npm install && cd ../..
```

### Step 2: Deploy to Staging (3 minutes)

```powershell
# This creates all resources and deploys all services
.\deploy-microservices.ps1 -Service all -Environment staging -SetupResources
```

This single command will:
- Create all KV namespaces
- Create D1 databases
- Create R2 buckets
- Deploy all three services
- Run health checks

### Step 3: Set Secrets (2 minutes)

```powershell
# URL Shortener secrets
cd workers/shortener
wrangler secret put ADMIN_KEY
# Enter: admin-key-staging-123

wrangler secret put POSTHOG_KEY
# Press Enter to skip (optional)

# Agent Ingestion secrets
cd ../agent-ingestion
wrangler secret put API_SECRET
# Enter: api-secret-staging-456

cd ../..
```

### Step 4: Test Everything (1 minute)

```powershell
# Test all health endpoints
curl https://estateflow-shortener-staging.workers.dev/health
curl https://estateflow-qr-generator-staging.workers.dev/health
curl https://estateflow-agent-ingestion-staging.workers.dev/health
```

Expected output for each:
```json
{
  "status": "healthy",
  "service": "...",
  "timestamp": "..."
}
```

### Step 5: Update Resource IDs (2 minutes)

The deployment script will show you the resource IDs created. Update the `wrangler.toml` files:

```powershell
# Get IDs
wrangler kv:namespace list
wrangler d1 list
wrangler r2 bucket list

# Edit each wrangler.toml and replace YOUR_*_ID placeholders
```

**Files to update:**
- `workers/shortener/wrangler.toml`
- `workers/qr-generator/wrangler.toml`
- `workers/agent-ingestion/wrangler.toml`

## Verify It's Working

### Test URL Shortener

```powershell
# Create a short link
$body = @{
  destination = "https://example.com"
  agentId = "test-123"
  type = "profile"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://estateflow-shortener-staging.workers.dev/api/shorten" `
  -Method POST `
  -Headers @{"Authorization"="Bearer admin-key-staging-123"} `
  -Body $body `
  -ContentType "application/json"
```

Expected: `{ "slug": "abc123", "shortUrl": "https://est.at/abc123", ... }`

### Test QR Generator

```powershell
# Generate QR code
curl "https://estateflow-qr-generator-staging.workers.dev/qr/test123?size=512" -o test-qr.png
```

Expected: A PNG file downloaded

### Test Agent Ingestion

```powershell
# Ingest a test agent
$agent = @{
  industry = "real_estate"
  profession = "agent"
  name = "Test Agent"
  email = "test@example.com"
  phone = "555-123-4567"
  city = "Miami"
  state = "FL"
  zip_code = "33101"
  source = "quickstart-test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://estateflow-agent-ingestion-staging.workers.dev/api/ingest/single" `
  -Method POST `
  -Headers @{"Authorization"="Bearer api-secret-staging-456"} `
  -Body $agent `
  -ContentType "application/json"
```

Expected: `{ "success": true, "inserted": true, ... }`

## Production Deployment

Once staging is working:

```powershell
# 1. Deploy to production
.\deploy-microservices.ps1 -Service all -Environment production

# 2. Set production secrets (use different, secure values!)
cd workers/shortener
wrangler secret put ADMIN_KEY --env production
wrangler secret put POSTHOG_KEY --env production

cd ../agent-ingestion
wrangler secret put API_SECRET --env production

# 3. Test production
curl https://estateflow-shortener.workers.dev/health
curl https://estateflow-qr-generator.workers.dev/health
curl https://estateflow-agent-ingestion.workers.dev/health
```

## Common Commands

```powershell
# View logs (open in separate terminals)
cd workers/shortener && wrangler tail --format pretty
cd workers/qr-generator && wrangler tail --format pretty
cd workers/agent-ingestion && wrangler tail --format pretty

# Redeploy a single service
cd workers/shortener && npm run deploy:staging

# Update and redeploy all
.\deploy-microservices.ps1 -Service all -Environment staging -SkipDependencies
```

## What's Next?

1. **Integrate with Main App**: Add service bindings to your main Remix app
2. **Import Real Data**: Use agent-ingestion to import professional data
3. **Create QR Codes**: Generate QR codes for yard signs and marketing
4. **Monitor Performance**: Set up Cloudflare alerts

## Need Help?

- **Full Guide**: See `MICROSERVICES_DEPLOYMENT_GUIDE.md`
- **Service Docs**: See `workers/README.md` and individual service READMEs
- **Architecture**: See `workers/{service}/README.md` for API docs

## Troubleshooting

**Deployment fails with "resource not found":**
```powershell
# Resources need to be created first
.\deploy-microservices.ps1 -Service all -Environment staging -SetupResources
```

**Health check returns 500:**
```powershell
# Check logs for errors
cd workers/{service}
wrangler tail --format pretty
```

**"Unauthorized" errors:**
```powershell
# Verify secrets are set
wrangler secret list

# Reset if needed
wrangler secret put SECRET_NAME
```

---

**You're all set!** 🚀 Your EstateFlow microservices are deployed and ready to use.
