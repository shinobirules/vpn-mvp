@echo off
echo =========================================
echo Starting VPN MVP Electron App
echo =========================================
echo.

cd /d "%~dp0app"

echo Launching Electron app...
echo Make sure the backend server is running!
echo.

call npm start

pause
