@echo off
echo =========================================
echo Starting VPN MVP Backend Server
echo =========================================
echo.

cd /d "%~dp0backend"

echo Backend server starting on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

node index.js

pause
