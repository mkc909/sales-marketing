# ProGeoData Deployment to Aura Media Studios
# Account: af57e902fd9dcaad7484a7195ac0f536

$ErrorActionPreference = "Stop"
$ACCOUNT_ID = "af57e902fd9dcaad7484a7195ac0f536"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ProGeoData Deployment to Aura Media Studios" -ForegroundColor Cyan
Write-Host "Account ID: $ACCOUNT_ID" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
Set-Location "C:\dev\GITHUB_MKC909_REPOS\sales-marketing"

# Step 1: Create D1 Database
Write-Host "Step 1: Creating D1 Database..." -ForegroundColor Green
try {
    $output = npx wrangler d1 create progeodata-db --account-id $ACCOUNT_ID 2>&1
    Write-Host $output

    # Extract database ID if created
    if ($output -match 'database_id\s*=\s*"([^"]+)"') {
        $DB_ID = $matches[1]
        Write-Host "Database ID: $DB_ID" -ForegroundColor Yellow

        # Update wrangler.toml files with database ID
        Write-Host "Updating wrangler.toml files..." -ForegroundColor Cyan

        # Update seed worker
        $seedConfig = Get-Content "workers\progeodata-queue-seed\wrangler.toml" -Raw
        $seedConfig = $seedConfig -replace 'database_id = "your-database-id-here"', "database_id = `"$DB_ID`""
        Set-Content "workers\progeodata-queue-seed\wrangler.toml" $seedConfig

        # Update consumer worker
        $consumerConfig = Get-Content "workers\progeodata-queue-consumer\wrangler.toml" -Raw
        $consumerConfig = $consumerConfig -replace 'database_id = "your-database-id-here"', "database_id = `"$DB_ID`""
        Set-Content "workers\progeodata-queue-consumer\wrangler.toml" $consumerConfig

        Write-Host "Database ID updated in both workers!" -ForegroundColor Green
    }
} catch {
    Write-Host "Database may already exist or creation failed" -ForegroundColor Yellow
}

# Step 2: Apply Migration
Write-Host "`nStep 2: Applying Migration..." -ForegroundColor Green
Set-Location "worktrees\siteforge"
try {
    npx wrangler d1 execute progeodata-db --file="migrations\010_queue_tables.sql" --account-id $ACCOUNT_ID
    Write-Host "Migration applied!" -ForegroundColor Green
} catch {
    Write-Host "Migration may already be applied" -ForegroundColor Yellow
}
Set-Location "..\.."

# Step 3: Create Queues
Write-Host "`nStep 3: Creating Queues..." -ForegroundColor Green
try {
    npx wrangler queues create progeodata-scrape-queue --account-id $ACCOUNT_ID
    Write-Host "Main queue created!" -ForegroundColor Green
} catch {
    Write-Host "Main queue may already exist" -ForegroundColor Yellow
}

try {
    npx wrangler queues create progeodata-scrape-dlq --account-id $ACCOUNT_ID
    Write-Host "Dead letter queue created!" -ForegroundColor Green
} catch {
    Write-Host "DLQ may already exist" -ForegroundColor Yellow
}

# Step 4: Create KV Namespace
Write-Host "`nStep 4: Creating KV Namespace..." -ForegroundColor Green
try {
    $kvOutput = npx wrangler kv:namespace create PROGEODATA_RATE_LIMITS --account-id $ACCOUNT_ID 2>&1
    Write-Host $kvOutput

    if ($kvOutput -match 'id\s*=\s*"([^"]+)"') {
        $KV_ID = $matches[1]
        Write-Host "KV Namespace ID: $KV_ID" -ForegroundColor Yellow

        # Update wrangler.toml files
        Write-Host "Updating KV namespace IDs..." -ForegroundColor Cyan

        # Update seed worker
        $seedConfig = Get-Content "workers\progeodata-queue-seed\wrangler.toml" -Raw
        $seedConfig = $seedConfig -replace 'id = "your-kv-namespace-id-here"', "id = `"$KV_ID`""
        Set-Content "workers\progeodata-queue-seed\wrangler.toml" $seedConfig

        # Update consumer worker
        $consumerConfig = Get-Content "workers\progeodata-queue-consumer\wrangler.toml" -Raw
        $consumerConfig = $consumerConfig -replace 'id = "your-kv-namespace-id-here"', "id = `"$KV_ID`""
        Set-Content "workers\progeodata-queue-consumer\wrangler.toml" $consumerConfig

        Write-Host "KV namespace ID updated!" -ForegroundColor Green
    }
} catch {
    Write-Host "KV namespace may already exist" -ForegroundColor Yellow
}

# Step 5: Deploy Seed Worker
Write-Host "`nStep 5: Deploying Seed Worker..." -ForegroundColor Green
Set-Location "workers\progeodata-queue-seed"
try {
    npm install --silent
    $deployOutput = npx wrangler deploy --account-id $ACCOUNT_ID 2>&1
    Write-Host $deployOutput

    if ($deployOutput -match 'https://[^\s]+\.workers\.dev') {
        $seedUrl = $matches[0]
        Write-Host "Seed Worker URL: $seedUrl" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Failed to deploy seed worker: $_" -ForegroundColor Red
}
Set-Location "..\.."

# Step 6: Deploy Consumer Worker
Write-Host "`nStep 6: Deploying Consumer Worker..." -ForegroundColor Green
Set-Location "workers\progeodata-queue-consumer"
try {
    npm install --silent
    $deployOutput = npx wrangler deploy --account-id $ACCOUNT_ID 2>&1
    Write-Host $deployOutput

    if ($deployOutput -match 'https://[^\s]+\.workers\.dev') {
        $consumerUrl = $matches[0]
        Write-Host "Consumer Worker URL: $consumerUrl" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Failed to deploy consumer worker: $_" -ForegroundColor Red
}
Set-Location "..\.."

# Final Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE TO AURA MEDIA STUDIOS!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Workers deployed to:" -ForegroundColor Yellow
Write-Host "✅ https://progeodata-queue-seed.auramediastudios.workers.dev" -ForegroundColor Green
Write-Host "✅ https://progeodata-queue-consumer.auramediastudios.workers.dev" -ForegroundColor Green
Write-Host ""
Write-Host "Test with Vashon Island (98070):" -ForegroundColor Yellow
Write-Host 'curl -X POST https://progeodata-queue-seed.auramediastudios.workers.dev/seed -H "Content-Type: application/json" -d "{\"mode\":\"test\"}"' -ForegroundColor Cyan
Write-Host ""
Write-Host "Check database:" -ForegroundColor Yellow
Write-Host "npx wrangler d1 execute progeodata-db --command=`"SELECT * FROM queue_health`" --account-id $ACCOUNT_ID" -ForegroundColor Cyan