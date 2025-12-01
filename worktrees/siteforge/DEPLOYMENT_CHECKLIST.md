# EstateFlow Multi-Industry Platform - Deployment Checklist

**Last Updated**: 2024-11-30
**Target Platform**: Cloudflare Pages + Workers
**Project Type**: Remix + Vite + TypeScript

---

## 🎯 Deployment Objective

Deploy the EstateFlow Multi-Industry Platform to Cloudflare Pages with full infrastructure:
- D1 Database (SQLite)
- KV Namespaces (4 namespaces)
- R2 Buckets (5 buckets)
- Cloudflare Pages hosting

---

## ✅ Pre-Deployment Checklist

### Prerequisites Verification

- [ ] **Node.js 18+** installed (`node --version` should show v18.x.x or higher)
- [ ] **npm 8+** installed (`npm --version` should show 8.x.x or higher)
- [ ] **Wrangler CLI** installed (`npx wrangler --version` works)
- [ ] **Git** installed and repository is clean
- [ ] **Cloudflare Account** active with access to Workers/Pages
- [ ] **PowerShell 5.1+** (Windows) or **Bash** (Mac/Linux)

### Environment Preparation

- [ ] Navigate to project directory: `cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge`
- [ ] Verify `wrangler.toml` exists and has correct configuration
- [ ] Verify `package.json` exists with all required scripts
- [ ] Verify `migrations/` folder contains all 3 SQL files

---

## 🚀 Automated Deployment (Recommended)

### Windows PowerShell

```powershell
# Navigate to project directory
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge

# Run deployment script (dry run first to check)
.\deploy-windows.ps1 -DryRun

# Run actual deployment
.\deploy-windows.ps1

# Skip steps if needed
.\deploy-windows.ps1 -SkipAuth -SkipPrereqs
```

### Mac/Linux

```bash
# Navigate to project directory
cd /path/to/sales-marketing/worktrees/siteforge

# Make executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

---

## 📋 Manual Deployment Steps

Use this section if the automated script fails or for step-by-step control.

### Step 1: Authenticate with Cloudflare

```bash
# Check current authentication
npx wrangler whoami

# If not authenticated, login
npx wrangler login
# This will open a browser window for authentication

# Verify successful login
npx wrangler whoami
```

**Expected Output**: Your Cloudflare account email and account ID

- [ ] Successfully authenticated with Cloudflare

---

### Step 2: Create D1 Database

#### Check if database exists:
```bash
npx wrangler d1 list
```

#### If database doesn't exist, create it:
```bash
npx wrangler d1 create estateflow-db
```

**Expected Output**:
```
✅ Successfully created DB 'estateflow-db'

[[d1_databases]]
binding = "DB"
database_name = "estateflow-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### Update wrangler.toml:
- [ ] Copy the `database_id` from output
- [ ] Open `wrangler.toml`
- [ ] Update line 13 with your database_id
- [ ] Save file

**Current database_id in wrangler.toml**: `857b7e12-732f-4f8e-9c07-2f1482a5b76c`

- [ ] D1 database created or verified
- [ ] `wrangler.toml` updated with correct database_id

---

### Step 3: Run Database Migrations

**CRITICAL**: Run migrations in exact order!

#### Migration 1: Initial Schema
```bash
npx wrangler d1 execute estateflow-db --file=migrations/001_initial_agents.sql
```

**Expected**: Table creation statements executed successfully

- [ ] Migration 001 completed

#### Migration 2: Agent Profile v2
```bash
npx wrangler d1 execute estateflow-db --file=migrations/002_agent_profile_v2.sql
```

**Expected**: Column additions and updates executed

- [ ] Migration 002 completed

#### Migration 3: Multi-Industry Platform
```bash
npx wrangler d1 execute estateflow-db --file=migrations/003_multi_industry_platform_safe.sql
```

**Expected**: Multi-industry schema transformations completed

- [ ] Migration 003 completed

#### Verify Database Schema:
```bash
npx wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

**Expected Tables**:
- professionals
- tenants
- site_content
- error_logs
- analytics_events

- [ ] All database tables verified

---

### Step 4: Create KV Namespaces

#### Check existing KV namespaces:
```bash
npx wrangler kv:namespace list
```

#### Create required namespaces (if they don't exist):

```bash
# 1. LINKS namespace
npx wrangler kv:namespace create LINKS

# 2. PINS namespace
npx wrangler kv:namespace create PINS

# 3. CACHE namespace
npx wrangler kv:namespace create CACHE

# 4. ANALYTICS_BUFFER namespace
npx wrangler kv:namespace create ANALYTICS_BUFFER
```

**For each namespace created**:
- [ ] Copy the `id` from output
- [ ] Update corresponding entry in `wrangler.toml` (lines 17, 22, 27, 32)

**Current KV namespace IDs in wrangler.toml**:
- LINKS: `ec019d5680f947a3a0168d9ae49538a0`
- PINS: `32fa94570ef447adab5164ad83f1472b`
- CACHE: `3b7a129d1c834cad988a406cff5d9e45`
- ANALYTICS_BUFFER: `f3019821e7b64f1aa9650c1edacb6f1f`

- [ ] All 4 KV namespaces created or verified
- [ ] `wrangler.toml` updated with correct namespace IDs

---

### Step 5: Create R2 Buckets

#### Check existing R2 buckets:
```bash
npx wrangler r2 bucket list
```

#### Create required buckets (if they don't exist):

```bash
# 1. Main assets bucket
npx wrangler r2 bucket create estateflow-assets

# 2. Profile photos bucket
npx wrangler r2 bucket create profile-photos

# 3. Property images bucket
npx wrangler r2 bucket create property-images

# 4. Documents bucket
npx wrangler r2 bucket create documents

# 5. QR codes bucket
npx wrangler r2 bucket create qr-codes
```

**Expected**: Each command returns `Created bucket 'bucket-name'`

- [ ] `estateflow-assets` bucket created
- [ ] `profile-photos` bucket created
- [ ] `property-images` bucket created
- [ ] `documents` bucket created
- [ ] `qr-codes` bucket created

**Note**: R2 bucket names are configured in `wrangler.toml` lines 34-51. No ID updates needed for R2 buckets.

---

### Step 6: Install Dependencies

```bash
# Install all npm dependencies
npm install
```

**Expected**: Dependencies installed without errors, `node_modules/` created

- [ ] All npm dependencies installed
- [ ] No installation errors

---

### Step 7: TypeScript Type Checking

```bash
# Run type checking
npm run typecheck
```

**Expected**: No type errors

If errors occur:
- Review error messages
- Fix type issues in source code
- Re-run `npm run typecheck`

- [ ] Type checking passed with no errors

---

### Step 8: Build Production Bundle

```bash
# Build the application for production
npm run build
```

**Expected**:
- Vite build completes successfully
- `build/client` directory created
- `build/server` directory created
- Assets compiled and optimized

**Verify build output**:
```bash
ls build/client
```

Should show compiled assets, HTML, JS, CSS files.

- [ ] Production build completed successfully
- [ ] `build/client` directory exists with files
- [ ] No build errors

---

### Step 9: Deploy to Cloudflare Pages

```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy ./build/client --project-name=estateflow
```

**Expected Output**:
```
✨ Success! Uploaded X files (Y.YY sec)

✨ Deployment complete! Take a peek over at https://xxxxxxxx.estateflow.pages.dev
```

**Note**: First deployment creates the Pages project. Subsequent deployments update it.

- [ ] Deployment completed successfully
- [ ] Deployment URL received
- [ ] No deployment errors

---

### Step 10: Verify Deployment

#### Check deployment status:
```bash
npx wrangler pages deployment list --project-name=estateflow
```

**Expected**: List of deployments with latest at top showing "Success" status

#### Test database connection:
```bash
npx wrangler d1 execute estateflow-db --command="SELECT COUNT(*) as count FROM professionals;"
```

**Expected**: Query executes (may return 0 if no data imported yet)

#### Test live site:
1. Open deployment URL in browser
2. Verify page loads without errors
3. Check browser console for errors

- [ ] Deployment shows "Success" status
- [ ] Database connection verified
- [ ] Site loads in browser
- [ ] No console errors

---

## 🔍 Post-Deployment Verification

### Health Checks

```bash
# Check if health endpoint exists and responds
# Replace URL with your deployment URL
curl https://YOUR-DEPLOYMENT-URL.pages.dev/api/health
```

**Expected**: JSON response with status information

### Database Statistics

```bash
# Check database stats
npm run monitor:db

# Or directly:
npx wrangler d1 execute estateflow-db --command="SELECT industry, COUNT(*) as count FROM professionals GROUP BY industry;"
```

**Expected**: Query results (may be empty initially)

### Error Monitoring

```bash
# Monitor real-time logs
npx wrangler pages deployment tail --project-name=estateflow

# Or using npm script
npm run monitor:errors
```

**Expected**: Live log stream showing requests and responses

- [ ] Health endpoint responds
- [ ] Database queries work
- [ ] Error monitoring active

---

## 📊 Optional: Data Import

**IMPORTANT**: Only import data after deployment is verified working!

### Progressive Import Testing

```bash
# Generate test data (10 records)
npm run import:generate

# Test import (10 records)
npm run import:test

# Verify import worked
npm run import:verify

# Small batch (100 records)
npm run import:small

# Medium batch (1,000 records)
npm run import:medium

# Large batch (10,000 records)
npm run import:large

# Full production import (if applicable)
npm run import:full
```

**Never skip progressive stages!** Each stage validates the import process at scale.

- [ ] Test import (10 records) completed
- [ ] Import verified in database
- [ ] (Optional) Larger batches imported

---

## 🚨 Troubleshooting

### Authentication Issues

**Problem**: `wrangler login` fails or times out

**Solution**:
1. Check internet connection
2. Ensure browser allows popups from wrangler
3. Try manual token: `wrangler login --scopes-list` then `wrangler config set api_token YOUR_TOKEN`

### Database Creation Fails

**Problem**: `wrangler d1 create` fails

**Solution**:
1. Verify Cloudflare account has D1 enabled
2. Check account limits (free tier: 10 databases)
3. Ensure unique database name

### Migration Errors

**Problem**: Migration fails with "table already exists"

**Solution**:
1. This is expected if migration already ran
2. Check database: `npx wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table';"`
3. If tables exist, migration already completed

### Build Fails

**Problem**: `npm run build` fails with module errors

**Solution**:
1. Delete `node_modules/` and `package-lock.json`
2. Run `npm install` again
3. Check Node.js version is 18+

### Deployment Fails

**Problem**: `wrangler pages deploy` fails

**Solution**:
1. Ensure build completed successfully
2. Verify `build/client` directory exists
3. Check Cloudflare Pages limits (free tier: 500 deployments/month)
4. Try: `npx wrangler pages deploy ./build/client --project-name=estateflow --branch=main`

### Site Shows Blank Page

**Problem**: Deployment succeeds but site is blank

**Solution**:
1. Check browser console for errors
2. Verify all bindings in `wrangler.toml` are correct
3. Check build output: `ls build/client`
4. Review deployment logs: `npx wrangler pages deployment tail`

---

## 📝 Deployment Summary Template

After successful deployment, fill in this summary:

```
=================================================================
EstateFlow Multi-Industry Platform - Deployment Summary
=================================================================

Deployment Date: _______________
Deployed By: _______________

Infrastructure:
✅ D1 Database ID: _______________
✅ KV Namespaces: 4 created
✅ R2 Buckets: 5 created

Deployment:
✅ Pages Project: estateflow
✅ Deployment URL: _______________
✅ Build Version: _______________

Verification:
✅ Health check: Pass/Fail
✅ Database connection: Pass/Fail
✅ Site loads: Pass/Fail

Next Steps:
- [ ] Configure custom domain (if applicable)
- [ ] Import production data
- [ ] Set up monitoring alerts
- [ ] Configure secrets (API keys, tokens)
- [ ] Enable analytics

Notes:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

=================================================================
```

---

## 🔗 Useful References

- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **D1 Documentation**: https://developers.cloudflare.com/d1/
- **Pages Documentation**: https://developers.cloudflare.com/pages/
- **R2 Documentation**: https://developers.cloudflare.com/r2/
- **KV Documentation**: https://developers.cloudflare.com/workers/runtime-apis/kv/

- **Project README**: `./README.md`
- **AI Assistant Guide**: `./CLAUDE.md`
- **Architecture Docs**: `./docs/UNIFIED_PLATFORM_ARCHITECTURE.md`

---

## ✅ Final Verification

Before marking deployment as complete, verify ALL of the following:

- [ ] All prerequisite software installed
- [ ] Authenticated with Cloudflare
- [ ] D1 database created and migrated
- [ ] All 4 KV namespaces created
- [ ] All 5 R2 buckets created
- [ ] Dependencies installed
- [ ] Type checking passed
- [ ] Production build successful
- [ ] Deployment to Pages successful
- [ ] Site accessible via deployment URL
- [ ] Database queries work
- [ ] No critical errors in logs
- [ ] Health check endpoint responds

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

**Deployment Completed**: _______________
**Verified By**: _______________
**Signature**: _______________
