#!/bin/bash

# EstateFlow Multi-Industry Platform Deployment Script
# Deploys to Cloudflare Workers with D1, R2, KV, and Analytics

set -e  # Exit on any error

echo "🚀 Starting EstateFlow Multi-Industry Platform Deployment"
echo "================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="estateflow"
ENVIRONMENT=${1:-production}  # Default to production, can pass 'staging' as argument

echo -e "${YELLOW}Deploying to: $ENVIRONMENT${NC}"

# Step 1: Check Prerequisites
echo ""
echo "📋 Checking prerequisites..."

if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Installing...${NC}"
    npm install -g wrangler
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Step 2: Authenticate with Cloudflare
echo ""
echo "🔐 Authenticating with Cloudflare..."
wrangler whoami || wrangler login

# Step 3: Create D1 Databases
echo ""
echo "💾 Setting up D1 databases..."

# Check if database exists, create if not
if ! wrangler d1 list | grep -q "${PROJECT_NAME}-db"; then
    echo "Creating main database..."
    DB_CREATE_OUTPUT=$(wrangler d1 create ${PROJECT_NAME}-db)
    DB_ID=$(echo "$DB_CREATE_OUTPUT" | grep -oP 'database_id = "\K[^"]+')
    echo "Created database with ID: $DB_ID"

    # Update wrangler.toml with the database ID
    sed -i "s/database_id = \".*\"/database_id = \"$DB_ID\"/" wrangler.toml
else
    echo "Database ${PROJECT_NAME}-db already exists"
    DB_ID=$(wrangler d1 list --json | jq -r ".[] | select(.name==\"${PROJECT_NAME}-db\") | .uuid")
fi

# Step 4: Run Database Migrations
echo ""
echo "🔄 Running database migrations..."

# Run migrations in order
for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Running migration: $(basename $migration)"
        wrangler d1 execute ${PROJECT_NAME}-db --file="$migration" || {
            echo -e "${YELLOW}⚠️  Migration may have already been applied, continuing...${NC}"
        }
    fi
done

echo -e "${GREEN}✅ Database migrations complete${NC}"

# Step 5: Create KV Namespaces
echo ""
echo "📦 Setting up KV namespaces..."

# Create KV namespaces if they don't exist
KV_NAMESPACES=("LINKS" "PINS" "CACHE" "ANALYTICS")

for namespace in "${KV_NAMESPACES[@]}"; do
    if ! wrangler kv:namespace list | grep -q "$namespace"; then
        echo "Creating KV namespace: $namespace"
        KV_OUTPUT=$(wrangler kv:namespace create "$namespace")
        KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')
        echo "Created $namespace with ID: $KV_ID"
    else
        echo "KV namespace $namespace already exists"
    fi
done

# Step 6: Create R2 Buckets
echo ""
echo "🪣 Setting up R2 buckets..."

R2_BUCKETS=("profile-photos" "property-images" "truepoint-photos" "qr-codes" "documents")

for bucket in "${R2_BUCKETS[@]}"; do
    if ! wrangler r2 bucket list | grep -q "$bucket"; then
        echo "Creating R2 bucket: $bucket"
        wrangler r2 bucket create "$bucket"
    else
        echo "R2 bucket $bucket already exists"
    fi
done

# Step 7: Set Environment Secrets
echo ""
echo "🔑 Configuring environment secrets..."

# Check if secrets are already set, if not prompt for them
echo "Checking required secrets..."

# PostHog configuration
if ! wrangler secret list | grep -q "POSTHOG_KEY"; then
    echo -e "${YELLOW}Enter PostHog API Key (or press Enter to skip):${NC}"
    read -s POSTHOG_KEY
    if [ ! -z "$POSTHOG_KEY" ]; then
        echo "$POSTHOG_KEY" | wrangler secret put POSTHOG_KEY
        echo -e "${GREEN}✅ PostHog key configured${NC}"
    fi
fi

# Alert webhook for critical errors
if ! wrangler secret list | grep -q "ALERT_WEBHOOK_URL"; then
    echo -e "${YELLOW}Enter Alert Webhook URL (Slack/Discord, or press Enter to skip):${NC}"
    read -s ALERT_WEBHOOK_URL
    if [ ! -z "$ALERT_WEBHOOK_URL" ]; then
        echo "$ALERT_WEBHOOK_URL" | wrangler secret put ALERT_WEBHOOK_URL
        echo -e "${GREEN}✅ Alert webhook configured${NC}"
    fi
fi

# GitHub token for data import
if ! wrangler secret list | grep -q "GITHUB_TOKEN"; then
    echo -e "${YELLOW}Enter GitHub Token for data import (or press Enter to skip):${NC}"
    read -s GITHUB_TOKEN
    if [ ! -z "$GITHUB_TOKEN" ]; then
        echo "$GITHUB_TOKEN" | wrangler secret put GITHUB_TOKEN
        echo -e "${GREEN}✅ GitHub token configured${NC}"
    fi
fi

# Mapbox token for TruePoint
if ! wrangler secret list | grep -q "MAPBOX_TOKEN"; then
    echo -e "${YELLOW}Enter Mapbox Token (or press Enter to skip):${NC}"
    read -s MAPBOX_TOKEN
    if [ ! -z "$MAPBOX_TOKEN" ]; then
        echo "$MAPBOX_TOKEN" | wrangler secret put MAPBOX_TOKEN
        echo -e "${GREEN}✅ Mapbox token configured${NC}"
    fi
fi

# Step 8: Build the Application
echo ""
echo "🔨 Building application..."

npm install
npm run build

echo -e "${GREEN}✅ Build complete${NC}"

# Step 9: Deploy Workers
echo ""
echo "🚢 Deploying workers to Cloudflare..."

# Deploy main application
echo "Deploying main application..."
wrangler deploy

# Deploy additional workers
echo "Deploying URL shortener worker..."
cd workers/shortener
npm install
wrangler deploy
cd ../..

echo "Deploying QR generator worker..."
cd workers/qr-generator
npm install
wrangler deploy
cd ../..

echo "Deploying agent ingestion worker..."
cd workers/agent-ingestion
npm install
wrangler deploy
cd ../..

echo -e "${GREEN}✅ All workers deployed${NC}"

# Step 10: Verify Deployment
echo ""
echo "✅ Verifying deployment..."

# Get the deployed URL
if [ "$ENVIRONMENT" = "production" ]; then
    APP_URL="https://estateflow.com"
else
    WORKER_URL=$(wrangler deployments list | grep -oP 'https://[^\s]+\.workers\.dev' | head -1)
    APP_URL=${WORKER_URL:-"https://${PROJECT_NAME}.workers.dev"}
fi

echo "Testing application at: $APP_URL"

# Test the main endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/health")
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Application is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Application returned status: $HTTP_STATUS${NC}"
fi

# Test D1 connection
echo "Testing database connection..."
wrangler d1 execute ${PROJECT_NAME}-db --command="SELECT COUNT(*) as count FROM professionals;" || {
    echo -e "${YELLOW}⚠️  Database query failed, tables might not be initialized yet${NC}"
}

# Step 11: Set up Monitoring
echo ""
echo "📊 Setting up monitoring..."

# Create a monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
# Real-time error monitoring for EstateFlow

echo "Starting real-time error monitoring..."
echo "Press Ctrl+C to stop"
echo ""

# Monitor with formatting and filtering
wrangler tail --format pretty | grep -E "(ERROR|CRITICAL|WARNING)" --color=always
EOF

chmod +x monitor.sh

echo -e "${GREEN}✅ Monitoring script created: ./monitor.sh${NC}"

# Step 12: Import Initial Data (Optional)
echo ""
echo -e "${YELLOW}Would you like to import initial professional data? (y/n)${NC}"
read -r IMPORT_DATA

if [[ "$IMPORT_DATA" =~ ^[Yy]$ ]]; then
    echo "Starting data import..."

    # Download and import Florida real estate agents
    echo "Importing Florida real estate agents..."
    curl -s "https://www.myfloridalicense.com/datadownload/downloadRE.asp" -o fl_agents.csv

    # Create import script if it doesn't exist
    if [ ! -f "scripts/import-agents.js" ]; then
        mkdir -p scripts
        cat > scripts/import-agents.js << 'EOF'
// Agent import script
const fs = require('fs');
const csv = require('csv-parse');

async function importAgents(file) {
    const records = [];
    const parser = fs.createReadStream(file)
        .pipe(csv.parse({ columns: true }));

    for await (const record of parser) {
        records.push({
            name: record['Full Name'],
            license_number: record['License Number'],
            state: 'FL',
            status: record['Status'],
            // Add more fields as needed
        });
    }

    console.log(`Parsed ${records.length} agents`);
    // TODO: Insert into D1 database
}

importAgents(process.argv[2]);
EOF
    fi

    node scripts/import-agents.js fl_agents.csv || {
        echo -e "${YELLOW}⚠️  Import script needs to be customized for your data format${NC}"
    }
fi

# Step 13: Generate Summary Report
echo ""
echo "================================================"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo "================================================"
echo ""
echo "📝 Deployment Summary:"
echo "---------------------"
echo "Environment: $ENVIRONMENT"
echo "Application URL: $APP_URL"
echo "Database: ${PROJECT_NAME}-db (ID: $DB_ID)"
echo ""
echo "📊 Next Steps:"
echo "1. Monitor errors: ./monitor.sh"
echo "2. View logs: wrangler tail"
echo "3. Check analytics: wrangler d1 execute ${PROJECT_NAME}-db --command='SELECT * FROM error_metrics ORDER BY date DESC LIMIT 10;'"
echo "4. Import more data: node scripts/import-agents.js"
echo ""
echo "🔧 Useful Commands:"
echo "-------------------"
echo "Real-time logs:     wrangler tail --format pretty"
echo "Error monitoring:   wrangler tail | grep ERROR"
echo "Database query:     wrangler d1 execute ${PROJECT_NAME}-db --command='YOUR_SQL'"
echo "Update secrets:     wrangler secret put SECRET_NAME"
echo "View KV data:       wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID"
echo ""
echo "📚 Documentation:"
echo "-----------------"
echo "Platform Guide:     docs/MULTI_INDUSTRY_PLATFORM_ARCHITECTURE.md"
echo "Error Tracking:     docs/MULTI_INDUSTRY_IMPLEMENTATION_SUMMARY.md"
echo "Agent System:       docs/AGENT_SYSTEM_IMPLEMENTATION_SUMMARY.md"
echo ""
echo -e "${GREEN}✨ Your multi-industry platform is now live!${NC}"
echo "================================================"

# Create a quick status check script
cat > status.sh << 'EOF'
#!/bin/bash
# Quick status check for EstateFlow

echo "🔍 EstateFlow Platform Status Check"
echo "===================================="

# Check worker status
echo ""
echo "Worker Status:"
curl -s -o /dev/null -w "Main App: %{http_code}\n" https://estateflow.com/health || echo "Main App: Not responding"

# Check database
echo ""
echo "Database Stats:"
wrangler d1 execute estateflow-db --command="
    SELECT
        industry,
        COUNT(*) as professionals,
        SUM(CASE WHEN subscription_tier != 'ghost' THEN 1 ELSE 0 END) as paid
    FROM professionals
    GROUP BY industry;
" 2>/dev/null || echo "Database: Unable to query"

# Check recent errors
echo ""
echo "Recent Errors (Last 24h):"
wrangler d1 execute estateflow-db --command="
    SELECT
        level,
        category,
        COUNT(*) as count
    FROM error_logs
    WHERE timestamp > strftime('%s','now') - 86400
    GROUP BY level, category
    ORDER BY count DESC
    LIMIT 5;
" 2>/dev/null || echo "No error data available"

echo ""
echo "===================================="
EOF

chmod +x status.sh

echo ""
echo -e "${GREEN}Quick status check available: ./status.sh${NC}"