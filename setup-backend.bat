@echo off
echo =========================================
echo VPN MVP - Backend Setup
echo =========================================
echo.

cd /d "%~dp0backend"

echo Installing backend dependencies...
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo Generating password hash for demo user (password123)...
node generate-password.js

echo.
echo =========================================
echo Backend setup complete!
echo =========================================
echo.
echo Next steps:
echo 1. Update backend/.env with your WireGuard server details
echo 2. Update backend/server-config.json with server information
echo 3. Run 'setup-app.bat' to set up the Electron app
echo.
pause
