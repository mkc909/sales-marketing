# Simple Browser Worker Deployment (No KV)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Browser Rendering Worker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Browser Rendering will auto-bill $5/month + usage" -ForegroundColor Yellow
Write-Host "No dashboard toggle needed!" -ForegroundColor Green
Write-Host ""

# Navigate to script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

# Use simplified config
Write-Host "Using simplified config (no KV for now)..." -ForegroundColor Yellow
Copy-Item "wrangler-simple.toml" "wrangler.toml" -Force
Write-Host "✓ Config updated" -ForegroundColor Green

# Deploy the worker
Write-Host ""
Write-Host "Deploying to Cloudflare..." -ForegroundColor Yellow

$deployOutput = wrangler deploy 2>&1 | Out-String
Write-Host $deployOutput

# Extract URL from output
$workerUrl = $null
if ($deployOutput -match "(https://scraper-browser[^\s]+\.workers\.dev)") {
    $workerUrl = $matches[1]
    Write-Host ""
    Write-Host "✅ SUCCESS! Worker deployed to:" -ForegroundColor Green
    Write-Host $workerUrl -ForegroundColor Cyan
} elseif ($deployOutput -match "Published") {
    $workerUrl = "https://scraper-browser.magicmike.workers.dev"
    Write-Host ""
    Write-Host "✅ Worker published!" -ForegroundColor Green
    Write-Host "URL: $workerUrl" -ForegroundColor Cyan
}

# Test the worker
if ($workerUrl) {
    Write-Host ""
    Write-Host "Testing with FL real estate data..." -ForegroundColor Yellow

    $testBody = @{
        state = "FL"
        profession = "real_estate"
        zip = "33139"
        limit = 3
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $workerUrl -Method Post -Body $testBody -ContentType "application/json" -ErrorAction Stop

        if ($response.results -and $response.results.Count -gt 0) {
            Write-Host "✅ TEST SUCCESSFUL!" -ForegroundColor Green
            Write-Host "Found $($response.results.Count) professionals" -ForegroundColor Cyan
            Write-Host "Source: $($response.source)" -ForegroundColor Cyan

            # Show first result
            if ($response.results[0]) {
                $first = $response.results[0]
                Write-Host ""
                Write-Host "Sample Professional:" -ForegroundColor Yellow
                Write-Host "  Name: $($first.name)" -ForegroundColor White
                Write-Host "  License: $($first.license_number)" -ForegroundColor White
                Write-Host "  Status: $($first.license_status)" -ForegroundColor White
                Write-Host "  Company: $($first.company)" -ForegroundColor White
            }
        } else {
            Write-Host "⚠ No results returned" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠ Test failed: $_" -ForegroundColor Yellow
        Write-Host "Worker may still be initializing..." -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Redeploy scraper-api worker (it already points to this URL)" -ForegroundColor White
Write-Host "   cd ../scraper-api" -ForegroundColor Gray
Write-Host "   wrangler deploy" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test full E2E flow:" -ForegroundColor White
Write-Host "   curl -X POST https://scraper-api.magicmike.workers.dev/search \" -ForegroundColor Gray
Write-Host "     -H 'Content-Type: application/json' \" -ForegroundColor Gray
Write-Host "     -d '{\"state\":\"FL\",\"profession\":\"real_estate\",\"zip\":\"33139\"}'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Monitor usage in Cloudflare Dashboard" -ForegroundColor White
Write-Host "   Workers & Pages → scraper-browser → Analytics" -ForegroundColor Gray

Pop-Location