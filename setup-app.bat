@echo off
echo =========================================
echo VPN MVP - Electron App Setup
echo =========================================
echo.

cd /d "%~dp0app"

echo Installing Electron app dependencies...
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install app dependencies
    pause
    exit /b 1
)

echo.
echo =========================================
echo App setup complete!
echo =========================================
echo.
echo To run the application:
echo 1. Start backend: run 'start-backend.bat'
echo 2. Start app: run 'start-app.bat'
echo.
pause
