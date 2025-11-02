@echo off
:: Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
    cd /d "%~dp0app"
    call npm start
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit
)
