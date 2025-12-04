# ProGeoData Cron Worker Deployment Script
# Automates deployment of the 24/7 database population system
#
# Components:
# 1. D1 database migration (queue tables)
# 2. Cloudflare Queues creation
# 3. KV namespaces creation
# 4. Worker deployments (seed + consumer)
# 5. Initial queue seed
# 6. Verification

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipMigration,

    [Parameter(Mandatory=$false)]
    [switch]$SkipDependencies,

    [Parameter(Mandatory=$false)]
    [switch]$TestMode,

    [Parameter(Mandatory=$false)]
    [string]$DatabaseId = "",

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "→ $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Header { Write-Host "`n=== $args ===" -ForegroundColor Magenta }

# Configuration
$ACCOUNT_ID = "af57e902fd9dcaad7484a7195ac0f536"
$DB_NAME = "estateflow-db"
$QUEUE_NAME = "progeodata-scrape-queue"
$DLQ_NAME = "progeodata-scrape-dlq"
$SEED_KV_NAME = "progeodata-seed-state"
$RATE_LIMIT_KV_NAME = "progeodata-rate-limit-state"

$REPO_ROOT = "c:\dev\GITHUB_MKC909_REPOS\sales-marketing"
$SITEFORGE_ROOT = "$REPO_ROOT\worktrees\siteforge"
$SEED_WORKER_DIR = "$REPO_ROOT\workers\progeodata-queue-seed"
$CONSUMER_WORKER_DIR = "$REPO_ROOT\workers\progeodata-queue-consumer"

Write-Header "ProGeoData Cron Worker Deployment"
Write-Info "Repository: $REPO_ROOT"
Write-Info "Account ID: $ACCOUNT_ID"

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No actual changes will be made"
}

# Step 1: Check prerequisites
Write-Header "Step 1: Prerequisites Check"

# Check wrangler
try {
    $wranglerVersion = wrangler --version
    Write-Success "Wrangler installed: $wranglerVersion"
} catch {
    Write-Error "Wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
}

# Check authentication
Write-Info "Checking Wrangler authentication..."
try {
    $authCheck = wrangler whoami 2>&1
    if ($authCheck -match "not authenticated") {
        Write-Error "Not authenticated. Run: wrangler login"
        exit 1
    }
    Write-Success "Wrangler authenticated"
} catch {
    Write-Warning "Could not verify authentication, proceeding anyway..."
}

# Check if directories exist
$dirsToCheck = @($SITEFORGE_ROOT, $SEED_WORKER_DIR, $CONSUMER_WORKER_DIR)
foreach ($dir in $dirsToCheck) {
    if (-not (Test-Path $dir)) {
        Write-Error "Directory not found: $dir"
        exit 1
    }
}
Write-Success "All required directories exist"

# Step 2: Get or create D1 database
Write-Header "Step 2: D1 Database Setup"

if ($DatabaseId -eq "") {
    Write-Info "Looking up D1 database '$DB_NAME'..."
    try {
        $dbList = wrangler d1 list --json 2>&1 | ConvertFrom-Json
        $existingDb = $dbList | Where-Object { $_.name -eq $DB_NAME }

        if ($existingDb) {
            $DatabaseId = $existingDb.uuid
            Write-Success "Found existing database: $DB_NAME (ID: $DatabaseId)"
        } else {
            if (-not $DryRun) {
                Write-Info "Creating new D1 database: $DB_NAME"
                $createResult = wrangler d1 create $DB_NAME --json 2>&1 | ConvertFrom-Json
                $DatabaseId = $createResult.uuid
                Write-Success "Created database: $DB_NAME (ID: $DatabaseId)"
            } else {
                Write-Warning "Would create D1 database: $DB_NAME"
            }
        }
    } catch {
        Write-Error "Failed to setup D1 database: $_"
        exit 1
    }
} else {
    Write-Success "Using provided database ID: $DatabaseId"
}

# Step 3: Apply D1 migration
Write-Header "Step 3: Apply D1 Migration"

if (-not $SkipMigration) {
    $migrationFile = "$SITEFORGE_ROOT\migrations\010_queue_tables.sql"

    if (-not (Test-Path $migrationFile)) {
        Write-Error "Migration file not found: $migrationFile"
        exit 1
    }

    Write-Info "Applying migration: 010_queue_tables.sql"

    if (-not $DryRun) {
        try {
            wrangler d1 execute $DB_NAME --file="$migrationFile"
            Write-Success "Migration applied successfully"
        } catch {
            Write-Error "Migration failed: $_"
            Write-Warning "If tables already exist, this is expected. Continuing..."
        }
    } else {
        Write-Warning "Would apply migration: $migrationFile"
    }
} else {
    Write-Warning "Skipping migration (--SkipMigration flag)"
}

# Step 4: Create Cloudflare Queues
Write-Header "Step 4: Cloudflare Queues Setup"

function Create-Queue {
    param($QueueName)

    Write-Info "Checking queue: $QueueName"
    try {
        # Try to get queue info (will fail if doesn't exist)
        $queueCheck = wrangler queues list 2>&1
        if ($queueCheck -match $QueueName) {
            Write-Success "Queue already exists: $QueueName"
            return $true
        }
    } catch {
        # Queue doesn't exist, continue to create
    }

    if (-not $DryRun) {
        try {
            Write-Info "Creating queue: $QueueName"
            wrangler queues create $QueueName
            Write-Success "Created queue: $QueueName"
            return $true
        } catch {
            Write-Error "Failed to create queue: $QueueName - $_"
            return $false
        }
    } else {
        Write-Warning "Would create queue: $QueueName"
        return $true
    }
}

$queuesOk = $true
$queuesOk = $queuesOk -and (Create-Queue $QUEUE_NAME)
$queuesOk = $queuesOk -and (Create-Queue $DLQ_NAME)

if (-not $queuesOk) {
    Write-Error "Failed to create all required queues"
    exit 1
}

# Step 5: Create KV Namespaces
Write-Header "Step 5: KV Namespaces Setup"

function Create-KVNamespace {
    param($KVName)

    Write-Info "Checking KV namespace: $KVName"
    try {
        $kvList = wrangler kv:namespace list 2>&1 | ConvertFrom-Json
        $existingKV = $kvList | Where-Object { $_.title -eq $KVName }

        if ($existingKV) {
            Write-Success "KV namespace already exists: $KVName (ID: $($existingKV.id))"
            return $existingKV.id
        }
    } catch {
        # KV doesn't exist, continue to create
    }

    if (-not $DryRun) {
        try {
            Write-Info "Creating KV namespace: $KVName"
            $createResult = wrangler kv:namespace create $KVName 2>&1
            # Extract ID from output (format varies)
            if ($createResult -match "id\s*=\s*[`"']([a-f0-9]+)[`"']") {
                $kvId = $Matches[1]
                Write-Success "Created KV namespace: $KVName (ID: $kvId)"
                return $kvId
            } else {
                Write-Warning "Created KV namespace but couldn't parse ID: $createResult"
                return "check-wrangler-output"
            }
        } catch {
            Write-Error "Failed to create KV namespace: $KVName - $_"
            return $null
        }
    } else {
        Write-Warning "Would create KV namespace: $KVName"
        return "dry-run-id"
    }
}

$seedKVId = Create-KVNamespace $SEED_KV_NAME
$rateLimitKVId = Create-KVNamespace $RATE_LIMIT_KV_NAME

if (-not $seedKVId -or -not $rateLimitKVId) {
    Write-Error "Failed to create all required KV namespaces"
    exit 1
}

# Step 6: Update wrangler.toml files with resource IDs
Write-Header "Step 6: Update Wrangler Configuration"

function Update-WranglerToml {
    param($FilePath, $DatabaseId, $KVId, $KVBinding)

    if (-not (Test-Path $FilePath)) {
        Write-Warning "Wrangler.toml not found: $FilePath"
        return
    }

    if ($DryRun) {
        Write-Warning "Would update: $FilePath"
        return
    }

    try {
        $content = Get-Content $FilePath -Raw

        # Update database_id if present
        if ($content -match 'database_id = "[^"]*"' -or $content -match "database_id = 'your-database-id-here'") {
            $content = $content -replace 'database_id = "[^"]*"', "database_id = `"$DatabaseId`""
            $content = $content -replace "database_id = 'your-database-id-here'", "database_id = `"$DatabaseId`""
        }

        # Update KV namespace ID if present and binding matches
        if ($KVId -and $KVBinding -and ($content -match "binding = `"$KVBinding`"")) {
            $content = $content -replace "(binding = `"$KVBinding`"[^\]]*id = )[`"'][^`"']*[`"']", "`${1}`"$KVId`""
            $content = $content -replace "(binding = `"$KVBinding`"[^\]]*id = )'your-kv-namespace-id-here'", "`${1}`"$KVId`""
        }

        Set-Content $FilePath -Value $content -NoNewline
        Write-Success "Updated: $FilePath"
    } catch {
        Write-Warning "Could not update $FilePath : $_"
    }
}

Update-WranglerToml "$SEED_WORKER_DIR\wrangler.toml" $DatabaseId $seedKVId "SEED_STATE"
Update-WranglerToml "$CONSUMER_WORKER_DIR\wrangler.toml" $DatabaseId $rateLimitKVId "RATE_LIMIT_STATE"

# Step 7: Install dependencies
Write-Header "Step 7: Install Dependencies"

if (-not $SkipDependencies) {
    $workersToInstall = @($SEED_WORKER_DIR, $CONSUMER_WORKER_DIR)

    foreach ($workerDir in $workersToInstall) {
        Write-Info "Installing dependencies: $(Split-Path $workerDir -Leaf)"

        if (-not $DryRun) {
            Push-Location $workerDir
            try {
                npm install --silent
                Write-Success "Dependencies installed"
            } catch {
                Write-Warning "npm install failed: $_"
            }
            Pop-Location
        } else {
            Write-Warning "Would run: npm install in $workerDir"
        }
    }
} else {
    Write-Warning "Skipping dependency installation (--SkipDependencies flag)"
}

# Step 8: Deploy workers
Write-Header "Step 8: Deploy Workers"

function Deploy-Worker {
    param($WorkerDir, $WorkerName)

    Write-Info "Deploying worker: $WorkerName"

    if (-not $DryRun) {
        Push-Location $WorkerDir
        try {
            wrangler deploy
            Write-Success "Deployed: $WorkerName"
            return $true
        } catch {
            Write-Error "Deployment failed for $WorkerName : $_"
            return $false
        } finally {
            Pop-Location
        }
    } else {
        Write-Warning "Would deploy: $WorkerName from $WorkerDir"
        return $true
    }
}

$deploymentOk = $true
$deploymentOk = $deploymentOk -and (Deploy-Worker $SEED_WORKER_DIR "progeodata-queue-seed")
$deploymentOk = $deploymentOk -and (Deploy-Worker $CONSUMER_WORKER_DIR "progeodata-queue-consumer")

if (-not $deploymentOk) {
    Write-Error "Worker deployment failed"
    exit 1
}

# Step 9: Trigger initial seed
Write-Header "Step 9: Initial Queue Seed"

if (-not $DryRun) {
    Write-Info "Triggering initial queue seed (test mode)..."

    $seedMode = if ($TestMode) { "test" } else { "production" }
    $seedUrl = "https://progeodata-queue-seed.your-subdomain.workers.dev/seed"

    try {
        $seedPayload = @{
            mode = $seedMode
            states = @("FL", "TX", "CA")
        } | ConvertTo-Json

        Write-Info "Calling: POST $seedUrl with mode=$seedMode"
        $response = Invoke-RestMethod -Uri $seedUrl -Method Post -Body $seedPayload -ContentType "application/json" -ErrorAction Stop

        Write-Success "Seed completed:"
        Write-Info "  Queued: $($response.result.queued)"
        Write-Info "  Skipped: $($response.result.skipped)"
        Write-Info "  Errors: $($response.result.errors)"

        if ($response.result.errors -gt 0) {
            Write-Warning "Some items failed to queue"
        }
    } catch {
        Write-Warning "Could not trigger seed automatically: $_"
        Write-Info "You can trigger manually with:"
        Write-Info "  curl -X POST $seedUrl -H 'Content-Type: application/json' -d '{`"mode`":`"$seedMode`",`"states`":[`"FL`",`"TX`",`"CA`"]}'"
    }
} else {
    Write-Warning "Would trigger initial queue seed in $(if ($TestMode) { 'test' } else { 'production' }) mode"
}

# Step 10: Verification
Write-Header "Step 10: Verification"

if (-not $DryRun) {
    Write-Info "Checking deployment status..."

    # Check workers
    try {
        $workers = @("progeodata-queue-seed", "progeodata-queue-consumer")
        $workerList = wrangler deployments list --name=progeodata-queue-seed 2>&1

        foreach ($worker in $workers) {
            $deployments = wrangler deployments list --name=$worker 2>&1
            if ($deployments -match "Created") {
                Write-Success "Worker deployed: $worker"
            } else {
                Write-Warning "Could not verify deployment: $worker"
            }
        }
    } catch {
        Write-Warning "Could not verify worker deployments: $_"
    }

    # Check queue status
    Write-Info "Checking queue status (if seed was triggered)..."
    try {
        $statusUrl = "https://progeodata-queue-seed.your-subdomain.workers.dev/status"
        $status = Invoke-RestMethod -Uri $statusUrl -Method Get -ErrorAction Stop

        Write-Success "Queue status retrieved:"
        if ($status.stats -and $status.stats.Count -gt 0) {
            foreach ($stat in $status.stats) {
                Write-Info "  $($stat.state)-$($stat.source_type): $($stat.count) items in status '$($stat.status)'"
            }
        } else {
            Write-Info "  No items in queue yet"
        }
    } catch {
        Write-Warning "Could not retrieve queue status: $_"
    }

    Write-Success "`nDeployment Complete!"
    Write-Info "`nNext steps:"
    Write-Info "1. Monitor queue processing: wrangler tail progeodata-queue-consumer"
    Write-Info "2. Check queue status: curl https://progeodata-queue-seed.your-subdomain.workers.dev/status"
    Write-Info "3. View consumer stats: curl https://progeodata-queue-consumer.your-subdomain.workers.dev/stats"
    Write-Info "4. Manual seed trigger: curl -X POST https://progeodata-queue-seed.your-subdomain.workers.dev/seed -H 'Content-Type: application/json' -d '{`"mode`":`"test`"}'"

    Write-Info "`nCron schedule: Daily at 6 AM UTC (configured in wrangler.toml)"
} else {
    Write-Warning "`nDry run complete. No changes were made."
    Write-Info "Run without --DryRun to perform actual deployment"
}

Write-Header "Deployment Script Finished"
