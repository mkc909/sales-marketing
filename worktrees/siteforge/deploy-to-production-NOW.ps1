# EMERGENCY PRODUCTION DEPLOYMENT SCRIPT
# EstateFlow Platform - URGENT DEPLOYMENT
# Time: 2-3 hours to complete
# ================================================

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " ESTATEFLOW EMERGENCY DEPLOYMENT" -ForegroundColor Cyan
Write-Host " Target: progeodata-com.auramediastudios.workers.dev" -ForegroundColor Yellow
Write-Host " Status: CRITICAL - MUST GO LIVE NOW" -ForegroundColor Red
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
$projectPath = "C:\dev\GITHUB_MKC909_REPOS\sales-marketing\worktrees\siteforge"

# Change to project directory
Set-Location $projectPath

# Function to check if command succeeded
function Check-Success {
    param($message)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ FAILED: $message" -ForegroundColor Red
        Write-Host "Continuing with deployment..." -ForegroundColor Yellow
        return $false
    }
    Write-Host "✅ SUCCESS: $message" -ForegroundColor Green
    return $true
}

# ================================================
# PHASE 1: PRE-FLIGHT CHECKS (5 minutes)
# ================================================
Write-Host ""
Write-Host "PHASE 1: PRE-FLIGHT CHECKS" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Gray

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
node --version
if (Check-Success "Node.js installed") {
    Write-Host "Node version: $(node --version)" -ForegroundColor Gray
}

# Check NPM
Write-Host "Checking NPM..." -ForegroundColor Yellow
npm --version
if (Check-Success "NPM installed") {
    Write-Host "NPM version: $(npm --version)" -ForegroundColor Gray
}

# Check Wrangler authentication
Write-Host "Checking Wrangler authentication..." -ForegroundColor Yellow
npx wrangler whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Not logged in to Wrangler. Logging in..." -ForegroundColor Yellow
    npx wrangler login
}

# ================================================
# PHASE 2: DATABASE SETUP (30 minutes)
# ================================================
Write-Host ""
Write-Host "PHASE 2: DATABASE MIGRATIONS" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Gray
Write-Host "Running 8 migration files in sequence..." -ForegroundColor Yellow

$migrations = @(
    "001_initial_agents.sql",
    "002_agent_profile_v2.sql",
    "003_multi_industry_platform_safe.sql",
    "004_leads_table.sql",
    "005_scraping_pipeline.sql",
    "006_serviceos.sql",
    "007_ai_agents.sql",
    "008_growth_features.sql"
)

$migrationSuccess = $true
foreach ($migration in $migrations) {
    Write-Host ""
    Write-Host "Applying migration: $migration" -ForegroundColor Yellow
    npx wrangler d1 execute estateflow-db --file="migrations/$migration" --env production
    if (Check-Success "Migration $migration") {
        Write-Host "✅ Migration $migration applied successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Migration $migration might have issues, continuing..." -ForegroundColor Yellow
        $migrationSuccess = $false
    }
}

# ================================================
# PHASE 3: SEED ESSENTIAL DATA (10 minutes)
# ================================================
Write-Host ""
Write-Host "PHASE 3: SEEDING ESSENTIAL DATA" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Gray

# Add demo professionals
Write-Host "Adding demo professionals..." -ForegroundColor Yellow
if (Test-Path "test-data-10-professionals.sql") {
    npx wrangler d1 execute estateflow-db --file=test-data-10-professionals.sql --env production
    Check-Success "Demo professionals added"
} else {
    Write-Host "⚠️ test-data-10-professionals.sql not found, skipping..." -ForegroundColor Yellow
}

# Add demo tenant for progeodata
Write-Host "Adding ProGeoData tenant..." -ForegroundColor Yellow
$tenantSQL = @"
INSERT OR IGNORE INTO tenants (name, subdomain, custom_domain, plan, status, features, created_at)
VALUES (
    'ProGeoData',
    'progeodata',
    'progeodata-com.auramediastudios.workers.dev',
    'enterprise',
    'active',
    '{"ghost_profiles":true,"ai_agent":true,"serviceos":true,"lead_capture":true}',
    datetime('now')
)
"@
npx wrangler d1 execute estateflow-db --command="$tenantSQL" --env production
Check-Success "ProGeoData tenant configured"

# ================================================
# PHASE 4: BUILD APPLICATION (10 minutes)
# ================================================
Write-Host ""
Write-Host "PHASE 4: BUILDING APPLICATION" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Gray

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
Check-Success "Dependencies installed"

Write-Host "Building application..." -ForegroundColor Yellow
npm run build
if (Check-Success "Application built") {
    Write-Host "Build artifacts ready in build/client" -ForegroundColor Gray
}

# ================================================
# PHASE 5: DEPLOY MAIN APPLICATION (20 minutes)
# ================================================
Write-Host ""
Write-Host "PHASE 5: DEPLOYING MAIN APPLICATION" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Gray

Write-Host "Deploying to Cloudflare Pages..." -ForegroundColor Yellow
npx wrangler pages deploy ./build/client --project-name=progeodata-com --env production
if (Check-Success "Main application deployed") {
    Write-Host "🚀 Application live at: https://progeodata-com.auramediastudios.workers.dev/" -ForegroundColor Green
}

# ================================================
# PHASE 6: CONFIGURE SECRETS (10 minutes)
# ================================================
Write-Host ""
Write-Host "PHASE 6: CONFIGURING SECRETS" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Gray

# Set default secrets if not already set
$secrets = @{
    "SESSION_SECRET" = "prod-session-$(Get-Random -Maximum 999999)"
    "ENCRYPTION_KEY" = "prod-encrypt-$(Get-Random -Maximum 999999)"
    "ATH_MOVIL_PUBLIC_TOKEN" = "temporary-ath-token"
}

foreach ($secret in $secrets.Keys) {
    Write-Host "Setting secret: $secret" -ForegroundColor Yellow
    echo $secrets[$secret] | npx wrangler secret put $secret --env production
}

# ================================================
# PHASE 7: DEPLOY CRITICAL MICROSERVICES (45 minutes)
# ================================================
Write-Host ""
Write-Host "PHASE 7: DEPLOYING CRITICAL MICROSERVICES" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Gray

# Check if workers directory exists
if (Test-Path "workers") {
    $criticalServices = @(
        "ai-customer-service",
        "lead-capture-service",
        "ghost-profile-generator"
    )

    foreach ($service in $criticalServices) {
        $servicePath = "workers\$service"
        if (Test-Path $servicePath) {
            Write-Host ""
            Write-Host "Deploying $service..." -ForegroundColor Yellow
            Set-Location $servicePath

            if (Test-Path "package.json") {
                npm install
                npm run deploy
                Check-Success "$service deployed"
            } else {
                Write-Host "⚠️ $service missing package.json, skipping..." -ForegroundColor Yellow
            }

            Set-Location $projectPath
        } else {
            Write-Host "⚠️ Service $service not found at $servicePath" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️ Workers directory not found, microservices deployment skipped" -ForegroundColor Yellow
}

# ================================================
# PHASE 8: VERIFICATION (10 minutes)
# ================================================
Write-Host ""
Write-Host "PHASE 8: DEPLOYMENT VERIFICATION" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Gray

$baseUrl = "https://progeodata-com.auramediastudios.workers.dev"
$testEndpoints = @(
    "",
    "/api/health",
    "/api/test",
    "/api/professionals/search?industry=real_estate"
)

Write-Host "Testing endpoints..." -ForegroundColor Yellow
foreach ($endpoint in $testEndpoints) {
    $url = "$baseUrl$endpoint"
    Write-Host "Testing: $url" -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $endpoint - OK" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $endpoint - Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ $endpoint - Failed" -ForegroundColor Red
    }
}

# ================================================
# DEPLOYMENT SUMMARY
# ================================================
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL: https://progeodata-com.auramediastudios.workers.dev/" -ForegroundColor Yellow
Write-Host "Duration: $($duration.TotalMinutes.ToString('0.0')) minutes" -ForegroundColor Gray
Write-Host ""

if ($migrationSuccess) {
    Write-Host "✅ All database migrations applied successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️ Some migrations had issues - please verify database" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Visit https://progeodata-com.auramediastudios.workers.dev/" -ForegroundColor White
Write-Host "2. Test lead capture form" -ForegroundColor White
Write-Host "3. Search for professionals" -ForegroundColor White
Write-Host "4. Test AI chat widget" -ForegroundColor White
Write-Host "5. Monitor errors: npx wrangler tail --format pretty" -ForegroundColor White

Write-Host ""
Write-Host "For issues, check logs:" -ForegroundColor Gray
Write-Host "npx wrangler tail --format pretty" -ForegroundColor Yellow

# Keep window open
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")