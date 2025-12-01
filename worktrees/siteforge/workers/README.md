# EstateFlow Microservices Architecture

This directory contains three independently deployable Cloudflare Workers microservices that power the EstateFlow platform.

## Overview

### 1. URL Shortener Service (`shortener/`)
**Purpose**: Manages short links under the `est.at` domain for QR codes and marketing.

**Key Features:**
- 6-character short codes
- Click analytics tracking
- Multiple link types (profile, QR, listing, calendar)
- Fast KV-based resolution

**Use Cases:**
- QR codes on physical yard signs
- Business card links
- Social media bio links
- Marketing campaign tracking

### 2. QR Code Generator Service (`qr-generator/`)
**Purpose**: Generates and caches QR codes in multiple formats and sizes.

**Key Features:**
- PNG and SVG output formats
- Customizable sizes (128px - 2000px)
- Error correction levels (L, M, Q, H)
- R2 storage with KV caching
- Service binding to URL shortener

**Use Cases:**
- Physical yard sign QR codes
- Business card QR codes
- Print marketing materials
- Digital marketing assets

### 3. Agent Ingestion Service (`agent-ingestion/`)
**Purpose**: Processes and ingests professional data from multiple sources.

**Key Features:**
- Multi-source ingestion (CSV, JSON, API)
- Data validation and normalization
- Duplicate detection
- Batch processing with rate limiting
- Progress tracking

**Use Cases:**
- Importing agent databases
- API integrations with third-party systems
- Data migration from legacy systems
- Ongoing data synchronization

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     EstateFlow Platform                      │
│                    (Main Remix App)                          │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Service Bindings
             │
    ┌────────┼────────┬────────────────────────────────────┐
    │        │        │                                    │
    ▼        ▼        ▼                                    ▼
┌────────┐ ┌────────────┐ ┌─────────────────┐  ┌──────────────┐
│  URL   │ │    QR      │ │     Agent       │  │   Future     │
│Shortener│ │ Generator  │ │   Ingestion     │  │  Services    │
└───┬────┘ └─────┬──────┘ └────────┬────────┘  └──────────────┘
    │            │                  │
    ▼            ▼                  ▼
┌────────┐  ┌────────┐      ┌────────┐
│   KV   │  │   R2   │      │   D1   │
│ LINKS  │  │   QR   │      │  DB    │
└────────┘  └────────┘      └────────┘
```

## Service Dependencies

- **URL Shortener**: Standalone (no dependencies)
- **QR Generator**: Depends on URL Shortener (via service binding)
- **Agent Ingestion**: Standalone (no dependencies)

## Quick Start

### Deploy All Services

```bash
# From the siteforge directory
.\deploy-microservices.ps1 -Service all -Environment staging

# Deploy to production
.\deploy-microservices.ps1 -Service all -Environment production -SetupResources
```

### Deploy Individual Service

```bash
# Deploy only URL shortener
.\deploy-microservices.ps1 -Service shortener -Environment production

# Deploy QR generator with resource setup
.\deploy-microservices.ps1 -Service qr-generator -Environment staging -SetupResources
```

### Development

Each service has its own development environment:

```bash
# URL Shortener
cd workers/shortener
npm install
npm run dev

# QR Generator
cd workers/qr-generator
npm install
npm run dev

# Agent Ingestion
cd workers/agent-ingestion
npm install
npm run dev
```

## Resource Requirements

### URL Shortener
- ✓ KV Namespace: `LINKS` (link storage)
- ✓ KV Namespace: `ANALYTICS` (click tracking)
- ✓ D1 Database: `estateflow-analytics` (optional)

### QR Generator
- ✓ R2 Bucket: `estateflow-qr-codes` (QR code storage)
- ✓ KV Namespace: `QR_CACHE` (caching)
- ✓ Service Binding: `SHORTENER` (link validation)

### Agent Ingestion
- ✓ D1 Database: `estateflow-db` (professional data)
- ✓ KV Namespace: `INGESTION_STATUS` (batch tracking)
- ✓ R2 Bucket: `estateflow-imports` (file archival)

## Setup Instructions

### 1. Prerequisites

```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Setup Resources

**Option A: Automated (Recommended)**
```bash
.\deploy-microservices.ps1 -Service all -SetupResources -DryRun
```

**Option B: Manual**
```bash
# For each service
cd workers/{service-name}
npm run setup  # or individual commands: kv:create, d1:create, r2:create
```

### 3. Configure Secrets

```bash
# URL Shortener
cd workers/shortener
wrangler secret put ADMIN_KEY
wrangler secret put POSTHOG_KEY

# Agent Ingestion
cd workers/agent-ingestion
wrangler secret put API_SECRET
```

### 4. Update Resource IDs

After creating resources, update each service's `wrangler.toml` with actual IDs:

```toml
# Example: workers/shortener/wrangler.toml
[[kv_namespaces]]
binding = "LINKS"
id = "YOUR_KV_NAMESPACE_ID_HERE"  # ← Update this
```

Get IDs from:
```bash
wrangler kv:namespace list
wrangler d1 list
wrangler r2 bucket list
```

### 5. Deploy

```bash
# Deploy all services to staging
.\deploy-microservices.ps1 -Service all -Environment staging

# After testing, deploy to production
.\deploy-microservices.ps1 -Service all -Environment production
```

## Monitoring

### Health Checks

```bash
# Check service health
curl https://estateflow-shortener.workers.dev/health
curl https://estateflow-qr-generator.workers.dev/health
curl https://estateflow-agent-ingestion.workers.dev/health
```

### Tail Logs

```bash
# URL Shortener
cd workers/shortener
npm run tail:production

# QR Generator
cd workers/qr-generator
npm run tail:production

# Agent Ingestion
cd workers/agent-ingestion
npm run tail:production
```

### Cloudflare Dashboard

Monitor all services at: https://dash.cloudflare.com/

- **Workers & Pages** → View request analytics
- **D1** → Query databases
- **KV** → Inspect key-value stores
- **R2** → Browse object storage

## Service Bindings

### Using Shortener from Another Service

```typescript
// In another Worker's wrangler.toml
[[services]]
binding = "SHORTENER"
service = "estateflow-shortener"
environment = "production"

// In code
interface Env {
  SHORTENER: Fetcher;
}

export default {
  async fetch(request: Request, env: Env) {
    // Create short link
    const response = await env.SHORTENER.fetch(
      new Request('https://shortener/api/shorten', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.ADMIN_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: 'https://example.com',
          agentId: 'agent-123',
          type: 'profile',
        }),
      })
    );

    const data = await response.json();
    return new Response(JSON.stringify(data));
  }
}
```

## API Documentation

### URL Shortener API
- `POST /api/shorten` - Create short link
- `GET /api/stats/{slug}` - Get link analytics
- `DELETE /api/link/{slug}` - Delete short link
- See [shortener/README.md](./shortener/README.md) for full API docs

### QR Generator API
- `GET /qr/{slug}?size=512&format=png&level=M` - Generate QR code
- `POST /api/generate` - Generate custom QR code
- See [qr-generator/README.md](./qr-generator/README.md) for full API docs

### Agent Ingestion API
- `POST /api/ingest/batch` - Batch ingest professionals
- `POST /api/ingest/single` - Ingest single professional
- `POST /api/ingest/csv` - Upload CSV file
- `GET /api/status` - Get ingestion statistics
- See [agent-ingestion/README.md](./agent-ingestion/README.md) for full API docs

## Common Tasks

### Add New Service Binding

1. **Update dependent service's wrangler.toml:**
```toml
[[services]]
binding = "NEW_SERVICE"
service = "estateflow-new-service"
environment = "production"
```

2. **Update TypeScript types:**
```typescript
interface Env {
  NEW_SERVICE: Fetcher;
}
```

3. **Use in code:**
```typescript
const response = await env.NEW_SERVICE.fetch(request);
```

### Update All Services

```bash
# Pull latest code
git pull

# Deploy all services
.\deploy-microservices.ps1 -Service all -Environment production
```

### Rollback a Service

```bash
# View deployments
wrangler deployments list --name estateflow-shortener

# Rollback to previous deployment
wrangler rollback --message "Rollback due to errors"
```

## Testing

### Local Testing

```bash
cd workers/{service-name}
npm run dev
```

Then use tools like `curl` or Postman to test endpoints:

```bash
# Test shortener
curl http://localhost:8787/health

# Test QR generator
curl http://localhost:8787/qr/test123 > test.png

# Test ingestion
curl -X POST http://localhost:8787/api/ingest/single \
  -H "Authorization: Bearer dev-secret" \
  -H "Content-Type: application/json" \
  -d '{"industry":"real_estate",...}'
```

### Staging Testing

```bash
# Deploy to staging
.\deploy-microservices.ps1 -Service all -Environment staging

# Test staging endpoints
curl https://estateflow-shortener-staging.workers.dev/health
```

## Performance Optimization

### URL Shortener
- KV reads: < 5ms
- Redirects: < 10ms globally
- Analytics: Fire-and-forget (no blocking)

### QR Generator
- First generation: 100-500ms (includes R2 upload)
- Cached requests: < 50ms (KV + R2 CDN)
- Cache hit rate: ~95% after warmup

### Agent Ingestion
- Single record: < 50ms
- Batch 100 records: ~500ms
- Batch 1000 records: ~3-5 seconds
- CSV upload: Variable (depends on file size)

## Cost Estimation

Based on Cloudflare Workers pricing (as of 2024):

### Free Tier
- 100,000 requests/day per service
- 10ms CPU time per request
- 25 GB D1 storage
- 10 GB R2 storage
- Unlimited KV reads

### Paid Tier ($5/month)
- 10M requests/month per service
- 50ms CPU time per request
- Additional storage billed separately

**Estimated Monthly Cost for EstateFlow:**
- Workers: $15 (3 services)
- D1: ~$5 (storage + queries)
- R2: ~$3 (storage + operations)
- KV: Included
- **Total: ~$25/month** for moderate traffic

## Troubleshooting

### Service Won't Deploy
```bash
# Check wrangler authentication
wrangler whoami

# Verify wrangler.toml syntax
wrangler publish --dry-run

# Check for missing bindings
wrangler kv:namespace list
wrangler d1 list
wrangler r2 bucket list
```

### Service Returns 500 Errors
```bash
# Tail logs to see errors
wrangler tail --format pretty

# Check database connection
wrangler d1 execute estateflow-db --command="SELECT 1"

# Verify KV namespace exists
wrangler kv:key get --namespace-id=YOUR_ID "test-key"
```

### High Latency
- Check Cloudflare Analytics for request distribution
- Verify KV/R2 caching is working
- Review CPU time usage
- Consider adding caching headers

## Migration Guide

### Updating Database Schema

```bash
# Create migration file
cd workers/agent-ingestion
echo "ALTER TABLE professionals ADD COLUMN new_field TEXT;" > migration.sql

# Run migration
wrangler d1 execute estateflow-db --file=migration.sql --env production
```

### Changing Service Names

1. Update `wrangler.toml` name field
2. Update service bindings in dependent services
3. Deploy dependent services first
4. Deploy renamed service
5. Update DNS/routing if applicable

## Security Best Practices

1. **Secrets Management**
   - Use `wrangler secret` for all sensitive values
   - Never commit secrets to git
   - Rotate secrets regularly

2. **Authentication**
   - Use Bearer tokens for API access
   - Implement rate limiting
   - Validate all inputs

3. **CORS**
   - Configure allowed origins
   - Don't use `*` in production
   - Validate request origins

4. **Input Validation**
   - Sanitize all user inputs
   - Use parameterized queries
   - Implement strict TypeScript types

## Support

- **Documentation**: See individual service READMEs
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/

## Future Services (Planned)

- **Email Service**: Transactional emails via Resend/SendGrid
- **SMS Service**: Twilio integration for notifications
- **Search Service**: ElasticSearch/Algolia integration
- **Analytics Service**: Enhanced analytics with Tinybird
- **Notification Service**: Multi-channel notifications (email, SMS, push)

## Contributing

When adding new microservices:

1. Create new directory under `workers/`
2. Follow naming convention: `{service-name}/`
3. Include: `src/index.ts`, `wrangler.toml`, `package.json`, `tsconfig.json`, `README.md`
4. Add health check endpoint: `GET /health`
5. Document all API endpoints
6. Update this main README
7. Update deployment script if needed
