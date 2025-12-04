@echo off
echo ============================================
echo Deploying Fixed Scraper-Browser Worker
echo (No Mock Data Version)
echo Account: Aura Media Studios
echo ============================================

cd workers\scraper-browser

echo Building TypeScript...
call npm run build

echo Deploying to Aura Media Studios...
call npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536

echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo The scraper-browser worker has been updated to:
echo - Return empty arrays instead of mock data
echo - Fail gracefully with 404 for unsupported states
echo - Only cache real professional data
echo.
pause