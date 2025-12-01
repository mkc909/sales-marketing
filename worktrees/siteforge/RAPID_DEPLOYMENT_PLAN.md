# RAPID DEPLOYMENT PLAN - URGENT PRODUCTION LAUNCH

**Status**: CRITICAL - Production site live but not operational
**URL**: https://progeodata-com.auramediastudios.workers.dev/
**Date**: November 30, 2025
**Time to Go Live**: 2-3 HOURS

## CURRENT STATUS ASSESSMENT

### ✅ What's Already Set Up
- Cloudflare Pages project exists (connected via CI/CD)
- D1 Database ID configured: `857b7e12-732f-4f8e-9c07-2f1482a5b76c`
- KV Namespaces configured (LINKS, PINS, CACHE, ANALYTICS_BUFFER)
- R2 Buckets configured (5 buckets for assets/photos/documents)
- Build artifacts ready in `build/client`
- All migration files ready (001-008)

### ⚠️ What Needs Immediate Deployment
1. **Database migrations** - Not yet applied (8 migration files)
2. **Main application** - Not deployed to production
3. **Critical microservices** - AI agents not deployed
4. **Environment secrets** - Not configured

## CRITICAL PATH TO GO LIVE (2-3 HOURS)

### PHASE 1: DATABASE SETUP (30 minutes)
```powershell
# Run ALL migrations in exact order
npx wrangler d1 execute estateflow-db --file=migrations/001_initial_agents.sql --env production
npx wrangler d1 execute estateflow-db --file=migrations/002_agent_profile_v2.sql --env production
npx wrangler d1 execute estateflow-db --file=migrations/003_multi_industry_platform_safe.sql --env production
npx wrangler d1 execute estateflow-db --file=migrations/004_leads_table.sql --env production
npx wrangler d1 execute estateflow-db --file=migrations/005_scraping_pipeline.sql --env production
npx wrangler d1 execute estateflow-db --file=migrations/006_serviceos.sql --env production
npx wrangler d1 execute estateflow-db --file=migrations/007_ai_agents.sql --env production
npx wrangler d1 execute estateflow-db --file=migrations/008_growth_features.sql --env production
```

### PHASE 2: SEED ESSENTIAL DATA (15 minutes)
```powershell
# Add test professionals for immediate demo capability
npx wrangler d1 execute estateflow-db --file=test-data-10-professionals.sql --env production

# Add demo tenant
npx wrangler d1 execute estateflow-db --command="INSERT INTO tenants (name, subdomain, custom_domain, plan, status, features) VALUES ('ProGeoData', 'progeodata', 'progeodata-com.auramediastudios.workers.dev', 'enterprise', 'active', '{\"ghost_profiles\":true,\"ai_agent\":true,\"serviceos\":true}')" --env production
```

### PHASE 3: DEPLOY MAIN APPLICATION (30 minutes)
```powershell
# Build fresh
npm run build

# Deploy to production
npx wrangler pages deploy ./build/client --project-name=progeodata-com --env production
```

### PHASE 4: DEPLOY CRITICAL MICROSERVICES (45 minutes)
Deploy only the ESSENTIAL services for sales:

1. **AI Customer Service Agent** (PRIORITY 1)
```powershell
cd workers/ai-customer-service
npm install
npm run deploy
```

2. **Lead Capture Service** (PRIORITY 1)
```powershell
cd workers/lead-capture-service
npm install
npm run deploy
```

3. **Ghost Profile Generator** (PRIORITY 2)
```powershell
cd workers/ghost-profile-generator
npm install
npm run deploy
```

### PHASE 5: CONFIGURE SECRETS (15 minutes)
```powershell
# Essential secrets only
npx wrangler secret put SESSION_SECRET --env production
# Enter: "production-secret-key-2025"

npx wrangler secret put ENCRYPTION_KEY --env production
# Enter: "production-encryption-key-2025"

npx wrangler secret put ATH_MOVIL_PUBLIC_TOKEN --env production
# Enter: "production-ath-token" (temporary)

npx wrangler secret put POSTHOG_API_KEY --env production
# Enter: "phk_production_key" (optional)
```

### PHASE 6: VERIFY DEPLOYMENT (15 minutes)
```powershell
# Test main site
curl https://progeodata-com.auramediastudios.workers.dev/

# Test API health
curl https://progeodata-com.auramediastudios.workers.dev/api/health

# Test database connection
curl https://progeodata-com.auramediastudios.workers.dev/api/test

# Test professional search
curl "https://progeodata-com.auramediastudios.workers.dev/api/professionals/search?industry=real_estate"
```

## MINIMUM VIABLE FEATURES FOR SALES

### Must Have NOW (Phase 1-5)
✅ Landing page with professional search
✅ Professional profiles display
✅ Lead capture form
✅ AI chat widget
✅ Basic contact forms
✅ Mobile responsive design

### Can Deploy LATER (Phase 6+)
- Advanced analytics
- Full ServiceOS integration
- Payment processing
- Referral system
- Email campaigns
- Advanced AI features

## CRITICAL BLOCKERS & SOLUTIONS

### Potential Blocker 1: Database Not Created
**Solution**: Database ID exists in wrangler.toml, just needs migrations
```powershell
# Verify database exists
npx wrangler d1 list
```

### Potential Blocker 2: Authentication Issues
**Solution**: Use wrangler login
```powershell
npx wrangler login
```

### Potential Blocker 3: Build Failures
**Solution**: Use pre-built artifacts
```powershell
# Already built in build/client, just deploy
npx wrangler pages deploy ./build/client
```

## EMERGENCY FALLBACK PLAN

If main deployment fails, deploy minimal static version:
```powershell
# Create minimal index.html
echo "<!DOCTYPE html><html><head><title>ProGeoData</title></head><body><h1>ProGeoData - Coming Soon</h1><p>Professional Services Platform</p><form><input type='email' placeholder='Enter email'><button>Get Updates</button></form></body></html>" > build/client/index.html

# Deploy static page
npx wrangler pages deploy ./build/client
```

## SUCCESS METRICS

### Go/No-Go Criteria (MUST HAVE)
- [ ] Site loads without errors
- [ ] Database queries return data
- [ ] Search functionality works
- [ ] Lead capture saves to database
- [ ] AI chat widget appears

### Nice to Have
- [ ] All microservices deployed
- [ ] Analytics tracking
- [ ] Full payment integration
- [ ] Email notifications

## EXACT COMMANDS TO EXECUTE NOW

```powershell
# Copy and run this entire block
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge

# Step 1: Apply migrations
.\deploy-to-production-NOW.ps1

# Step 2: Monitor deployment
npx wrangler tail --format pretty
```

## ESTIMATED TIMELINE

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 0 | Assessment & Planning | 15 min | COMPLETE |
| 1 | Database Setup | 30 min | READY |
| 2 | Seed Data | 15 min | READY |
| 3 | Deploy Main App | 30 min | READY |
| 4 | Deploy Microservices | 45 min | READY |
| 5 | Configure Secrets | 15 min | READY |
| 6 | Verification | 15 min | READY |
| **TOTAL** | **GO LIVE** | **2.5 hours** | **READY TO START** |

## CONTACT FOR ISSUES

- Primary: Deploy via wrangler CLI
- Fallback: Cloudflare Dashboard manual deployment
- Emergency: Static page deployment

**START DEPLOYMENT NOW - TIME IS CRITICAL**