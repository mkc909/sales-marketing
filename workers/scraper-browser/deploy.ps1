# Scraper Browser Deployment Script
# Deploys the Browser Rendering Worker to Cloudflare

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Scraper Browser Worker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is installed
$wranglerVersion = wrangler --version 2>$null
if (-not $wranglerVersion) {
    Write-Host "Installing Wrangler CLI..." -ForegroundColor Yellow
    npm install -g wrangler
}

# Navigate to worker directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Create KV namespace if it doesn't exist
Write-Host ""
Write-Host "Creating KV namespace..." -ForegroundColor Yellow
$kvOutput = wrangler kv:namespace create "CACHE" 2>&1 | Out-String

if ($kvOutput -match "id = `"([^`"]+)`"") {
    $kvId = $matches[1]
    Write-Host "✓ KV namespace created with ID: $kvId" -ForegroundColor Green

    # Update wrangler.toml with the KV ID
    $wranglerPath = Join-Path $scriptDir "wrangler.toml"
    $content = Get-Content $wranglerPath -Raw
    $content = $content -replace 'id = "YOUR_KV_NAMESPACE_ID"', "id = `"$kvId`""
    $content = $content -replace 'preview_id = "YOUR_KV_NAMESPACE_ID"', "preview_id = `"$kvId`""
    Set-Content $wranglerPath $content
    Write-Host "✓ Updated wrangler.toml with KV namespace ID" -ForegroundColor Green
} elseif ($kvOutput -match "already exists") {
    Write-Host "✓ KV namespace already exists" -ForegroundColor Green
}

# Deploy the worker
Write-Host ""
Write-Host "Deploying worker to Cloudflare..." -ForegroundColor Yellow
$deployOutput = wrangler deploy 2>&1 | Out-String

if ($deployOutput -match "https://([^/]+\.workers\.dev)") {
    $workerUrl = "https://" + $matches[1]
    Write-Host "✓ Worker deployed successfully!" -ForegroundColor Green
    Write-Host "  URL: $workerUrl" -ForegroundColor Cyan
} else {
    Write-Host "⚠ Deployment may have completed with warnings" -ForegroundColor Yellow
    Write-Host $deployOutput
}

# Test the deployed worker
Write-Host ""
Write-Host "Testing deployed worker..." -ForegroundColor Yellow

$testBody = @{
    state = "FL"
    profession = "real_estate"
    zip = "33139"
    limit = 3
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$workerUrl" -Method Post -Body $testBody -ContentType "application/json" -ErrorAction Stop

    if ($response.results -and $response.results.Count -gt 0) {
        Write-Host "✓ Worker test successful!" -ForegroundColor Green
        Write-Host "  Found $($response.results.Count) results" -ForegroundColor Cyan
        Write-Host "  Source: $($response.source)" -ForegroundColor Cyan

        # Display first result
        $first = $response.results[0]
        Write-Host ""
        Write-Host "  Sample result:" -ForegroundColor Yellow
        Write-Host "    Name: $($first.name)" -ForegroundColor Gray
        Write-Host "    License: $($first.license_number)" -ForegroundColor Gray
        Write-Host "    Status: $($first.license_status)" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Worker returned no results" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Worker test failed: $_" -ForegroundColor Yellow
    Write-Host "  The worker may still be initializing..." -ForegroundColor Cyan
}

# Update scraper-api worker
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Enable Browser Rendering in Cloudflare Dashboard (if not already enabled)" -ForegroundColor White
Write-Host "2. Redeploy scraper-api worker to use this new browser worker" -ForegroundColor White
Write-Host "3. Test the full E2E flow through scraper-api" -ForegroundColor White

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Pop-Location