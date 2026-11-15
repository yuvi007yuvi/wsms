@echo off
title WSMS Weighbridge Machine Direct Agent
color 0A
cd /d "%~dp0"

echo ========================================================
echo        STARTING WSMS LOCAL WEIGHBRIDGE AGENT
echo ========================================================
echo.

echo [1/2] Checking dependencies...
if not exist "%~dp0node_modules\serialport\" (
    echo Installing serialport and socket.io-client...
    echo (This only happens on the first run, please wait a moment...)
    call npm init -y
    call npm install serialport socket.io-client
)

echo.
echo [2/2] Running agent...
echo.
node "%~dp0weighbridge_agent.js"

echo.
echo --------------------------------------------------------
echo The agent has stopped. See error message above.
echo --------------------------------------------------------
pause
