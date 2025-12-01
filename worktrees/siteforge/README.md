# EstateFlow Multi-Industry Platform

A multi-industry professional services marketplace built on Cloudflare Workers supporting 835,000+ professionals across real estate, legal, insurance, mortgage, financial, and contractor industries.

## Quick Start

```bash
# Navigate to application
cd worktrees/siteforge

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

## Architecture

### Tech Stack
- **Framework**: Remix + Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (Objects)
- **KV**: Cloudflare KV (Cache & Analytics)
- **Build**: Vite
- **Language**: TypeScript

### Multi-Tenant System
The platform uses hostname-based multi-tenancy:
- Custom domains: `mybusiness.com` → Tenant lookup by `custom_domain`
- Subdomains: `mybusiness.estateflow.com` → Tenant lookup by `subdomain`
- Localhost: Returns demo tenant for development

### Database Schema
Universal professionals table supporting all industries:
- Real Estate: 350,000 professionals
- Legal: 85,000 attorneys
- Insurance: 120,000 agents
- Mortgage: 45,000 loan officers
- Financial: 35,000 advisors
- Contractors: 200,000 professionals

## Development

### Prerequisites
- Node.js 18+ or 20+
- npm 8+
- Wrangler CLI (`npm install -g wrangler`)

### Environment Setup

1. **Create Cloudflare Resources**:
```bash
# Create D1 database
wrangler d1 create estateflow-db

# Create KV namespaces
wrangler kv:namespace create LINKS
wrangler kv:namespace create PINS
wrangler kv:namespace create CACHE
wrangler kv:namespace create ANALYTICS_BUFFER

# Create R2 buckets
wrangler r2 bucket create estateflow-assets
```

2. **Update wrangler.toml** with the IDs returned from above commands

3. **Run Database Migrations**:
```bash
# Run all migrations in sequence
npm run db:migrate

# Or individually
wrangler d1 execute estateflow-db --file=migrations/001_initial_agents.sql
wrangler d1 execute estateflow-db --file=migrations/002_agent_profile_v2.sql
wrangler d1 execute estateflow-db --file=migrations/003_multi_industry_platform_safe.sql
```

### Data Import

**ALWAYS test progressively - never skip stages!**

```bash
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
```

**Warning**: D1 has write limits (100k rows/day free tier). Failed large imports can exhaust quota.

## Project Structure

```
worktrees/siteforge/
├── app/
│   ├── routes/           # Remix routes (file-based routing)
│   ├── models/           # Data models (.server.ts files)
│   ├── lib/              # Utilities and helpers
│   ├── components/       # React components
│   └── styles/           # CSS styles
├── migrations/           # Database schema migrations
├── scripts/              # Import and utility scripts
├── functions/            # Cloudflare Workers functions
├── build/                # Build output (gitignored)
└── wrangler.toml        # Cloudflare configuration
```

## Key Features

### PinExacto/TruePoint Location System
- Visual pin system for exact locations
- Gate photos and entrance guidance
- 1-meter precision accuracy
- QR codes on physical signs
- Route: `/pin/{shortCode}`

### Multi-Industry Support
Each industry has specialized profiles and tools:
- **Real Estate**: MLS integration, property tools
- **Legal**: Bar admissions, practice areas
- **Insurance**: Carrier appointments, policy types
- **Mortgage**: NMLS licensing, loan types
- **Financial**: SEC/FINRA registration, advisory services
- **Contractors**: Trade licensing, service offerings

### Regional Branding
- **Puerto Rico**: PinExacto brand with Spanish language
- **US Markets**: TruePoint brand with English
- **URL Shortener**: est.at domain for QR codes

## Deployment

### Automated Deployment

```bash
# Windows
.\deploy.ps1

# Mac/Linux
./deploy.sh
```

### Manual Deployment

```bash
# Build the application
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy ./build/client

# Monitor deployment
wrangler pages deployment list
```

### Production Checklist
1. ✅ Build succeeds: `npm run build`
2. ✅ Type checking passes: `npm run typecheck`
3. ✅ Migrations applied: All `.sql` files executed
4. ✅ Environment variables set in `wrangler.toml`
5. ✅ Cloudflare resources created (D1, KV, R2)

## Monitoring & Debugging

```bash
# Real-time error monitoring
npm run monitor:errors
# or
wrangler tail --format pretty

# Database statistics
npm run monitor:db

# Check deployment status
wrangler pages deployment list
```

## Common Issues & Solutions

### Issue: TypeScript compilation fails
**Solution**: Ensure `remix.env.d.ts` exists with proper type definitions

### Issue: Database migration fails
**Solution**: Use `003_multi_industry_platform_safe.sql` which includes safety checks

### Issue: D1 write limit exceeded
**Solution**: Use progressive import testing, never skip stages

### Issue: Blank page in production
**Solution**: Check Vite SSR configuration and build output paths

### Issue: KV namespace not found
**Solution**: Create KV namespaces and update IDs in `wrangler.toml`

## Revenue Model

Platform targets $3M+ MRR at scale:
- Ghost profiles: Free (lead generation)
- Starter tier: $49/month (basic features)
- Professional tier: $149/month (full features)
- Enterprise tier: $299/month (multi-location)

## Support & Documentation

- **GitHub Issues**: Report bugs and request features
- **Discord**: Community support
- **Documentation**: See CLAUDE.md for AI assistant guidance

## License

Proprietary - All rights reserved

---

Built with Remix, Cloudflare Workers, and TypeScript