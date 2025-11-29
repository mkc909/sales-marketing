# Quick status check for EstateFlow
Write-Host '🔍 EstateFlow Platform Status Check' -ForegroundColor Cyan
Write-Host '====================================' -ForegroundColor Cyan

# Check worker status
Write-Host ''
Write-Host 'Worker Status:' -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri 'https://estateflow.com/health' -Method GET -ErrorAction Stop
    Write-Host "Main App: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host 'Main App: Not responding' -ForegroundColor Red
}

# Check database
Write-Host ''
Write-Host 'Database Stats:' -ForegroundColor White
wrangler d1 execute estateflow-db --command='SELECT industry, COUNT(*) as professionals FROM professionals GROUP BY industry;'

# Check recent errors
Write-Host ''
Write-Host 'Recent Errors (Last 24h):' -ForegroundColor White
wrangler d1 execute estateflow-db --command=""SELECT level, category, COUNT(*) as count FROM error_logs WHERE timestamp > strftime('%s','now') - 86400 GROUP BY level, category ORDER BY count DESC LIMIT 5;""

Write-Host ''
Write-Host '====================================' -ForegroundColor Cyan
