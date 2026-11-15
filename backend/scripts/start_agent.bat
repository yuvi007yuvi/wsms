@echo off
title WSMS Weighbridge Machine Direct Agent
color 0A
cd /d "%~dp0"

echo ========================================================
echo        STARTING WSMS LOCAL WEIGHBRIDGE AGENT
echo ========================================================
echo.
echo [1/3] Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed or not in system PATH!
    echo Please install Node.js from https://nodejs.org/ and run this file again.
    echo.
    pause
    exit /b
)

echo [2/3] Checking serialport and socket.io-client dependencies...
if not exist "%~dp0node_modules\serialport\" (
    echo.
    echo Installing required packages (serialport, socket.io-client)...
    echo Please wait 10-20 seconds for the first-time setup...
    call npm init -y >nul 2>&1
    call npm install serialport@^13.0.0 socket.io-client@^4.8.3 --silent --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install packages automatically.
        echo Please ensure your PC is connected to the internet.
        pause
        exit /b
    )
    echo Dependencies installed successfully!
)

echo.
echo [3/3] Starting Weighbridge Hardware Agent...
echo.
node "%~dp0weighbridge_agent.js"
if %errorlevel% neq 0 (
    echo.
    echo Agent exited with error code %errorlevel%.
)
pause
