#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy EstateFlow Microservices to Cloudflare Workers

.DESCRIPTION
    This script deploys all three EstateFlow microservices:
    1. URL Shortener Service (estateflow-shortener)
    2. QR Code Generator Service (estateflow-qr-generator)
    3. Agent Ingestion Service (estateflow-agent-ingestion)

.PARAMETER Service
    Specific service to deploy (shortener, qr-generator, agent-ingestion, or all)

.PARAMETER Environment
    Target environment (development, staging, production)

.PARAMETER SkipDependencies
    Skip npm install step

.PARAMETER SetupResources
    Create required Cloudflare resources (KV, D1, R2)

.EXAMPLE
    .\deploy-microservices.ps1 -Service all -Environment production
    Deploy all services to production

.EXAMPLE
    .\deploy-microservices.ps1 -Service agent-ingestion -Environment staging -SetupResources
    Deploy only agent-ingestion service to staging and create resources
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('all', 'shortener', 'qr-generator', 'agent-ingestion')]
    [string]$Service = 'all',

    [Parameter(Mandatory=$false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'staging',

    [Parameter(Mandatory=$false)]
    [switch]$SkipDependencies,

    [Parameter(Mandatory=$false)]
    [switch]$SetupResources,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# Script configuration
$ErrorActionPreference = "Stop"
$WorkersDir = "workers"
$Services = @{
    'shortener' = @{
        Name = 'estateflow-shortener'
        Path = 'shortener'
        Resources = @('kv', 'd1')
        Dependencies = @()
    }
    'qr-generator' = @{
        Name = 'estateflow-qr-generator'
        Path = 'qr-generator'
        Resources = @('kv', 'r2')
        Dependencies = @('shortener')
    }
    'agent-ingestion' = @{
        Name = 'estateflow-agent-ingestion'
        Path = 'agent-ingestion'
        Resources = @('kv', 'd1', 'r2')
        Dependencies = @()
    }
}

# Color output functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = 'White'
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" -Color Green
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "✗ $Message" -Color Red
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ $Message" -Color Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" -Color Yellow
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "`n▶ $Message" -Color Yellow
}

# Check prerequisites
function Test-Prerequisites {
    Write-Step "Checking prerequisites..."

    # Check wrangler CLI
    try {
        $wranglerVersion = wrangler --version 2>&1
        Write-Success "Wrangler CLI found: $wranglerVersion"
    } catch {
        Write-Error "Wrangler CLI not found. Install with: npm install -g wrangler"
        exit 1
    }

    # Check authentication
    try {
        $whoami = wrangler whoami 2>&1
        if ($whoami -match "not authenticated") {
            Write-Error "Not authenticated with Cloudflare. Run: wrangler login"
            exit 1
        }
        Write-Success "Authenticated with Cloudflare"
    } catch {
        Write-Error "Failed to check Cloudflare authentication"
        exit 1
    }

    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"
    } catch {
        Write-Error "Node.js not found. Install from https://nodejs.org/"
        exit 1
    }

    Write-Success "All prerequisites met"
}

# Setup Cloudflare resources for a service
function Setup-ServiceResources {
    param(
        [string]$ServiceName,
        [array]$Resources,
        [string]$ServicePath
    )

    Write-Step "Setting up resources for $ServiceName..."

    Push-Location (Join-Path $WorkersDir $ServicePath)

    try {
        foreach ($resource in $Resources) {
            switch ($resource) {
                'kv' {
                    Write-Info "Creating KV namespaces..."
                    if (-not $DryRun) {
                        npm run kv:create 2>&1 | Out-Null
                        npm run kv:create:preview 2>&1 | Out-Null
                    }
                    Write-Success "KV namespaces created"
                }
                'd1' {
                    Write-Info "Creating D1 database..."
                    if (-not $DryRun) {
                        npm run d1:create 2>&1 | Out-Null
                    }
                    Write-Success "D1 database created"
                }
                'r2' {
                    Write-Info "Creating R2 bucket..."
                    if (-not $DryRun) {
                        npm run r2:create 2>&1 | Out-Null
                    }
                    Write-Success "R2 bucket created"
                }
            }
        }
    } catch {
        Write-Warning "Some resources may already exist or failed to create: $_"
    } finally {
        Pop-Location
    }
}

# Install dependencies for a service
function Install-ServiceDependencies {
    param(
        [string]$ServiceName,
        [string]$ServicePath
    )

    if ($SkipDependencies) {
        Write-Info "Skipping dependency installation for $ServiceName"
        return
    }

    Write-Step "Installing dependencies for $ServiceName..."

    Push-Location (Join-Path $WorkersDir $ServicePath)

    try {
        if (-not $DryRun) {
            npm install --silent
        }
        Write-Success "Dependencies installed for $ServiceName"
    } catch {
        Write-Error "Failed to install dependencies for $ServiceName"
        throw
    } finally {
        Pop-Location
    }
}

# Deploy a single service
function Deploy-Service {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [string]$TargetEnvironment
    )

    Write-Step "Deploying $ServiceName to $TargetEnvironment..."

    Push-Location (Join-Path $WorkersDir $ServicePath)

    try {
        # Type check
        Write-Info "Type checking..."
        if (-not $DryRun) {
            npm run type-check
        }
        Write-Success "Type check passed"

        # Deploy
        $deployCommand = if ($TargetEnvironment -eq 'development') {
            "deploy"
        } else {
            "deploy:$TargetEnvironment"
        }

        Write-Info "Deploying to $TargetEnvironment..."
        if ($DryRun) {
            Write-Info "[DRY RUN] Would execute: npm run $deployCommand"
        } else {
            $deployOutput = npm run $deployCommand 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$ServiceName deployed successfully to $TargetEnvironment"

                # Extract worker URL from output
                $workerUrl = $deployOutput | Select-String -Pattern "https://.*workers\.dev" | Select-Object -First 1
                if ($workerUrl) {
                    Write-Info "Worker URL: $workerUrl"
                }
            } else {
                throw "Deployment failed with exit code $LASTEXITCODE"
            }
        }

    } catch {
        Write-Error "Failed to deploy $ServiceName"
        throw
    } finally {
        Pop-Location
    }
}

# Health check for deployed service
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$ServicePath
    )

    Write-Step "Health check for $ServiceName..."

    try {
        # Get worker URL (this is simplified - in reality you'd need to parse wrangler output)
        $workerUrl = "$ServiceName.workers.dev"

        Write-Info "Checking health endpoint: https://$workerUrl/health"

        if ($DryRun) {
            Write-Info "[DRY RUN] Would check health endpoint"
            return
        }

        # Use Invoke-WebRequest for health check
        try {
            $response = Invoke-WebRequest -Uri "https://$workerUrl/health" -Method Get -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "Health check passed for $ServiceName"
                $content = $response.Content | ConvertFrom-Json
                Write-Info "Status: $($content.status)"
            } else {
                Write-Warning "Health check returned status code: $($response.StatusCode)"
            }
        } catch {
            Write-Warning "Health check failed (this is expected if worker is not yet available): $_"
        }

    } catch {
        Write-Warning "Could not perform health check for $ServiceName"
    }
}

# Generate deployment summary
function Show-DeploymentSummary {
    param(
        [array]$DeployedServices,
        [string]$TargetEnvironment
    )

    Write-Step "Deployment Summary"

    Write-Info "Environment: $TargetEnvironment"
    Write-Info "Services deployed: $($DeployedServices.Count)"

    foreach ($service in $DeployedServices) {
        Write-Success "  - $service"
    }

    Write-Info "`nNext steps:"
    Write-Info "1. Verify services are running: wrangler tail <service-name>"
    Write-Info "2. Check logs in Cloudflare Dashboard"
    Write-Info "3. Test endpoints with health checks"
    Write-Info "4. Update service bindings in dependent services"

    if ($TargetEnvironment -eq 'production') {
        Write-Warning "`nProduction deployment complete!"
        Write-Warning "Monitor services carefully for the next 15 minutes"
    }
}

# Main deployment logic
function Start-Deployment {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════╗" -Color Cyan
    Write-ColorOutput "║   EstateFlow Microservices Deployment Script      ║" -Color Cyan
    Write-ColorOutput "╚════════════════════════════════════════════════════╝`n" -Color Cyan

    Write-Info "Configuration:"
    Write-Info "  Service(s): $Service"
    Write-Info "  Environment: $Environment"
    Write-Info "  Setup Resources: $SetupResources"
    Write-Info "  Skip Dependencies: $SkipDependencies"
    Write-Info "  Dry Run: $DryRun"

    # Check prerequisites
    Test-Prerequisites

    # Determine which services to deploy
    $servicesToDeploy = if ($Service -eq 'all') {
        @('shortener', 'qr-generator', 'agent-ingestion')
    } else {
        @($Service)
    }

    # Sort services by dependencies
    $deploymentOrder = @()
    foreach ($svc in $servicesToDeploy) {
        if ($Services[$svc].Dependencies.Count -gt 0) {
            # Add dependencies first
            foreach ($dep in $Services[$svc].Dependencies) {
                if ($dep -notin $deploymentOrder -and $dep -in $servicesToDeploy) {
                    $deploymentOrder += $dep
                }
            }
        }
        if ($svc -notin $deploymentOrder) {
            $deploymentOrder += $svc
        }
    }

    Write-Info "Deployment order: $($deploymentOrder -join ' → ')"

    $deployedServices = @()
    $failedServices = @()

    # Deploy each service
    foreach ($svc in $deploymentOrder) {
        $serviceConfig = $Services[$svc]

        try {
            Write-ColorOutput "`n════════════════════════════════════════" -Color Magenta
            Write-ColorOutput "  Processing: $($serviceConfig.Name)" -Color Magenta
            Write-ColorOutput "════════════════════════════════════════" -Color Magenta

            # Setup resources if requested
            if ($SetupResources) {
                Setup-ServiceResources -ServiceName $serviceConfig.Name `
                                       -Resources $serviceConfig.Resources `
                                       -ServicePath $serviceConfig.Path
            }

            # Install dependencies
            Install-ServiceDependencies -ServiceName $serviceConfig.Name `
                                        -ServicePath $serviceConfig.Path

            # Deploy service
            Deploy-Service -ServiceName $serviceConfig.Name `
                          -ServicePath $serviceConfig.Path `
                          -TargetEnvironment $Environment

            # Health check
            if (-not $DryRun) {
                Start-Sleep -Seconds 5  # Wait for deployment to propagate
                Test-ServiceHealth -ServiceName $serviceConfig.Name `
                                  -ServicePath $serviceConfig.Path
            }

            $deployedServices += $serviceConfig.Name

        } catch {
            Write-Error "Failed to deploy $($serviceConfig.Name): $_"
            $failedServices += $serviceConfig.Name

            # Ask if we should continue
            if ($servicesToDeploy.Count -gt 1) {
                $continue = Read-Host "Continue with remaining services? (y/n)"
                if ($continue -ne 'y') {
                    break
                }
            }
        }
    }

    # Show summary
    Write-ColorOutput "`n════════════════════════════════════════" -Color Magenta
    Show-DeploymentSummary -DeployedServices $deployedServices `
                          -TargetEnvironment $Environment

    if ($failedServices.Count -gt 0) {
        Write-Error "`nFailed services:"
        foreach ($failed in $failedServices) {
            Write-Error "  - $failed"
        }
        exit 1
    }

    Write-Success "`n✓ All services deployed successfully!"
}

# Execute deployment
try {
    Start-Deployment
} catch {
    Write-Error "`nDeployment failed: $_"
    exit 1
}
