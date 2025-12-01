# Fix KV Namespace and Deploy Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing KV Namespace Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create KV namespace and capture the ID
Write-Host "Creating KV namespace..." -ForegroundColor Yellow

$kvOutput = wrangler kv:namespace create "CACHE" 2>&1 | Out-String
Write-Host $kvOutput

# Extract the namespace ID from the output
if ($kvOutput -match "id = `"([^`"]+)`"") {
    $namespaceId = $matches[1]
    Write-Host "✓ KV namespace created with ID: $namespaceId" -ForegroundColor Green
} elseif ($kvOutput -match "namespace with name .* already exists") {
    Write-Host "KV namespace already exists, listing namespaces to find ID..." -ForegroundColor Yellow

    # List existing namespaces to find the ID
    $listOutput = wrangler kv:namespace list 2>&1 | Out-String
    Write-Host $listOutput

    # Try to parse JSON output to find namespace ID
    try {
        $namespaces = $listOutput | ConvertFrom-Json
        $cacheNamespace = $namespaces | Where-Object { $_.title -eq "scraper-browser-CACHE" }
        if ($cacheNamespace) {
            $namespaceId = $cacheNamespace.id
            Write-Host "✓ Found existing namespace ID: $namespaceId" -ForegroundColor Green
        } else {
            Write-Host "Could not find CACHE namespace in list" -ForegroundColor Red
            Write-Host "Please manually create namespace and update wrangler.toml" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        # Try alternative parsing
        if ($listOutput -match "scraper-browser-CACHE.*?([a-f0-9]{32})") {
            $namespaceId = $matches[1]
            Write-Host "✓ Found existing namespace ID: $namespaceId" -ForegroundColor Green
        } else {
            Write-Host "Could not parse namespace list. Please check manually." -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Failed to create or find KV namespace" -ForegroundColor Red
    exit 1
}

# Step 2: Update wrangler.toml with the actual namespace ID
Write-Host ""
Write-Host "Updating wrangler.toml with namespace ID..." -ForegroundColor Yellow

$wranglerPath = "wrangler.toml"
$content = Get-Content $wranglerPath -Raw

# Replace the placeholder ID with the actual namespace ID
$content = $content -replace 'id = "YOUR_KV_NAMESPACE_ID"', "id = `"$namespaceId`""
$content = $content -replace 'preview_id = "YOUR_KV_NAMESPACE_ID"', "preview_id = `"$namespaceId`""

Set-Content $wranglerPath $content
Write-Host "✓ Updated wrangler.toml with namespace ID" -ForegroundColor Green

# Step 3: Deploy the worker
Write-Host ""
Write-Host "Deploying worker to Cloudflare..." -ForegroundColor Yellow

$deployOutput = wrangler deploy 2>&1 | Out-String
Write-Host $deployOutput

# Check if deployment was successful
if ($deployOutput -match "Published|https://scraper-browser.*workers\.dev") {
    Write-Host "✓ Worker deployed successfully!" -ForegroundColor Green

    # Extract the worker URL
    if ($deployOutput -match "https://scraper-browser[^\.]*\..*workers\.dev") {
        $workerUrl = $matches[0]
        Write-Host "Worker URL: $workerUrl" -ForegroundColor Cyan

        # Step 4: Test the deployed worker
        Write-Host ""
        Write-Host "Testing deployed worker..." -ForegroundColor Yellow

        $testBody = @{
            state = "FL"
            profession = "real_estate"
            zip = "33139"
            limit = 3
        } | ConvertTo-Json

        try {
            $response = Invoke-RestMethod -Uri $workerUrl -Method Post -Body $testBody -ContentType "application/json" -ErrorAction Stop

            if ($response.results) {
                Write-Host "✓ Worker test successful!" -ForegroundColor Green
                Write-Host "  Found $($response.results.Count) results" -ForegroundColor Cyan
                Write-Host "  Source: $($response.source)" -ForegroundColor Cyan

                if ($response.results[0]) {
                    $first = $response.results[0]
                    Write-Host "  Sample: $($first.name) - License: $($first.license_number)" -ForegroundColor Gray
                }
            } else {
                Write-Host "⚠ Worker returned no results" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠ Test request failed: $_" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠ Deployment may have issues. Check the output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Enable Browser Rendering in Cloudflare Dashboard ($5/month)" -ForegroundColor White
Write-Host "2. Redeploy scraper-api worker to use this URL" -ForegroundColor White
Write-Host "3. Test the full E2E flow" -ForegroundColor White