# Real-time error monitoring for EstateFlow
Write-Host 'Starting real-time error monitoring...' -ForegroundColor Cyan
Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow
Write-Host ''

# Monitor with formatting and filtering
wrangler tail --format pretty | Select-String -Pattern 'ERROR|CRITICAL|WARNING' -AllMatches
