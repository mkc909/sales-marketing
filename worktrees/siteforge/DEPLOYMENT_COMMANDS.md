# EstateFlow Deployment - Quick Command Reference (Workers Edition)

**Project Directory**: `C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge`

---

## 🚀 ONE-COMMAND DEPLOYMENT (PowerShell)

```powershell
# Navigate to project
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge

# Run automated deployment script
.\deploy-windows.ps1
```

---

## 📋 MANUAL DEPLOYMENT COMMANDS

Copy and paste these commands in sequence:

### 1️⃣ Navigate to Project
```powershell
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge
```

### 2️⃣ Authenticate with Cloudflare
```powershell
npx wrangler whoami
# If not authenticated:
npx wrangler login
```

### 3️⃣ Create/Verify D1 Database
```powershell
# List existing databases
npx wrangler d1 list

# Create database (if needed)
npx wrangler d1 create estateflow-db

# Note the database_id and update wrangler.toml if needed
```

### 4️⃣ Run Database Migrations
```powershell
# Migration 1
npx wrangler d1 execute estateflow-db --file=migrations/001_initial_agents.sql

# Migration 2
npx wrangler d1 execute estateflow-db --file=migrations/002_agent_profile_v2.sql

# Migration 3
npx wrangler d1 execute estateflow-db --file=migrations/003_multi_industry_platform_safe.sql

# Or use the npm script to run all at once:
npm run db:migrate
```

### 5️⃣ Create/Verify KV Namespaces
```powershell
# List existing namespaces
npx wrangler kv:namespace list

# Create namespaces (if needed)
npx wrangler kv:namespace create LINKS
npx wrangler kv:namespace create PINS
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create ANALYTICS_BUFFER
```

### 6️⃣ Create/Verify R2 Buckets
```powershell
# List existing buckets
npx wrangler r2 bucket list

# Create buckets (if needed)
npx wrangler r2 bucket create estateflow-assets
npx wrangler r2 bucket create profile-photos
npx wrangler r2 bucket create property-images
npx wrangler r2 bucket create documents
npx wrangler r2 bucket create qr-codes
```

### 7️⃣ Install Dependencies
```powershell
npm install
```

### 8️⃣ Type Check
```powershell
npm run typecheck
```

### 9️⃣ Build for Production
```powershell
npm run build
```

### 🔟 Deploy to Cloudflare Workers
```powershell
npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536
```

### 1️⃣1️⃣ Verify Deployment
```powershell
# List deployments
npx wrangler deployments list

# Test database
npx wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM professionals;"

# Monitor logs
npx wrangler tail
```

---

## 🔍 VERIFICATION COMMANDS

### Check Database
```powershell
# List all tables
npx wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Count professionals
npx wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM professionals;"

# Check by industry
npx wrangler d1 execute estateflow-db --command="SELECT industry, COUNT(*) as count FROM professionals GROUP BY industry;"
```

### Check Deployments
```powershell
# List all deployments
npx wrangler deployments list

# Get latest deployment
npx wrangler deployments list | Select-Object -First 1

# View deployment logs
npx wrangler tail
```

### Check Infrastructure
```powershell
# List D1 databases
npx wrangler d1 list

# List KV namespaces
npx wrangler kv:namespace list

# List R2 buckets
npx wrangler r2 bucket list
```

---

## 🧪 TESTING COMMANDS

### Data Import (Progressive Testing)
```powershell
# Generate test data
npm run import:generate

# Test import (10 records)
npm run import:test

# Verify import
npm run import:verify

# Small batch (100)
npm run import:small

# Medium batch (1000)
npm run import:medium

# Large batch (10000)
npm run import:large
```

### Smoke Tests
```powershell
# Run smoke tests
npm run smoke-test
```

---

## 📊 MONITORING COMMANDS

### Real-time Monitoring
```powershell
# Monitor all logs
npx wrangler tail

# Monitor errors only (using npm script)
npm run monitor:errors

# Database statistics
npm run monitor:db
```

### Check Health
```powershell
# Replace with your deployment URL
curl https://YOUR-DEPLOYMENT-URL.workers.dev/api/health
```

---

## 🛠️ TROUBLESHOOTING COMMANDS

### Reset & Rebuild
```powershell
# Clean node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Clean build and rebuild
Remove-Item -Recurse -Force build
npm run build
```

### Database Reset (DESTRUCTIVE)
```powershell
# Backup first
npm run db:backup

# Reset database
npm run db:reset
```

### Rollback Data Import
```powershell
npm run import:rollback
```

---

## 🔐 SECRETS MANAGEMENT

### Set Secrets
```powershell
# PostHog API Key
npx wrangler secret put POSTHOG_KEY --env production

# Alert Webhook URL
npx wrangler secret put ALERT_WEBHOOK_URL --env production

# GitHub Token
npx wrangler secret put GITHUB_TOKEN --env production

# Mapbox Token
npx wrangler secret put MAPBOX_TOKEN --env production
```

### List Secrets
```powershell
npx wrangler secret list --env production
```

---

## 📦 COMMON NPM SCRIPTS

```powershell
# Development
npm run dev                # Start dev server

# Building
npm run build             # Production build
npm run typecheck         # Type checking
npm run lint              # ESLint

# Database
npm run db:migrate        # Run all migrations
npm run db:reset          # Reset database
npm run db:backup         # Backup database

# Deployment
npm run deploy            # Deploy to Workers

# Monitoring
npm run monitor:errors    # Real-time error monitoring
npm run monitor:db        # Database statistics

# Testing
npm test                  # Run tests
npm run smoke-test        # Smoke tests

# Data Import
npm run import:test       # Test import (10 records)
npm run import:verify     # Verify import
npm run import:small      # Small batch (100)
npm run import:medium     # Medium batch (1000)
npm run import:large      # Large batch (10000)
npm run import:rollback   # Rollback import
```

---

## 🎯 QUICK DEPLOYMENT WORKFLOW

### First-Time Deployment
```powershell
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge
npx wrangler login
npx wrangler d1 create estateflow-db
npm run db:migrate
npm install
npm run build
npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536
```

### Subsequent Deployments
```powershell
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge
npm run build
npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536
```

### Quick Update Deployment
```powershell
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge
npm install && npm run build && npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536
```

---

## 🐛 DEBUG COMMANDS

### View Detailed Logs
```powershell
# Tail logs with formatting
npx wrangler tail --format pretty

# Filter for errors only
npx wrangler tail | Select-String "ERROR"
```

### Database Debugging
```powershell
# Check schema
npx wrangler d1 execute estateflow-db --command="PRAGMA table_info(professionals);"

# Check indexes
npx wrangler d1 execute estateflow-db --command="SELECT * FROM sqlite_master WHERE type='index';"

# Check recent errors
npx wrangler d1 execute estateflow-db --command="SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 10;"
```

---

## 📝 NOTES

### Current Configuration (from wrangler.toml)

**D1 Database**:
- Name: `estateflow-db`
- ID: `857b7e12-732f-4f8e-9c07-2f1482a5b76c`

**KV Namespaces**:
- LINKS: `ec019d5680f947a3a0168d9ae49538a0`
- PINS: `32fa94570ef447adab5164ad83f1472b`
- CACHE: `3b7a129d1c834cad988a406cff5d9e45`
- ANALYTICS_BUFFER: `f3019821e7b64f1aa9650c1edacb6f1f`

**R2 Buckets**:
- estateflow-assets
- profile-photos
- property-images
- documents
- qr-codes

### Migration Files
1. `migrations/001_initial_agents.sql` - Base schema
2. `migrations/002_agent_profile_v2.sql` - Enhanced profiles
3. `migrations/003_multi_industry_platform_safe.sql` - Multi-industry support

---

## 🆘 EMERGENCY COMMANDS

### If Deployment is Broken
```powershell
# 1. Check deployment status
npx wrangler deployments list

# 2. Rollback to previous deployment (if needed)
# Get deployment ID from list above, then:
npx wrangler rollback --to <deployment-id>

# 3. View error logs
npx wrangler tail
```

### If Database is Corrupted
```powershell
# 1. Backup current data
npm run db:backup

# 2. Export data (if possible)
npx wrangler d1 export estateflow-db > backup.sql

# 3. Reset and re-migrate
npm run db:reset
npm run db:migrate
```

---

**Last Updated**: 2025-12-03
**Deployment Script**: `deploy-windows.ps1`
**Full Checklist**: `DEPLOYMENT_CHECKLIST.md`

**IMPORTANT**: This project has migrated from Cloudflare Pages to Cloudflare Workers. All `wrangler pages` commands have been replaced with `wrangler` commands for Workers deployment.
