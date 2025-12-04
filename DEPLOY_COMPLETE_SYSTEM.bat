@echo off
echo ================================================
echo ProGeoData Complete System Deployment
echo Account: Aura Media Studios
echo ================================================
echo.

set ACCOUNT_ID=af57e902fd9dcaad7484a7195ac0f536

echo [1/7] Creating KV namespace for purchase tokens...
call npx wrangler kv:namespace create "progeodata-purchase-tokens" --account-id %ACCOUNT_ID%

echo.
echo [2/7] Applying Stripe payments migration...
call npx wrangler d1 execute progeodata-db --file=migrations/012_stripe_payments.sql --account-id %ACCOUNT_ID%

echo.
echo [3/7] Deploying fixed scraper-browser (no mock data)...
cd workers\scraper-browser
call npm install
call npm run build
call npx wrangler deploy --account-id %ACCOUNT_ID%
cd ..\..

echo.
echo [4/7] Deploying Stripe payment worker...
cd workers\progeodata-stripe
call npm install
echo.
echo IMPORTANT: Set Stripe secrets before first use:
echo   wrangler secret put STRIPE_SECRET_KEY --account-id %ACCOUNT_ID%
echo   wrangler secret put STRIPE_WEBHOOK_SECRET --account-id %ACCOUNT_ID%
echo.
call npm run build
call npx wrangler deploy --account-id %ACCOUNT_ID%
cd ..\..

echo.
echo [5/7] Deploying data export API...
cd workers\progeodata-export
call npm install
call npm run build
call npx wrangler deploy --account-id %ACCOUNT_ID%
cd ..\..

echo.
echo [6/7] Testing endpoints...
echo Testing scraper health...
curl -s https://progeodata-scraper-browser.auramediastudios.workers.dev/health
echo.
echo Testing Stripe health...
curl -s https://progeodata-stripe.auramediastudios.workers.dev/health
echo.
echo Testing export API health...
curl -s https://progeodata-export.auramediastudios.workers.dev/health
echo.
echo Testing data stats...
curl -s https://progeodata-export.auramediastudios.workers.dev/api/stats

echo.
echo ================================================
echo DEPLOYMENT COMPLETE!
echo ================================================
echo.
echo Live Endpoints:
echo - Scraper: https://progeodata-scraper-browser.auramediastudios.workers.dev
echo - Stripe: https://progeodata-stripe.auramediastudios.workers.dev
echo - Export: https://progeodata-export.auramediastudios.workers.dev
echo.
echo Next Steps:
echo 1. Set Stripe secret keys:
echo    wrangler secret put STRIPE_SECRET_KEY --account-id %ACCOUNT_ID%
echo    wrangler secret put STRIPE_WEBHOOK_SECRET --account-id %ACCOUNT_ID%
echo.
echo 2. Configure Stripe webhook endpoint:
echo    https://progeodata-stripe.auramediastudios.workers.dev/api/stripe/webhook
echo.
echo 3. Test checkout flow:
echo    POST https://progeodata-stripe.auramediastudios.workers.dev/api/checkout/create-session
echo    Body: {"pack": "florida"}
echo.
echo 4. Test data export (after purchase):
echo    GET https://progeodata-export.auramediastudios.workers.dev/api/export/florida.csv?token=YOUR_TOKEN
echo.
pause