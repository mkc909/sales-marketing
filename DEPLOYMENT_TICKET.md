# 🎫 Deployment Ticket: EstateFlow Multi-Industry Platform

**Ticket ID**: DEPLOY-001
**Priority**: HIGH
**Target Date**: November 28, 2024
**Status**: READY FOR DEPLOYMENT

## Overview

Deploy the EstateFlow Multi-Industry Platform to Cloudflare Workers, supporting 6 professional service industries with native error tracking and multi-domain support.

## Pre-Deployment Checklist

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] npm 8+ installed
- [ ] Cloudflare account created
- [ ] Cloudflare Account ID obtained
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Authenticated with Cloudflare (`wrangler login`)

### Configuration
- [ ] Update `YOUR_ACCOUNT_ID` in wrangler.toml
- [ ] Generate secure SESSION_SECRET
- [ ] Prepare API keys (optional):
  - [ ] PostHog API key
  - [ ] Alert webhook URL (Slack/Discord)
  - [ ] GitHub token (for data import)
  - [ ] Mapbox token (for maps)

## Deployment Steps

### Phase 1: Infrastructure Setup (30 mins)

#### 1.1 Create D1 Databases
```bash
wrangler d1 create estateflow-db
```
- [ ] Update database ID in wrangler.toml
- [ ] Note database ID for reference

#### 1.2 Run Database Migrations
```bash
wrangler d1 execute estateflow-db --file=migrations/001_initial_schema.sql
wrangler d1 execute estateflow-db --file=migrations/002_agent_profile_v2.sql
wrangler d1 execute estateflow-db --file=migrations/003_multi_industry_platform.sql
```
- [ ] Verify all 3 migrations applied successfully
- [ ] Check tables created: `professionals`, `error_logs`, `lead_routing_rules`

#### 1.3 Create KV Namespaces
```bash
wrangler kv:namespace create "LINKS"
wrangler kv:namespace create "PINS"
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "ANALYTICS_BUFFER"
```
- [ ] Update all KV IDs in wrangler.toml
- [ ] Verify namespaces created in dashboard

#### 1.4 Create R2 Buckets
```bash
wrangler r2 bucket create profile-photos
wrangler r2 bucket create property-images
wrangler r2 bucket create documents
wrangler r2 bucket create qr-codes
wrangler r2 bucket create estateflow-assets
```
- [ ] Verify all 5 buckets created
- [ ] Note bucket names match wrangler.toml

### Phase 2: Application Deployment (20 mins)

#### 2.1 Build Application
```bash
npm install
npm run build
```
- [ ] Build completes without errors
- [ ] Build output in `build/` directory

#### 2.2 Deploy Main Worker
```bash
wrangler deploy
```
- [ ] Deployment successful
- [ ] Note worker URL
- [ ] Test health endpoint: `curl [WORKER_URL]/health`

#### 2.3 Deploy Microservices
```bash
# URL Shortener
cd workers/shortener
npm install
wrangler deploy
cd ../..

# QR Generator
cd workers/qr-generator
npm install
wrangler deploy
cd ../..

# Agent Ingestion
cd workers/agent-ingestion
npm install
wrangler deploy
cd ../..
```
- [ ] All 3 microservices deployed
- [ ] Service bindings active

### Phase 3: Configuration & Secrets (10 mins)

#### 3.1 Set Environment Secrets
```bash
wrangler secret put POSTHOG_KEY
wrangler secret put ALERT_WEBHOOK_URL
wrangler secret put GITHUB_TOKEN
wrangler secret put MAPBOX_TOKEN
```
- [ ] Secrets configured (or skipped if not needed)

#### 3.2 Configure Custom Domains (if applicable)
- [ ] Add estateflow.com to Cloudflare zone
- [ ] Add pinexacto.com (Puerto Rico)
- [ ] Add truepoint.app (US market)
- [ ] Add est.at (URL shortener)

### Phase 4: Verification (15 mins)

#### 4.1 Application Health Checks
- [ ] Main app responds: `curl https://[WORKER_URL]/health`
- [ ] Database connection works
- [ ] KV namespaces accessible
- [ ] R2 buckets accessible

#### 4.2 Database Verification
```bash
# Check tables exist
wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Verify professionals table
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM professionals;"

# Check error tracking
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM error_logs;"
```
- [ ] All core tables present
- [ ] No SQL errors

#### 4.3 Error Tracking Setup
```bash
# Start monitoring
wrangler tail --format pretty
```
- [ ] Wrangler tail streaming logs
- [ ] Error formatting working
- [ ] Can filter by level (ERROR, WARNING, etc.)

### Phase 5: Data Import (30 mins - Optional)

#### 5.1 Import Florida Real Estate Agents
```bash
curl "https://www.myfloridalicense.com/datadownload/downloadRE.asp" -o fl_agents.csv
node scripts/import-fl-agents.js
```
- [ ] Data downloaded successfully
- [ ] Import script runs without errors
- [ ] Agents visible in database

#### 5.2 Generate Ghost Profiles
- [ ] Top 1000 agents have ghost profiles
- [ ] QR codes generated
- [ ] Short URLs created

### Phase 6: Post-Deployment (15 mins)

#### 6.1 Monitoring Setup
- [ ] Create monitoring scripts (monitor.ps1, status.ps1)
- [ ] Test error monitoring: `.\monitor.ps1`
- [ ] Test status check: `.\status.ps1`

#### 6.2 Documentation
- [ ] Update README with production URL
- [ ] Document API endpoints
- [ ] Create runbook for common issues
- [ ] Share credentials securely with team

#### 6.3 Performance Baseline
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://[WORKER_URL]/health

# Database query performance
wrangler d1 execute estateflow-db --command="EXPLAIN QUERY PLAN SELECT * FROM professionals WHERE industry='real_estate' LIMIT 10;"
```
- [ ] Response time < 100ms
- [ ] Database queries using indexes

## Success Criteria

### Functional Requirements
- ✅ Platform accessible via worker URL
- ✅ Database migrations applied successfully
- ✅ All 6 industries supported (real_estate, legal, insurance, mortgage, financial, contractor)
- ✅ Error tracking via Wrangler tail working
- ✅ Multi-domain routing configured

### Performance Requirements
- ✅ Health check responds in < 100ms
- ✅ Database queries complete in < 10ms
- ✅ Error logs captured in real-time
- ✅ No cold start delays

### Security Requirements
- ✅ SESSION_SECRET changed from default
- ✅ Secrets properly configured
- ✅ No sensitive data in logs
- ✅ Rate limiting enabled

## Rollback Plan

If deployment fails:
1. Previous version remains active (Cloudflare automatic)
2. Revert database migrations if needed:
   ```bash
   wrangler d1 execute estateflow-db --command="DROP TABLE IF EXISTS [new_tables];"
   ```
3. Restore from D1 backup (automatic daily backups)
4. Notify team via alert webhook

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor error rates for first 24 hours
- [ ] Check performance metrics
- [ ] Verify lead routing working
- [ ] Test all critical user paths

### Week 1
- [ ] Import remaining professional data
- [ ] Configure PostHog dashboards
- [ ] Set up automated backups
- [ ] Create user documentation

### Month 1
- [ ] Launch marketing campaigns
- [ ] A/B test landing pages
- [ ] Optimize database queries
- [ ] Scale based on usage patterns

## Contact & Escalation

**Primary Contact**: DevOps Team
**Escalation Path**:
1. Check Wrangler tail logs
2. Review error_logs table in D1
3. Check Cloudflare status page
4. Contact Cloudflare support (if enterprise)

## Sign-offs

- [ ] **Development**: Code complete and tested
- [ ] **DevOps**: Infrastructure ready
- [ ] **Security**: Secrets configured, no vulnerabilities
- [ ] **Product**: Features verified
- [ ] **Legal**: Terms of service updated for multi-industry

## Notes

- Platform supports 835,000 professionals across FL & TX
- Revenue potential: $36.7M annual
- Native error tracking replaces Sentry (saves $300+/month)
- Multi-industry: Real Estate, Legal, Insurance, Mortgage, Financial, Contractors
- Regional branding: PinExacto (PR), TruePoint (US)

## Commands Reference

```bash
# Quick deployment (Windows PowerShell)
.\deploy.ps1

# Quick deployment (Mac/Linux)
./deploy.sh

# Manual deployment
wrangler deploy

# Monitor errors
wrangler tail --format pretty

# Check status
.\status.ps1

# Database query
wrangler d1 execute estateflow-db --command="YOUR_SQL"
```

---

**Ticket Created**: November 28, 2024
**Last Updated**: November 28, 2024
**Version**: 1.0