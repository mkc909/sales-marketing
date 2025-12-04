# Progressive Testing Script for ProGeoData Cron Worker System
# Tests the system with increasing loads to ensure stability

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("stage1", "stage2", "stage3", "stage4", "stage5", "all")]
    [string]$Stage = "stage1",

    [Parameter(Mandatory=$false)]
    [switch]$SkipDeployment = $false,

    [Parameter(Mandatory=$false)]
    [switch]$Verbose = $false
)

Write-Host "ProGeoData Progressive Testing Framework" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing Stage: $Stage" -ForegroundColor Yellow
Write-Host ""

# Set working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
Set-Location $repoRoot

# Function to check queue status
function Get-QueueStatus {
    $result = wrangler d1 execute progeodata --command="SELECT * FROM queue_state WHERE queue_name = 'progeodata-zip-queue'" --json 2>$null | ConvertFrom-Json
    if ($result -and $result.result -and $result.result[0]) {
        return $result.result[0]
    }
    return $null
}

# Function to check processing stats
function Get-ProcessingStats {
    $result = wrangler d1 execute progeodata --command="SELECT COUNT(*) as processed, SUM(records_saved) as records FROM processing_log WHERE datetime(created_at) > datetime('now', '-1 hour')" --json 2>$null | ConvertFrom-Json
    if ($result -and $result.result -and $result.result[0]) {
        return $result.result[0]
    }
    return @{processed = 0; records = 0}
}

# Function to check worker health
function Get-WorkerHealth {
    $result = wrangler d1 execute progeodata --command="SELECT worker_id, status, items_processed FROM worker_health WHERE worker_type = 'consumer'" --json 2>$null | ConvertFrom-Json
    if ($result -and $result.result) {
        return $result.result
    }
    return @()
}

# Function to trigger seed with specific configuration
function Trigger-Seed {
    param(
        [string]$Environment = "stage1"
    )

    Write-Host "Triggering seed for environment: $Environment" -ForegroundColor Gray

    # Deploy seed worker with specific environment
    Set-Location (Join-Path $repoRoot "workers\progeodata-seed")

    if (-not $SkipDeployment) {
        wrangler deploy --env $Environment 2>&1 | Out-Null
    }

    # Trigger the seed endpoint
    $seedUrl = switch($Environment) {
        "stage1" { "https://progeodata-seed-stage1.salescatalyst.workers.dev/seed" }
        "stage2" { "https://progeodata-seed-stage2.salescatalyst.workers.dev/seed" }
        "stage3" { "https://progeodata-seed-stage3.salescatalyst.workers.dev/seed" }
        "stage4" { "https://progeodata-seed-stage4.salescatalyst.workers.dev/seed" }
        "stage5" { "https://progeodata-seed-production.salescatalyst.workers.dev/seed" }
        default { "https://progeodata-seed.salescatalyst.workers.dev/seed" }
    }

    try {
        $response = Invoke-RestMethod -Uri $seedUrl -Method POST -ContentType "application/json"
        Write-Host "Seed triggered successfully: $($response.message)" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "Failed to trigger seed: $_" -ForegroundColor Red
        return $null
    }
}

# Function to wait for processing with progress
function Wait-ForProcessing {
    param(
        [int]$ExpectedItems = 10,
        [int]$TimeoutSeconds = 300
    )

    $startTime = Get-Date
    $lastProcessed = 0

    Write-Host "Waiting for processing to complete..." -ForegroundColor Yellow
    Write-Host "Expected items: $ExpectedItems" -ForegroundColor Gray

    while ((Get-Date) -lt $startTime.AddSeconds($TimeoutSeconds)) {
        $stats = Get-ProcessingStats
        $queueStatus = Get-QueueStatus
        $currentProcessed = [int]$stats.processed

        # Calculate progress
        $progress = if ($ExpectedItems -gt 0) { [math]::Round(($currentProcessed / $ExpectedItems) * 100, 2) } else { 0 }
        $remaining = if ($queueStatus) { [int]$queueStatus.total_items - [int]$queueStatus.processed_items } else { 0 }

        # Display progress
        Write-Progress -Activity "Processing Queue" -Status "Processed: $currentProcessed / $ExpectedItems ($progress%)" -PercentComplete $progress

        if ($Verbose) {
            Write-Host "  Processed: $currentProcessed | Records: $($stats.records) | Remaining: $remaining" -ForegroundColor Gray
        }

        # Check if processing is complete
        if ($currentProcessed -ge $ExpectedItems -or $remaining -eq 0) {
            Write-Progress -Activity "Processing Queue" -Completed
            Write-Host "Processing complete! Processed $currentProcessed items." -ForegroundColor Green
            return $true
        }

        # Check if processing has stalled
        if ($currentProcessed -eq $lastProcessed) {
            $stalledTime = (Get-Date) - $startTime
            if ($stalledTime.TotalSeconds -gt 60) {
                Write-Host "WARNING: Processing appears to be stalled" -ForegroundColor Yellow
            }
        }
        $lastProcessed = $currentProcessed

        Start-Sleep -Seconds 5
    }

    Write-Progress -Activity "Processing Queue" -Completed
    Write-Host "Timeout reached. Processed $lastProcessed items." -ForegroundColor Yellow
    return $false
}

# Function to generate test report
function Generate-TestReport {
    param(
        [string]$StageName,
        [object]$StartStats,
        [object]$EndStats,
        [object]$WorkerHealth
    )

    Write-Host ""
    Write-Host "Test Report for $StageName" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan

    $processed = [int]$EndStats.processed - [int]$StartStats.processed
    $records = [int]$EndStats.records - [int]$StartStats.records

    Write-Host "Items Processed: $processed" -ForegroundColor Green
    Write-Host "Records Saved: $records" -ForegroundColor Green

    if ($WorkerHealth.Count -gt 0) {
        Write-Host ""
        Write-Host "Worker Status:" -ForegroundColor Yellow
        foreach ($worker in $WorkerHealth) {
            $status = if ($worker.status -eq "healthy") { "Green" } elseif ($worker.status -eq "degraded") { "Yellow" } else { "Red" }
            Write-Host "  $($worker.worker_id): $($worker.status) (Processed: $($worker.items_processed))" -ForegroundColor $status
        }
    }

    # Check for errors
    $errors = wrangler d1 execute progeodata --command="SELECT COUNT(*) as count FROM error_log WHERE datetime(created_at) > datetime('now', '-1 hour')" --json 2>$null | ConvertFrom-Json
    if ($errors -and $errors.result -and $errors.result[0]) {
        $errorCount = [int]$errors.result[0].count
        if ($errorCount -gt 0) {
            Write-Host ""
            Write-Host "Errors Detected: $errorCount" -ForegroundColor Red
        }
    }

    Write-Host ""
}

# Main testing flow
switch($Stage) {
    "stage1" {
        Write-Host "STAGE 1: Testing with 10 ZIP codes and 1 worker" -ForegroundColor Cyan
        Write-Host "================================================" -ForegroundColor Cyan

        $startStats = Get-ProcessingStats

        # Trigger seed
        $seedResult = Trigger-Seed -Environment "stage1"
        if (-not $seedResult) {
            Write-Host "Failed to trigger seed. Exiting." -ForegroundColor Red
            exit 1
        }

        # Wait for processing
        $success = Wait-ForProcessing -ExpectedItems 10 -TimeoutSeconds 120

        $endStats = Get-ProcessingStats
        $workerHealth = Get-WorkerHealth

        Generate-TestReport -StageName "Stage 1" -StartStats $startStats -EndStats $endStats -WorkerHealth $workerHealth

        if ($success) {
            Write-Host "Stage 1 PASSED" -ForegroundColor Green
        } else {
            Write-Host "Stage 1 FAILED" -ForegroundColor Red
        }
    }

    "stage2" {
        Write-Host "STAGE 2: Testing with 100 ZIP codes and 2 workers" -ForegroundColor Cyan
        Write-Host "==================================================" -ForegroundColor Cyan

        # Deploy second consumer if needed
        if (-not $SkipDeployment) {
            Write-Host "Deploying second consumer worker..." -ForegroundColor Yellow
            Set-Location (Join-Path $repoRoot "workers\progeodata-consumer")
            wrangler deploy --env worker02 2>&1 | Out-Null
        }

        $startStats = Get-ProcessingStats

        # Trigger seed
        $seedResult = Trigger-Seed -Environment "stage2"
        if (-not $seedResult) {
            Write-Host "Failed to trigger seed. Exiting." -ForegroundColor Red
            exit 1
        }

        # Wait for processing
        $success = Wait-ForProcessing -ExpectedItems 100 -TimeoutSeconds 300

        $endStats = Get-ProcessingStats
        $workerHealth = Get-WorkerHealth

        Generate-TestReport -StageName "Stage 2" -StartStats $startStats -EndStats $endStats -WorkerHealth $workerHealth

        if ($success) {
            Write-Host "Stage 2 PASSED" -ForegroundColor Green
        } else {
            Write-Host "Stage 2 FAILED" -ForegroundColor Red
        }
    }

    "stage3" {
        Write-Host "STAGE 3: Testing with 1,000 ZIP codes and 5 workers" -ForegroundColor Cyan
        Write-Host "====================================================" -ForegroundColor Cyan

        # Deploy additional consumers if needed
        if (-not $SkipDeployment) {
            Write-Host "Deploying 5 consumer workers..." -ForegroundColor Yellow
            Set-Location (Join-Path $repoRoot "workers\progeodata-consumer")
            for ($i = 2; $i -le 5; $i++) {
                $envName = "worker" + $i.ToString("00")
                Write-Host "  Deploying consumer-$i..." -ForegroundColor Gray
                wrangler deploy --env $envName 2>&1 | Out-Null
            }
        }

        $startStats = Get-ProcessingStats

        # Trigger seed
        $seedResult = Trigger-Seed -Environment "stage3"
        if (-not $seedResult) {
            Write-Host "Failed to trigger seed. Exiting." -ForegroundColor Red
            exit 1
        }

        # Wait for processing
        $success = Wait-ForProcessing -ExpectedItems 1000 -TimeoutSeconds 600

        $endStats = Get-ProcessingStats
        $workerHealth = Get-WorkerHealth

        Generate-TestReport -StageName "Stage 3" -StartStats $startStats -EndStats $endStats -WorkerHealth $workerHealth

        if ($success) {
            Write-Host "Stage 3 PASSED" -ForegroundColor Green
        } else {
            Write-Host "Stage 3 FAILED" -ForegroundColor Red
        }
    }

    "stage4" {
        Write-Host "STAGE 4: Testing with 10,000 ZIP codes and 10 workers" -ForegroundColor Cyan
        Write-Host "======================================================" -ForegroundColor Cyan

        # Deploy all 10 consumers if needed
        if (-not $SkipDeployment) {
            Write-Host "Deploying 10 consumer workers..." -ForegroundColor Yellow
            Set-Location (Join-Path $repoRoot "workers\progeodata-consumer")
            for ($i = 2; $i -le 10; $i++) {
                $envName = "worker" + $i.ToString("00")
                Write-Host "  Deploying consumer-$i..." -ForegroundColor Gray
                wrangler deploy --env $envName 2>&1 | Out-Null
            }
        }

        $startStats = Get-ProcessingStats

        # Trigger seed
        $seedResult = Trigger-Seed -Environment "stage4"
        if (-not $seedResult) {
            Write-Host "Failed to trigger seed. Exiting." -ForegroundColor Red
            exit 1
        }

        # Wait for processing
        $success = Wait-ForProcessing -ExpectedItems 10000 -TimeoutSeconds 1800

        $endStats = Get-ProcessingStats
        $workerHealth = Get-WorkerHealth

        Generate-TestReport -StageName "Stage 4" -StartStats $startStats -EndStats $endStats -WorkerHealth $workerHealth

        if ($success) {
            Write-Host "Stage 4 PASSED" -ForegroundColor Green
        } else {
            Write-Host "Stage 4 FAILED" -ForegroundColor Red
        }
    }

    "stage5" {
        Write-Host "STAGE 5: Production deployment with all ZIP codes" -ForegroundColor Cyan
        Write-Host "=================================================" -ForegroundColor Cyan

        Write-Host "WARNING: This will deploy to production with all ZIP codes!" -ForegroundColor Red
        $confirm = Read-Host "Are you sure you want to proceed? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Host "Aborted." -ForegroundColor Yellow
            exit 0
        }

        # Deploy all workers to production
        if (-not $SkipDeployment) {
            Write-Host "Deploying all workers to production..." -ForegroundColor Yellow

            Set-Location (Join-Path $repoRoot "workers\progeodata-seed")
            wrangler deploy --env production

            Set-Location (Join-Path $repoRoot "workers\progeodata-consumer")
            for ($i = 1; $i -le 10; $i++) {
                if ($i -eq 1) {
                    wrangler deploy --env production
                } else {
                    $envName = "worker" + $i.ToString("00")
                    wrangler deploy --env $envName
                }
            }

            Set-Location (Join-Path $repoRoot "workers\progeodata-coordinator")
            wrangler deploy --env production
        }

        Write-Host "Production deployment complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Monitor production at:" -ForegroundColor Yellow
        Write-Host "  Dashboard: https://progeodata-coordinator.salescatalyst.workers.dev/dashboard" -ForegroundColor Gray
        Write-Host "  Status: https://progeodata-coordinator.salescatalyst.workers.dev/status" -ForegroundColor Gray
    }

    "all" {
        Write-Host "Running all stages sequentially..." -ForegroundColor Cyan
        Write-Host ""

        # Run each stage
        & $MyInvocation.MyCommand.Path -Stage "stage1" -SkipDeployment:$SkipDeployment -Verbose:$Verbose
        Start-Sleep -Seconds 10

        & $MyInvocation.MyCommand.Path -Stage "stage2" -SkipDeployment:$SkipDeployment -Verbose:$Verbose
        Start-Sleep -Seconds 10

        & $MyInvocation.MyCommand.Path -Stage "stage3" -SkipDeployment:$SkipDeployment -Verbose:$Verbose
        Start-Sleep -Seconds 10

        & $MyInvocation.MyCommand.Path -Stage "stage4" -SkipDeployment:$SkipDeployment -Verbose:$Verbose

        Write-Host ""
        Write-Host "All test stages complete!" -ForegroundColor Green
    }
}

Set-Location $repoRoot
Write-Host ""
Write-Host "Testing complete." -ForegroundColor Cyan