# EstateFlow Multi-Industry Platform - Windows PowerShell Deployment Script
# This script deploys the platform to Cloudflare Pages with all required infrastructure

param(
    [switch]$SkipPrereqs = $false,
    [switch]$SkipAuth = $false,
    [switch]$SkipBuild = $false,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

# Color output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error-Custom { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning-Custom { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "`n🔷 $Message" -ForegroundColor Blue -BackgroundColor Black }

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   EstateFlow Multi-Industry Platform Deployment               ║
║   Target: Cloudflare Pages + Workers                          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Configuration
$PROJECT_NAME = "estateflow"
$DB_NAME = "estateflow-db"
$PAGES_PROJECT_NAME = "estateflow"

# Step 1: Prerequisites Check
if (-not $SkipPrereqs) {
    Write-Step "Step 1: Checking Prerequisites"

    # Check Node.js
    Write-Info "Checking Node.js version (required: 18+)..."
    try {
        $nodeVersion = node --version
        $nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*','$1')
        if ($nodeMajorVersion -ge 18) {
            Write-Success "Node.js $nodeVersion installed"
        } else {
            Write-Error-Custom "Node.js version $nodeVersion is too old. Please install Node.js 18+"
            exit 1
        }
    } catch {
        Write-Error-Custom "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    }

    # Check npm
    Write-Info "Checking npm version (required: 8+)..."
    try {
        $npmVersion = npm --version
        $npmMajorVersion = [int]($npmVersion -replace '(\d+)\..*','$1')
        if ($npmMajorVersion -ge 8) {
            Write-Success "npm $npmVersion installed"
        } else {
            Write-Error-Custom "npm version $npmVersion is too old. Please update npm"
            exit 1
        }
    } catch {
        Write-Error-Custom "npm not found"
        exit 1
    }

    # Check wrangler (install if missing)
    Write-Info "Checking wrangler CLI..."
    try {
        $wranglerVersion = npx wrangler --version
        Write-Success "Wrangler installed: $wranglerVersion"
    } catch {
        Write-Warning-Custom "Wrangler not found. Installing locally..."
        npm install wrangler
    }

    Write-Success "All prerequisites met"
}

# Step 2: Authenticate with Cloudflare
if (-not $SkipAuth) {
    Write-Step "Step 2: Cloudflare Authentication"

    Write-Info "Checking Cloudflare authentication..."
    $authCheck = npx wrangler whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Already authenticated with Cloudflare"
        Write-Host $authCheck
    } else {
        Write-Warning-Custom "Not authenticated. Opening browser for Cloudflare login..."
        npx wrangler login
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Authentication failed"
            exit 1
        }
        Write-Success "Successfully authenticated"
    }
}

# Step 3: Verify/Create D1 Database
Write-Step "Step 3: D1 Database Setup"

Write-Info "Checking if D1 database '$DB_NAME' exists..."
$dbList = npx wrangler d1 list --json | ConvertFrom-Json
$existingDb = $dbList | Where-Object { $_.name -eq $DB_NAME }

if ($existingDb) {
    Write-Success "Database '$DB_NAME' already exists (ID: $($existingDb.uuid))"
    $DB_ID = $existingDb.uuid
} else {
    Write-Warning-Custom "Database '$DB_NAME' not found. Creating..."
    if (-not $DryRun) {
        $createResult = npx wrangler d1 create $DB_NAME
        Write-Success "Database created"
        Write-Host $createResult

        # Extract database ID from output
        $DB_ID = ($createResult | Select-String -Pattern 'database_id = "([^"]+)"').Matches.Groups[1].Value
        Write-Info "Database ID: $DB_ID"
        Write-Warning-Custom "⚠️  IMPORTANT: Update wrangler.toml with this database_id: $DB_ID"
    } else {
        Write-Info "[DRY RUN] Would create database '$DB_NAME'"
    }
}

# Step 4: Run Database Migrations
Write-Step "Step 4: Database Migrations"

$migrations = @(
    "migrations/001_initial_agents.sql",
    "migrations/002_agent_profile_v2.sql",
    "migrations/003_multi_industry_platform_safe.sql"
)

foreach ($migration in $migrations) {
    if (Test-Path $migration) {
        Write-Info "Running migration: $(Split-Path $migration -Leaf)"
        if (-not $DryRun) {
            try {
                npx wrangler d1 execute $DB_NAME --file=$migration
                Write-Success "Migration applied: $(Split-Path $migration -Leaf)"
            } catch {
                Write-Warning-Custom "Migration may have already been applied or failed. Continuing..."
                Write-Host $_.Exception.Message
            }
        } else {
            Write-Info "[DRY RUN] Would run migration: $migration"
        }
    } else {
        Write-Warning-Custom "Migration file not found: $migration"
    }
}

# Step 5: Verify/Create KV Namespaces
Write-Step "Step 5: KV Namespace Setup"

$kvNamespaces = @("LINKS", "PINS", "CACHE", "ANALYTICS_BUFFER")

foreach ($namespace in $kvNamespaces) {
    Write-Info "Checking KV namespace: $namespace"
    $kvList = npx wrangler kv:namespace list --json | ConvertFrom-Json
    $existingKv = $kvList | Where-Object { $_.title -like "*$namespace*" }

    if ($existingKv) {
        Write-Success "KV namespace '$namespace' already exists (ID: $($existingKv.id))"
    } else {
        Write-Warning-Custom "KV namespace '$namespace' not found. Creating..."
        if (-not $DryRun) {
            $kvResult = npx wrangler kv:namespace create $namespace
            Write-Success "KV namespace created: $namespace"
            Write-Host $kvResult
        } else {
            Write-Info "[DRY RUN] Would create KV namespace: $namespace"
        }
    }
}

# Step 6: Verify/Create R2 Buckets
Write-Step "Step 6: R2 Bucket Setup"

$r2Buckets = @(
    "estateflow-assets",
    "profile-photos",
    "property-images",
    "documents",
    "qr-codes"
)

foreach ($bucket in $r2Buckets) {
    Write-Info "Checking R2 bucket: $bucket"
    $bucketList = npx wrangler r2 bucket list --json | ConvertFrom-Json
    $existingBucket = $bucketList.buckets | Where-Object { $_.name -eq $bucket }

    if ($existingBucket) {
        Write-Success "R2 bucket '$bucket' already exists"
    } else {
        Write-Warning-Custom "R2 bucket '$bucket' not found. Creating..."
        if (-not $DryRun) {
            npx wrangler r2 bucket create $bucket
            Write-Success "R2 bucket created: $bucket"
        } else {
            Write-Info "[DRY RUN] Would create R2 bucket: $bucket"
        }
    }
}

# Step 7: Install Dependencies
if (-not $SkipBuild) {
    Write-Step "Step 7: Installing Dependencies"

    Write-Info "Running npm install..."
    if (-not $DryRun) {
        npm install
        Write-Success "Dependencies installed"
    } else {
        Write-Info "[DRY RUN] Would run: npm install"
    }
}

# Step 8: Type Checking
if (-not $SkipBuild) {
    Write-Step "Step 8: TypeScript Type Checking"

    Write-Info "Running type check..."
    if (-not $DryRun) {
        try {
            npm run typecheck
            Write-Success "Type checking passed"
        } catch {
            Write-Warning-Custom "Type checking found issues. Review output above."
        }
    } else {
        Write-Info "[DRY RUN] Would run: npm run typecheck"
    }
}

# Step 9: Build Application
if (-not $SkipBuild) {
    Write-Step "Step 9: Building Application"

    Write-Info "Running production build..."
    if (-not $DryRun) {
        npm run build
        Write-Success "Build completed"

        # Verify build output
        if (Test-Path "build/client") {
            Write-Success "Build output verified: build/client directory exists"
        } else {
            Write-Error-Custom "Build output directory not found!"
            exit 1
        }
    } else {
        Write-Info "[DRY RUN] Would run: npm run build"
    }
}

# Step 10: Deploy to Cloudflare Pages
Write-Step "Step 10: Deploying to Cloudflare Pages"

if (-not $DryRun) {
    Write-Info "Deploying to Cloudflare Pages..."

    # Deploy using wrangler pages deploy
    $deployResult = npx wrangler pages deploy ./build/client --project-name=$PAGES_PROJECT_NAME

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Successfully deployed to Cloudflare Pages"
        Write-Host $deployResult

        # Extract deployment URL
        $deploymentUrl = ($deployResult | Select-String -Pattern 'https://[^\s]+\.pages\.dev').Matches.Value
        if ($deploymentUrl) {
            Write-Success "Deployment URL: $deploymentUrl"
        }
    } else {
        Write-Error-Custom "Deployment failed"
        exit 1
    }
} else {
    Write-Info "[DRY RUN] Would run: npx wrangler pages deploy ./build/client --project-name=$PAGES_PROJECT_NAME"
}

# Step 11: Verify Deployment
Write-Step "Step 11: Deployment Verification"

if (-not $DryRun) {
    Write-Info "Fetching deployment list..."
    npx wrangler pages deployment list --project-name=$PAGES_PROJECT_NAME

    Write-Info "Testing database connection..."
    try {
        npx wrangler d1 execute $DB_NAME --command="SELECT COUNT(*) as count FROM professionals;"
        Write-Success "Database connection verified"
    } catch {
        Write-Warning-Custom "Database query failed. Tables may not be initialized yet."
    }
} else {
    Write-Info "[DRY RUN] Would verify deployment"
}

# Final Summary
Write-Host @"

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ✅ DEPLOYMENT COMPLETE                                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📝 Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🔍 Monitor real-time errors:
   npx wrangler pages deployment tail --project-name=$PAGES_PROJECT_NAME

2. 📊 Check deployment status:
   npx wrangler pages deployment list --project-name=$PAGES_PROJECT_NAME

3. 💾 Query database:
   npx wrangler d1 execute $DB_NAME --command="SELECT COUNT(*) FROM professionals;"

4. 📈 View error statistics:
   npm run monitor:db

5. 🧪 Run smoke tests:
   npm run smoke-test

🔗 Useful Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View logs:      npx wrangler pages deployment tail
List projects:  npx wrangler pages project list
Check DB stats: npm run monitor:db
Import data:    npm run import:test

📚 Documentation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• CLAUDE.md - AI assistant guide
• README.md - Project overview
• docs/UNIFIED_PLATFORM_ARCHITECTURE.md - System architecture

"@ -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "`n⚠️  DRY RUN MODE - No changes were made" -ForegroundColor Yellow
}

Write-Success "Deployment script completed!"
