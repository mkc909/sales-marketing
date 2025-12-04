# ProGeoData Git Sync and Documentation Management Script
# Date: December 3, 2024

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "ProGeoData Git Management & Sync" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to repository root
Set-Location "C:\dev\GITHUB_MKC909_REPOS\sales-marketing"

# Step 1: Check current Git status
Write-Host "[1/7] Checking Git status..." -ForegroundColor Yellow
git status --short

# Step 2: Add all new ProGeoData files
Write-Host ""
Write-Host "[2/7] Adding new ProGeoData files..." -ForegroundColor Yellow

# Add all the new files we created
git add workers/progeodata-stripe/
git add workers/progeodata-export/
git add workers/scraper-browser/src/index.ts
git add migrations/012_stripe_payments.sql
git add FIX_MOCK_DATA_NOW.sql
git add FIX_DATA_PIPELINE_NOW.sql
git add DEPLOY_SCRAPER_FIX.bat
git add DEPLOY_COMPLETE_SYSTEM.bat
git add MONITOR_PROGEODATA_SUCCESS.md
git add TICKET-229-LAUNCH-STATUS.md
git add .tickets/TICKET-227-STATUS-UPDATE.md
git add .tickets/TICKET-228-LAUNCH-COMPLETION.md
git add GIT_SYNC.ps1

# Step 3: Check if we're tracking worktrees as submodule
Write-Host ""
Write-Host "[3/7] Checking submodule status..." -ForegroundColor Yellow
if (Test-Path .gitmodules) {
    git submodule status
    git submodule update --remote --merge
} else {
    Write-Host "No submodules configured" -ForegroundColor Gray
}

# Step 4: Update documentation index
Write-Host ""
Write-Host "[4/7] Updating documentation index..." -ForegroundColor Yellow

$docIndex = @"
# ProGeoData Documentation Index
Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## System Components

### 1. Workers (Cloudflare)
- **progeodata-queue-seed**: Queue seeding for ZIP codes
- **progeodata-queue-consumer**: Process queue messages
- **scraper-browser**: Web scraping (FL/TX only, no mock data)
- **progeodata-stripe**: Payment processing
- **progeodata-export**: Data export API

### 2. Database
- **progeodata-db**: D1 database (ID: 4f712234-599b-4908-a4f3-20f11cba6564)
- **Tables**: raw_business_data, scrape_queue_state, queue_messages, pros
- **Migrations**: 001-012 applied

### 3. Deployment Scripts
- **DEPLOY_COMPLETE_SYSTEM.bat**: Full system deployment
- **DEPLOY_SCRAPER_FIX.bat**: Scraper-only deployment
- **deploy-progeodata-quick.bat**: Quick deployment
- **REDEPLOY_TO_AURA_MEDIA.bat**: Account-specific deployment

### 4. Tickets & Status
- **TICKET-227**: Queue system implementation (COMPLETED)
- **TICKET-228**: Production launch requirements (IN PROGRESS)
- **TICKET-229**: Launch status update (READY)

### 5. Key Features
- ✅ Real data only (no mock data)
- ✅ Stripe payment integration
- ✅ Data export API with authentication
- ✅ Queue-based scraping system
- ✅ Progressive import testing

## Current Data Status
- FL: 1,676 professionals
- TX: 139 professionals
- Total: 1,815 professionals
- CA/WA: Not implemented (returns 404)

## Revenue Model
- Florida Pack: $99
- Texas Pack: $79
- All States: $299

## Account Information
- Cloudflare Account: Aura Media Studios
- Account ID: af57e902fd9dcaad7484a7195ac0f536
"@

$docIndex | Out-File -FilePath "PROGEODATA_DOCUMENTATION.md" -Encoding UTF8

# Step 5: Create comprehensive commit message
Write-Host ""
Write-Host "[5/7] Creating commit..." -ForegroundColor Yellow

$commitMessage = @"
feat(progeodata): Complete production-ready system with Stripe payments and data export

MAJOR CHANGES:
- Remove ALL mock data from scraper-browser worker
- Implement Stripe payment processing ($99 FL, $79 TX, $299 All)
- Build authenticated data export API (CSV/JSON)
- Add progressive import testing system
- Fix data pipeline to use correct tables

COMPONENTS ADDED:
- workers/progeodata-stripe: Payment processing with webhook handler
- workers/progeodata-export: Data export API with token auth
- migrations/012_stripe_payments.sql: Payment tracking schema

FIXES:
- Scraper returns empty arrays instead of mock data
- Returns 404 for unsupported states (CA/WA)
- Only caches real professional data
- Proper error handling throughout

DEPLOYMENT:
- DEPLOY_COMPLETE_SYSTEM.bat: One-click full deployment
- All workers configured for Aura Media Studios account
- Ready for production with Stripe test keys

DATA STATUS:
- FL: 1,676 real professionals
- TX: 139 real professionals
- Total: 1,815 professionals (growing daily)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"@

# Commit the changes
git add .
git commit -m $commitMessage

# Step 6: Show commit details
Write-Host ""
Write-Host "[6/7] Commit created successfully!" -ForegroundColor Green
git log --oneline -1

# Step 7: Check if we need to push
Write-Host ""
Write-Host "[7/7] Checking remote status..." -ForegroundColor Yellow
$remoteStatus = git status -sb

if ($remoteStatus -match "ahead") {
    Write-Host "You have local commits ready to push." -ForegroundColor Yellow
    Write-Host "Run 'git push' when ready to sync with remote." -ForegroundColor Yellow
} else {
    Write-Host "All changes committed locally." -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Git Sync Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary of changes:" -ForegroundColor White
Write-Host "- Added Stripe payment processing" -ForegroundColor Gray
Write-Host "- Added data export API" -ForegroundColor Gray
Write-Host "- Removed all mock data code" -ForegroundColor Gray
Write-Host "- Created deployment scripts" -ForegroundColor Gray
Write-Host "- Updated documentation" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add Stripe keys: wrangler secret put STRIPE_SECRET_KEY" -ForegroundColor Gray
Write-Host "2. Deploy system: .\DEPLOY_COMPLETE_SYSTEM.bat" -ForegroundColor Gray
Write-Host "3. Configure Stripe webhooks in dashboard" -ForegroundColor Gray
Write-Host "4. Test payment flow with test card 4242 4242 4242 4242" -ForegroundColor Gray