@echo off
echo ============================================
echo ProGeoData Redeployment to Aura Media Studios
echo Account ID: af57e902fd9dcaad7484a7195ac0f536
echo ============================================
echo.

cd /d C:\dev\GITHUB_MKC909_REPOS\sales-marketing

set ACCOUNT_ID=af57e902fd9dcaad7484a7195ac0f536

echo Step 1: Creating D1 database in Aura Media Studios...
call npx wrangler d1 create progeodata-db --account-id %ACCOUNT_ID%
echo.

echo Step 2: Applying migration to correct database...
cd worktrees\siteforge
call npx wrangler d1 execute progeodata-db --file=migrations\010_queue_tables.sql --account-id %ACCOUNT_ID%
cd ..\..
echo.

echo Step 3: Creating Queues in Aura Media Studios...
call npx wrangler queues create progeodata-scrape-queue --account-id %ACCOUNT_ID%
call npx wrangler queues create progeodata-scrape-dlq --account-id %ACCOUNT_ID%
echo.

echo Step 4: Creating KV namespace in Aura Media Studios...
call npx wrangler kv:namespace create PROGEODATA_RATE_LIMITS --account-id %ACCOUNT_ID%
echo.

echo Step 5: Deploying seed worker to Aura Media Studios...
cd workers\progeodata-queue-seed
call npx wrangler deploy --account-id %ACCOUNT_ID%
cd ..\..
echo.

echo Step 6: Deploying consumer worker to Aura Media Studios...
cd workers\progeodata-queue-consumer
call npx wrangler deploy --account-id %ACCOUNT_ID%
cd ..\..
echo.

echo ============================================
echo REDEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Workers now deployed to Aura Media Studios:
echo - https://progeodata-queue-seed.auramediastudios.workers.dev
echo - https://progeodata-queue-consumer.auramediastudios.workers.dev
echo.
echo To test:
echo curl -X POST https://progeodata-queue-seed.auramediastudios.workers.dev/seed -H "Content-Type: application/json" -d "{\"mode\":\"test\"}"
echo.
pause