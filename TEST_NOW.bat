@echo off
echo ============================================
echo TESTING PROGEODATA NOW!
echo ============================================
echo.

echo Step 1: Testing Health Check...
curl https://progeodata-queue-seed.auramediastudios.workers.dev/health
echo.
echo.

echo Step 2: Starting TEST SEED (20 ZIPs including Vashon Island)...
curl -X POST https://progeodata-queue-seed.auramediastudios.workers.dev/seed -H "Content-Type: application/json" -d "{\"mode\":\"test\"}"
echo.
echo.

echo Step 3: Checking Queue Status...
timeout /t 10 /nobreak > nul
curl https://progeodata-queue-seed.auramediastudios.workers.dev/status
echo.
echo.

echo ============================================
echo TEST COMPLETE!
echo ============================================
echo.
echo If you see "queued": 20 above, the system is working!
echo.
echo NOW RUN PRODUCTION:
echo curl -X POST https://progeodata-queue-seed.auramediastudios.workers.dev/seed -H "Content-Type: application/json" -d "{\"mode\":\"production\"}"
echo.
pause