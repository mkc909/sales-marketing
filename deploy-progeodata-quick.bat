@echo off
echo ============================================
echo ProGeoData Cron Worker Quick Deployment
echo ============================================
echo.

cd /d C:\dev\GITHUB_MKC909_REPOS\sales-marketing

echo Step 1: Checking Cloudflare authentication...
call npx wrangler whoami
if %ERRORLEVEL% NEQ 0 (
    echo Please login to Cloudflare first:
    call npx wrangler login
)

echo.
echo Step 2: Creating/Finding ProGeoData D1 database...
call npx wrangler d1 create progeodata-db 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Database created! Please update wrangler.toml files with the database_id shown above.
) else (
    echo Database may already exist, continuing...
)

echo.
echo Step 3: Applying migration...
cd worktrees\siteforge
call npx wrangler d1 execute progeodata-db --file=migrations\010_queue_tables.sql
cd ..\..

echo.
echo Step 4: Creating Cloudflare Queues...
call npx wrangler queues create progeodata-scrape-queue 2>nul
call npx wrangler queues create progeodata-scrape-dlq 2>nul
echo Queues created or already exist.

echo.
echo Step 5: Creating KV namespace for rate limiting...
call npx wrangler kv:namespace create PROGEODATA_RATE_LIMITS 2>nul
echo KV namespace created or already exists.

echo.
echo Step 6: Deploying seed worker...
cd workers\progeodata-queue-seed
if exist package.json (
    call npm install --silent
    call npx wrangler deploy
    echo Seed worker deployed!
) else (
    echo ERROR: Seed worker package.json not found!
)
cd ..\..

echo.
echo Step 7: Creating consumer worker if needed...
cd workers\progeodata-queue-consumer
if not exist src\index.ts (
    echo Creating consumer worker source file...
    mkdir src 2>nul
    echo // Consumer worker placeholder > src\index.ts
)
if exist package.json (
    call npm install --silent
    call npx wrangler deploy
    echo Consumer worker deployed!
) else (
    echo ERROR: Consumer worker package.json not found!
)
cd ..\..

echo.
echo Step 8: Triggering test seed...
echo Please wait for workers to be ready, then run:
echo curl -X POST https://progeodata-queue-seed.[your-subdomain].workers.dev/seed -H "Content-Type: application/json" -d "{\"mode\":\"test\"}"

echo.
echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo To check queue status:
echo   npx wrangler d1 execute progeodata-db --command="SELECT * FROM queue_health"
echo.
echo To monitor workers:
echo   npx wrangler tail progeodata-queue-seed
echo   npx wrangler tail progeodata-queue-consumer
echo.
pause