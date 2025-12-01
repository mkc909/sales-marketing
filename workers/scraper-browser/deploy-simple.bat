@echo off
echo ========================================
echo Deploying Browser Rendering Worker
echo ========================================
echo.
echo Browser Rendering auto-bills $5/month + usage
echo No dashboard toggle needed!
echo.

REM Use simplified config
echo Using simplified config (no KV)...
copy /Y wrangler-simple.toml wrangler.toml >nul
echo Config updated

echo.
echo Deploying to Cloudflare...
call wrangler deploy

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Worker URL: https://scraper-browser.magicmike.workers.dev
echo.
echo Test command:
echo curl -X POST https://scraper-browser.magicmike.workers.dev -H "Content-Type: application/json" -d "{\"state\":\"FL\",\"profession\":\"real_estate\",\"zip\":\"33139\"}"
echo.
echo Next: Deploy scraper-api worker
echo cd ..\scraper-api
echo wrangler deploy
echo.
pause