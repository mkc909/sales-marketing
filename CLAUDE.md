# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EstateFlow Multi-Industry Platform** - A multi-industry professional services marketplace built on Cloudflare Workers supporting 835,000+ professionals across real estate, legal, insurance, mortgage, financial, and contractor industries. The platform includes PinExacto (Puerto Rico) and TruePoint (US) location-fixing utilities.

### Repository Structure

This repository contains two distinct systems:
1. **Main Repository**: Documentation, deployment guides, shared resources
2. **worktrees/siteforge**: The production Remix + Cloudflare Workers application

**Always work from `worktrees/siteforge` for application code.**

## Essential Commands

### Development Workflow

```bash
# Navigate to application directory
cd worktrees/siteforge

# Install dependencies
npm install

# Start development server (Remix + Vite)
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test
```

### Database Management

```bash
# Run all migrations in sequence
npm run db:migrate

# Individual migration execution
wrangler d1 execute estateflow-db --file=migrations/001_initial_agents.sql
wrangler d1 execute estateflow-db --file=migrations/002_agent_profile_v2.sql
wrangler d1 execute estateflow-db --file=migrations/003_multi_industry_platform.sql

# Reset database (DESTRUCTIVE)
npm run db:reset

# Backup database
npm run db:backup

# Query database directly
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM professionals;"
wrangler d1 execute estateflow-db --command="SELECT industry, COUNT(*) FROM professionals GROUP BY industry;"
```

### Data Import (Progressive Scale Testing)

```bash
# ALWAYS test progressively - never skip stages!

# Stage 1: Test import (10 records)
npm run import:test

# Stage 2: Small batch (100 records)
npm run import:small

# Stage 3: Medium batch (1,000 records)
npm run import:medium

# Stage 4: Large batch (10,000 records)
npm run import:large

# Stage 5: Full import (production data)
npm run import:full

# Verify import results
npm run import:verify

# Rollback failed imports
npm run import:rollback
```

### Deployment

```bash
# Automated deployment (Windows)
.\deploy.ps1

# Automated deployment (Mac/Linux)
./deploy.sh

# Manual deployment steps
npm run build
wrangler pages deploy ./build/client

# Preview build locally
npm run preview
```

### Monitoring & Debugging

```bash
# Real-time error monitoring (native Wrangler tail)
npm run monitor:errors
# or
wrangler tail --format pretty

# Database statistics
npm run monitor:db

# Check deployment status
wrangler pages deployment list
```

## Architecture Patterns

### Multi-Tenant System

The platform uses **hostname-based multi-tenancy**:

- Custom domains: `mybusiness.com` → Tenant lookup by `custom_domain`
- Subdomains: `mybusiness.estateflow.com` → Tenant lookup by `subdomain`
- Localhost: Returns demo tenant for development

**Tenant Resolution Logic**: `app/lib/tenant.server.ts`

```typescript
// Key function: getTenantByHostname(hostname, context)
// Returns: Tenant object or null
// Used in route loaders to determine which business data to display
```

### Multi-Industry Data Model

**Universal professionals table** replaces industry-specific tables:

```sql
CREATE TABLE professionals (
  industry TEXT NOT NULL,  -- 'real_estate', 'legal', 'insurance', etc.
  profession TEXT NOT NULL, -- 'agent', 'attorney', 'broker', etc.
  specializations JSON,     -- Industry-specific specializations
  license_number TEXT,      -- State licensing info
  certifications JSON,      -- Professional certifications
  service_regions JSON,     -- Geographic service areas
  ...
)
```

**Migration Path**: `migrations/003_multi_industry_platform.sql` transforms real estate-only schema to universal platform.

### Error Tracking System

**Native Cloudflare error tracking** (no external dependencies):

- Error persistence: D1 database table `error_logs`
- Real-time monitoring: `wrangler tail`
- Implementation: `app/lib/error-tracking.ts`

**Key insight**: Replaces Sentry with Cloudflare-native solution to eliminate external dependencies and costs.

### PinExacto/TruePoint Location System

**Route Pattern**: `/pin/{shortCode}`

```typescript
// Example: pin.pr/abc123 → Location with:
// - Visual pin system for exact locations
// - Gate photos and entrance guidance
// - 1-meter precision accuracy
// - QR codes on physical signs
```

**Data Flow**:
1. Short code lookup in KV namespace `PINS`
2. Retrieve full location data (lat/lng, photos, instructions)
3. Universal map link generation (opens in any map app)
4. Analytics tracking in KV namespace `ANALYTICS_BUFFER`

## Critical Development Patterns

### 1. Always Use Progressive Import Testing

**NEVER import large datasets without testing smaller batches first.**

Test stages exist for a reason:
- 10 records: Validates import logic
- 100 records: Tests performance
- 1,000 records: Monitors resource usage
- 10,000 records: Validates at scale
- Full dataset: Production import

**Why**: D1 has write limits (100k rows/day free tier). Failed large imports can exhaust quota.

### 2. Remix Route Conventions

**File-based routing** in `app/routes/`:

```
routes/
├── _index.tsx                    → /
├── agent.$slug.tsx               → /agent/john-smith
├── $industry.$city.tsx           → /real-estate/miami
├── pin.$shortCode.tsx            → /pin/abc123
├── pinexacto.tsx                 → /pinexacto
└── api.pin.$shortCode.navigate.tsx → /api/pin/abc123/navigate
```

**Dynamic segments**: `$slug`, `$industry`, `$city`, `$shortCode`

**Loader pattern**: Every route exports a `loader` function for server-side data fetching:

```typescript
export async function loader({ params, context }: LoaderFunctionArgs) {
  const tenant = await getTenantByHostname(request.headers.get('host'), context);
  // Fetch data based on tenant
  return json({ tenant, data });
}
```

### 3. Cloudflare Workers Context

**AppLoadContext interface** provides access to Cloudflare resources:

```typescript
interface Env {
  DB: D1Database;                    // SQLite database
  LINKS: KVNamespace;                // URL shortener
  PINS: KVNamespace;                 // Location pins
  CACHE: KVNamespace;                // Response cache
  ANALYTICS_BUFFER: KVNamespace;     // Analytics events
  ESTATEFLOW_ASSETS: R2Bucket;       // File storage
}
```

Access in loaders/actions: `context.env.DB`, `context.env.PINS`, etc.

### 4. Industry-Specific Content

**Default content generation** in `app/lib/tenant.server.ts`:

```typescript
getDefaultContent(industry)
// Returns industry-specific hero text, services, about sections
// Industries: plumber, hvac, landscaper, electrician, etc.
```

**Content storage**: D1 table `site_content` with JSON fields for flexibility.

### 5. Error Handling Strategy

**Three-tier error handling**:

1. **Route-level**: `ErrorBoundary` exports in each route
2. **Application-level**: `ErrorBoundary` in `root.tsx`
3. **Database-level**: Error persistence in `error_logs` table

**Best practice**: Always wrap D1 queries in try-catch and log to `error_logs`:

```typescript
try {
  const result = await context.env.DB.prepare(sql).bind(...).all();
} catch (error) {
  await logError(error, context);
  throw new Response("Database error", { status: 500 });
}
```

## Deployment Checklist

### Pre-Deployment Verification

1. **Build succeeds**: `npm run build` completes without errors
2. **Type checking passes**: `npm run typecheck` reports no errors
3. **Tests pass**: `npm test` (if tests exist)
4. **Migrations applied**: All `.sql` files in `migrations/` executed
5. **Environment variables set**: Check `wrangler.toml` for secrets

### Deployment Sequence

The deployment scripts (`deploy.ps1` / `deploy.sh`) automate:

1. Wrangler authentication check
2. D1 database creation (if not exists)
3. Database migrations execution
4. KV namespace creation
5. R2 bucket creation
6. Production build
7. Pages deployment
8. Health check

**Manual override**: If automation fails, follow `DEPLOYMENT_INSTRUCTIONS.md` step-by-step guide.

## Important Gotchas

### 1. D1 Write Limits

**Free tier**: 100,000 rows written per day

**Implications**:
- Batch inserts carefully (use transactions)
- Test imports progressively
- Monitor `wrangler d1 execute` output for quota warnings

### 2. Remix Server vs Client Code

**Server-only code** (`.server.ts` suffix):
- Database queries
- Environment variable access
- Secrets access

**Client-safe code**:
- UI components
- Browser APIs
- Client-side state management

**Never** import `.server.ts` files in client components - Remix will error.

### 3. Migration Order Matters

Migrations **must** run in sequence:
1. `001_initial_agents.sql` - Creates base tables
2. `002_agent_profile_v2.sql` - Adds enhanced fields
3. `003_multi_industry_platform.sql` - Transforms to universal schema

**Do not skip migrations** - later migrations depend on earlier schema changes.

### 4. Wrangler.toml Environment Configuration

**Production bindings** are in `[env.production]` section:

```toml
[env.production]
vars = { ENVIRONMENT = "production" }

[[env.production.d1_databases]]
binding = "DB"
database_id = "your-id-here"
```

**Development**: Uses different bindings or defaults.

**Important**: Update `database_id`, KV namespace `id`, and R2 `bucket_name` with your actual Cloudflare resource IDs.

## Testing Data Import

See `DATA_IMPORT_TESTING_GUIDE.md` for complete testing methodology.

**Quick reference**:

```bash
# Create test data
node scripts/generate-test-data.js

# Test import (10 records)
npm run import:test

# Verify import
npm run import:verify

# If something fails
npm run import:rollback
```

**Import scripts location**: `worktrees/siteforge/scripts/`

## Key Files Reference

### Application Entry Points
- `app/root.tsx` - Root layout with global error boundary
- `app/entry.server.tsx` - Server-side entry point
- `app/entry.client.tsx` - Client-side hydration

### Core Business Logic
- `app/lib/tenant.server.ts` - Multi-tenant resolution and content management
- `app/lib/error-tracking.ts` - Native error tracking system
- `app/lib/feature-flags.ts` - Feature toggle system
- `app/lib/branding.ts` - Regional branding (PinExacto vs TruePoint)

### Database
- `migrations/*.sql` - Database schema migrations (run in order)
- `wrangler.toml` - Cloudflare resource bindings

### Deployment
- `deploy.ps1` - Windows automated deployment
- `deploy.sh` - Mac/Linux automated deployment
- `DEPLOYMENT_TICKET.md` - Step-by-step deployment checklist

### Documentation
- `README.md` - Project overview
- `DEPLOYMENT_INSTRUCTIONS.md` - Manual deployment guide
- `DATA_IMPORT_TESTING_GUIDE.md` - Progressive import testing
- `docs/UNIFIED_PLATFORM_ARCHITECTURE.md` - Complete system architecture
- `docs/MULTI_INDUSTRY_IMPLEMENTATION_SUMMARY.md` - Multi-industry features

## When Adding New Features

### 1. New Industry Support

1. Add industry to professionals table (already supported via `industry` column)
2. Create default content in `getDefaultContent()` in `tenant.server.ts`
3. Add industry-specific tools (e.g., `app/components/buyer-tools/` for real estate)
4. Update documentation in `docs/`

### 2. New Route

1. Create file in `app/routes/` following Remix conventions
2. Export `loader` for server-side data
3. Export `action` for form submissions
4. Export `ErrorBoundary` for error handling
5. Export default component for UI

### 3. New Database Table

1. Create migration file: `migrations/00X_description.sql`
2. Run migration: `wrangler d1 execute estateflow-db --file=migrations/00X_description.sql`
3. Update TypeScript types if needed
4. Test with small dataset first

### 4. New API Endpoint

Create route in `app/routes/api.*.tsx`:

```typescript
export async function loader({ request, context }: LoaderFunctionArgs) {
  // API logic
  return json({ data }, { headers: { 'Content-Type': 'application/json' } });
}
```

## Additional Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Remix Docs**: https://remix.run/docs
- **D1 Database**: https://developers.cloudflare.com/d1/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

## Platform-Specific Notes

### Revenue Model

See `README.md` for complete revenue projections:
- Real Estate: 350,000 professionals
- Legal: 85,000 attorneys
- Insurance: 120,000 agents
- Mortgage: 45,000 loan officers
- Financial: 35,000 advisors
- Contractors: 200,000 professionals

**Total**: $3M+ MRR potential at scale

### Regional Branding

- **Puerto Rico**: PinExacto brand with Spanish language support
- **US Markets**: TruePoint brand with English
- **URL Shortener**: est.at domain for QR codes

**Implementation**: `app/lib/branding.ts` handles regional differences.
