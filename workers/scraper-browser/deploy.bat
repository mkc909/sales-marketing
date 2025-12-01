@echo off
echo ========================================
echo Deploying Scraper Browser Worker
echo ========================================
echo.

REM Navigate to script directory
cd /d "%~dp0"

echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies
    exit /b 1
)
echo Dependencies installed

echo.
echo Creating KV namespace...
call wrangler kv:namespace create "CACHE" 2>nul
echo KV namespace ready

echo.
echo Deploying to Cloudflare...
call wrangler deploy

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Test the worker:
echo curl -X POST https://scraper-browser.magicmike.workers.dev -H "Content-Type: application/json" -d "{\"state\":\"FL\",\"profession\":\"real_estate\",\"zip\":\"33139\"}"
echo.
pause