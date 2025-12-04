@echo off
echo Running Git Sync and Documentation Management...
echo.
powershell -ExecutionPolicy Bypass -File GIT_SYNC.ps1
echo.
echo Git sync completed!
pause