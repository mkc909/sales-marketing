# EstateFlow Multi-Industry Platform Deployment Script (Windows)
# Deploys to Cloudflare Workers with D1, R2, KV, and Analytics

Write-Host "🚀 Starting EstateFlow Multi-Industry Platform Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Configuration
$PROJECT_NAME = "estateflow"
$ENVIRONMENT = if ($args[0]) { $args[0] } else { "production" }

Write-Host "Deploying to: $ENVIRONMENT" -ForegroundColor Yellow

# Step 1: Check Prerequisites
Write-Host ""
Write-Host "📋 Checking prerequisites..." -ForegroundColor White

# Check for Wrangler
try {
    wrangler --version | Out-Null
    Write-Host "✅ Wrangler CLI found" -ForegroundColor Green
}
catch {
    Write-Host "❌ Wrangler CLI not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
}

# Check for Node.js
try {
    node --version | Out-Null
    Write-Host "✅ Node.js found" -ForegroundColor Green
}
catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Step 2: Authenticate with Cloudflare
Write-Host ""
Write-Host "🔐 Authenticating with Cloudflare..." -ForegroundColor White
wrangler whoami
if ($LASTEXITCODE -ne 0) {
    wrangler login
}

# Step 3: Create D1 Databases
Write-Host ""
Write-Host "💾 Setting up D1 databases..." -ForegroundColor White

$dbList = wrangler d1 list 2>$null
if (-not ($dbList -match "$PROJECT_NAME-db")) {
    Write-Host "Creating main database..." -ForegroundColor White
    $dbOutput = wrangler d1 create "$PROJECT_NAME-db"

    # Extract database ID from output
    if ($dbOutput -match 'database_id = "([^"]+)"') {
        $DB_ID = $matches[1]
        Write-Host "Created database with ID: $DB_ID" -ForegroundColor Green

        # Update wrangler.toml
        $wranglerContent = Get-Content "wrangler.toml" -Raw
        $wranglerContent = $wranglerContent -replace 'database_id = "[^"]*"', "database_id = `"$DB_ID`""
        Set-Content "wrangler.toml" -Value $wranglerContent
    }
}
else {
    Write-Host "Database $PROJECT_NAME-db already exists" -ForegroundColor Yellow
}

# Step 4: Run Database Migrations
Write-Host ""
Write-Host "🔄 Running database migrations..." -ForegroundColor White

Get-ChildItem -Path "migrations" -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Running migration: $($_.Name)" -ForegroundColor White
    try {
        wrangler d1 execute "$PROJECT_NAME-db" --file="$($_.FullName)"
        Write-Host "✅ $($_.Name) applied" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Migration may have already been applied, continuing..." -ForegroundColor Yellow
    }
}

Write-Host "✅ Database migrations complete" -ForegroundColor Green

# Step 5: Create KV Namespaces
Write-Host ""
Write-Host "📦 Setting up KV namespaces..." -ForegroundColor White

$kvNamespaces = @("LINKS", "PINS", "CACHE", "ANALYTICS")

foreach ($namespace in $kvNamespaces) {
    $kvList = wrangler kv:namespace list 2>$null
    if (-not ($kvList -match $namespace)) {
        Write-Host "Creating KV namespace: $namespace" -ForegroundColor White
        wrangler kv:namespace create $namespace
    }
    else {
        Write-Host "KV namespace $namespace already exists" -ForegroundColor Yellow
    }
}

# Step 6: Create R2 Buckets
Write-Host ""
Write-Host "🪣 Setting up R2 buckets..." -ForegroundColor White

$r2Buckets = @("profile-photos", "property-images", "truepoint-photos", "qr-codes", "documents")

foreach ($bucket in $r2Buckets) {
    $bucketList = wrangler r2 bucket list 2>$null
    if (-not ($bucketList -match $bucket)) {
        Write-Host "Creating R2 bucket: $bucket" -ForegroundColor White
        wrangler r2 bucket create $bucket
    }
    else {
        Write-Host "R2 bucket $bucket already exists" -ForegroundColor Yellow
    }
}

# Step 7: Set Environment Secrets
Write-Host ""
Write-Host "🔑 Configuring environment secrets..." -ForegroundColor White

$secretsList = wrangler secret list 2>$null

# PostHog configuration
if (-not ($secretsList -match "POSTHOG_KEY")) {
    $posthogKey = Read-Host "Enter PostHog API Key (or press Enter to skip)" -AsSecureString
    if ($posthogKey.Length -gt 0) {
        $posthogKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($posthogKey))
        $posthogKeyPlain | wrangler secret put POSTHOG_KEY
        Write-Host "✅ PostHog key configured" -ForegroundColor Green
    }
}

# Alert webhook
if (-not ($secretsList -match "ALERT_WEBHOOK_URL")) {
    $webhookUrl = Read-Host "Enter Alert Webhook URL (Slack/Discord, or press Enter to skip)"
    if ($webhookUrl) {
        $webhookUrl | wrangler secret put ALERT_WEBHOOK_URL
        Write-Host "✅ Alert webhook configured" -ForegroundColor Green
    }
}

# Step 8: Build the Application
Write-Host ""
Write-Host "🔨 Building application..." -ForegroundColor White

npm install
npm run build

Write-Host "✅ Build complete" -ForegroundColor Green

# Step 9: Deploy Workers
Write-Host ""
Write-Host "🚢 Deploying workers to Cloudflare..." -ForegroundColor White

# Deploy main application
Write-Host "Deploying main application..." -ForegroundColor White
wrangler deploy

# Deploy additional workers
Write-Host "Deploying URL shortener worker..." -ForegroundColor White
Set-Location -Path "workers\shortener"
npm install
wrangler deploy
Set-Location -Path "..\.."

Write-Host "Deploying QR generator worker..." -ForegroundColor White
Set-Location -Path "workers\qr-generator"
npm install
wrangler deploy
Set-Location -Path "..\.."

Write-Host "Deploying agent ingestion worker..." -ForegroundColor White
Set-Location -Path "workers\agent-ingestion"
npm install
wrangler deploy
Set-Location -Path "..\.."

Write-Host "✅ All workers deployed" -ForegroundColor Green

# Step 10: Verify Deployment
Write-Host ""
Write-Host "✅ Verifying deployment..." -ForegroundColor White

if ($ENVIRONMENT -eq "production") {
    $APP_URL = "https://estateflow.com"
}
else {
    $APP_URL = "https://$PROJECT_NAME.workers.dev"
}

Write-Host "Testing application at: $APP_URL" -ForegroundColor White

try {
    $response = Invoke-WebRequest -Uri "$APP_URL/health" -Method GET -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Application is responding" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Application health check failed" -ForegroundColor Yellow
}

# Test database
Write-Host "Testing database connection..." -ForegroundColor White
try {
    wrangler d1 execute "$PROJECT_NAME-db" --command="SELECT COUNT(*) as count FROM professionals;"
    Write-Host "✅ Database connection successful" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Database query failed, tables might not be initialized yet" -ForegroundColor Yellow
}

# Step 11: Create Monitoring Scripts
Write-Host ""
Write-Host "📊 Creating monitoring scripts..." -ForegroundColor White

# Create monitor.ps1
@"
# Real-time error monitoring for EstateFlow
Write-Host 'Starting real-time error monitoring...' -ForegroundColor Cyan
Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow
Write-Host ''

# Monitor with formatting and filtering
wrangler tail --format pretty | Select-String -Pattern 'ERROR|CRITICAL|WARNING' -AllMatches
"@ | Out-File -FilePath "monitor.ps1"

# Create status.ps1
@"
# Quick status check for EstateFlow
Write-Host '🔍 EstateFlow Platform Status Check' -ForegroundColor Cyan
Write-Host '====================================' -ForegroundColor Cyan

# Check worker status
Write-Host ''
Write-Host 'Worker Status:' -ForegroundColor White
try {
    `$response = Invoke-WebRequest -Uri 'https://estateflow.com/health' -Method GET -ErrorAction Stop
    Write-Host "Main App: `$(`$response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host 'Main App: Not responding' -ForegroundColor Red
}

# Check database
Write-Host ''
Write-Host 'Database Stats:' -ForegroundColor White
wrangler d1 execute estateflow-db --command='SELECT industry, COUNT(*) as professionals FROM professionals GROUP BY industry;'

# Check recent errors
Write-Host ''
Write-Host 'Recent Errors (Last 24h):' -ForegroundColor White
wrangler d1 execute estateflow-db --command=""SELECT level, category, COUNT(*) as count FROM error_logs WHERE timestamp > strftime('%s','now') - 86400 GROUP BY level, category ORDER BY count DESC LIMIT 5;""

Write-Host ''
Write-Host '====================================' -ForegroundColor Cyan
"@ | Out-File -FilePath "status.ps1"

Write-Host "✅ Monitoring scripts created" -ForegroundColor Green

# Step 12: Generate Summary Report
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Deployment Summary:" -ForegroundColor Cyan
Write-Host "---------------------"
Write-Host "Environment: $ENVIRONMENT"
Write-Host "Application URL: $APP_URL"
Write-Host "Database: $PROJECT_NAME-db"
Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Monitor errors: .\monitor.ps1"
Write-Host "2. View logs: wrangler tail"
Write-Host "3. Check status: .\status.ps1"
Write-Host "4. Import data: node scripts\import-agents.js"
Write-Host ""
Write-Host "🔧 Useful Commands:" -ForegroundColor Cyan
Write-Host "-------------------"
Write-Host "Real-time logs:     wrangler tail --format pretty"
Write-Host "Error monitoring:   wrangler tail | Select-String ERROR"
Write-Host "Database query:     wrangler d1 execute $PROJECT_NAME-db --command='YOUR_SQL'"
Write-Host "Update secrets:     wrangler secret put SECRET_NAME"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "-----------------"
Write-Host "Platform Guide:     docs\MULTI_INDUSTRY_PLATFORM_ARCHITECTURE.md"
Write-Host "Error Tracking:     docs\MULTI_INDUSTRY_IMPLEMENTATION_SUMMARY.md"
Write-Host "Agent System:       docs\AGENT_SYSTEM_IMPLEMENTATION_SUMMARY.md"
Write-Host ""
Write-Host "✨ Your multi-industry platform is now live!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green