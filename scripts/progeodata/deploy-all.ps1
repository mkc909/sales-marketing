# ProGeoData Cron Worker System Deployment Script for Windows
# PowerShell script for complete deployment

Write-Host "ProGeoData Cron Worker System Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator (some operations may need elevation)
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator. Some operations may fail." -ForegroundColor Yellow
}

# Function to check command existence
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command "wrangler")) {
    Write-Host "ERROR: Wrangler CLI not found. Install with: npm install -g wrangler" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "ERROR: npm not found. Install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check Wrangler authentication
Write-Host "Checking Wrangler authentication..." -ForegroundColor Yellow
$whoami = wrangler whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not authenticated with Wrangler. Run: wrangler login" -ForegroundColor Red
    exit 1
}
Write-Host "Authenticated as: $whoami" -ForegroundColor Green

# Set working directory to repository root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
Set-Location $repoRoot
Write-Host "Working directory: $repoRoot" -ForegroundColor Gray

# Create or verify D1 database
Write-Host ""
Write-Host "Setting up D1 database..." -ForegroundColor Yellow

$dbList = wrangler d1 list --json | ConvertFrom-Json
$dbExists = $dbList | Where-Object { $_.name -eq "progeodata" }

if ($dbExists) {
    Write-Host "Database 'progeodata' already exists with ID: $($dbExists.uuid)" -ForegroundColor Green
    $DB_ID = $dbExists.uuid
} else {
    Write-Host "Creating D1 database 'progeodata'..." -ForegroundColor Yellow
    $createResult = wrangler d1 create progeodata --json | ConvertFrom-Json
    $DB_ID = $createResult.uuid
    Write-Host "Database created with ID: $DB_ID" -ForegroundColor Green
}

# Apply database migrations
Write-Host ""
Write-Host "Applying database migrations..." -ForegroundColor Yellow
$migrationFile = Join-Path $repoRoot "migrations\progeodata\001_queue_management.sql"

if (Test-Path $migrationFile) {
    wrangler d1 execute progeodata --file="$migrationFile"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migrations applied successfully" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Migration may have failed or already exists" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Migration file not found at $migrationFile" -ForegroundColor Red
    exit 1
}

# Create Cloudflare Queues
Write-Host ""
Write-Host "Setting up Cloudflare Queues..." -ForegroundColor Yellow

# Check if queue exists (Wrangler doesn't have a list command for queues yet)
Write-Host "Creating progeodata-zip-queue..." -ForegroundColor Gray
wrangler queues create progeodata-zip-queue 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Queue 'progeodata-zip-queue' created successfully" -ForegroundColor Green
} else {
    Write-Host "Queue 'progeodata-zip-queue' already exists or creation failed" -ForegroundColor Yellow
}

Write-Host "Creating progeodata-dlq (Dead Letter Queue)..." -ForegroundColor Gray
wrangler queues create progeodata-dlq 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Queue 'progeodata-dlq' created successfully" -ForegroundColor Green
} else {
    Write-Host "Queue 'progeodata-dlq' already exists or creation failed" -ForegroundColor Yellow
}

# Update wrangler.toml files with correct database ID
Write-Host ""
Write-Host "Updating configuration files with database ID..." -ForegroundColor Yellow

$wranglerFiles = @(
    "workers\progeodata-seed\wrangler.toml",
    "workers\progeodata-consumer\wrangler.toml",
    "workers\progeodata-coordinator\wrangler.toml"
)

foreach ($file in $wranglerFiles) {
    $filePath = Join-Path $repoRoot $file
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        $content = $content -replace 'database_id = "YOUR_DATABASE_ID_HERE"', "database_id = `"$DB_ID`""
        Set-Content $filePath $content
        Write-Host "Updated: $file" -ForegroundColor Gray
    } else {
        Write-Host "WARNING: File not found: $file" -ForegroundColor Yellow
    }
}

# Deploy workers
Write-Host ""
Write-Host "Deploying workers..." -ForegroundColor Yellow

# Deploy Seed Worker
Write-Host ""
Write-Host "Deploying Seed Worker..." -ForegroundColor Cyan
Set-Location (Join-Path $repoRoot "workers\progeodata-seed")
if (Test-Path "package.json") {
    npm install --silent
    wrangler deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Seed Worker deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Seed Worker deployment failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ERROR: Seed Worker package.json not found" -ForegroundColor Red
    exit 1
}

# Deploy Consumer Worker(s)
Write-Host ""
Write-Host "Deploying Consumer Worker..." -ForegroundColor Cyan
Set-Location (Join-Path $repoRoot "workers\progeodata-consumer")
if (Test-Path "package.json") {
    npm install --silent

    # Deploy primary consumer
    wrangler deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Consumer Worker (primary) deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Consumer Worker deployment failed" -ForegroundColor Red
        exit 1
    }

    # Optionally deploy additional consumer instances
    $deployMultiple = Read-Host "Deploy multiple consumer instances? (y/n)"
    if ($deployMultiple -eq "y") {
        $numWorkers = Read-Host "How many additional workers? (1-9)"
        for ($i = 2; $i -le ($numWorkers + 1); $i++) {
            $envName = "worker" + $i.ToString("00")
            Write-Host "Deploying consumer-$i..." -ForegroundColor Gray
            wrangler deploy --env $envName
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Consumer Worker $i deployed successfully" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "ERROR: Consumer Worker package.json not found" -ForegroundColor Red
    exit 1
}

# Deploy Coordinator Worker
Write-Host ""
Write-Host "Deploying Coordinator Worker..." -ForegroundColor Cyan
Set-Location (Join-Path $repoRoot "workers\progeodata-coordinator")
if (Test-Path "package.json") {
    npm install --silent
    wrangler deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Coordinator Worker deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Coordinator Worker deployment failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ERROR: Coordinator Worker package.json not found" -ForegroundColor Red
    exit 1
}

# Return to repo root
Set-Location $repoRoot

# Deployment summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database ID: $DB_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployed Components:" -ForegroundColor Yellow
Write-Host "  - D1 Database: progeodata" -ForegroundColor Gray
Write-Host "  - Queue: progeodata-zip-queue" -ForegroundColor Gray
Write-Host "  - Queue: progeodata-dlq" -ForegroundColor Gray
Write-Host "  - Worker: progeodata-seed" -ForegroundColor Gray
Write-Host "  - Worker: progeodata-consumer" -ForegroundColor Gray
Write-Host "  - Worker: progeodata-coordinator" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test Stage 1: cd workers\progeodata-seed && npm run test:stage1" -ForegroundColor Gray
Write-Host "2. Monitor workers: wrangler tail progeodata-consumer" -ForegroundColor Gray
Write-Host "3. View dashboard: https://progeodata-coordinator.[your-subdomain].workers.dev/dashboard" -ForegroundColor Gray
Write-Host "4. Check queue status: https://progeodata-coordinator.[your-subdomain].workers.dev/status" -ForegroundColor Gray
Write-Host ""
Write-Host "Monitoring Commands:" -ForegroundColor Yellow
Write-Host "  wrangler tail progeodata-consumer" -ForegroundColor Gray
Write-Host "  wrangler tail progeodata-coordinator" -ForegroundColor Gray
Write-Host "  wrangler d1 execute progeodata --command='SELECT COUNT(*) FROM pros'" -ForegroundColor Gray
Write-Host ""