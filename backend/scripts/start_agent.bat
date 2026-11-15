@echo off
title WSMS Weighbridge Machine Direct Agent
color 0A
cd /d "%~dp0"

echo ========================================================
echo        STARTING WSMS LOCAL WEIGHBRIDGE AGENT
echo ========================================================
echo.
echo  Usage:  start_agent.bat          - menu (Normal starts automatically after 10 seconds)
echo          start_agent.bat scan     - find which COM port / baud rate has the weighbridge
echo          start_agent.bat deep     - try every setting and command (10-15 minutes)
echo.

echo [1/3] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    color 0C
    echo.
    echo  ERROR: Node.js is not installed on this PC.
    echo  Download the LTS version from https://nodejs.org , install it,
    echo  then close this window and double-click start_agent.bat again.
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo        Node.js %%v found.

echo [2/3] Checking dependencies...
if not exist "%~dp0weighbridge_agent.js" (
    color 0C
    echo  ERROR: weighbridge_agent.js is missing. Put it in the same folder as this file:
    echo  %~dp0
    pause
    exit /b 1
)
if not exist "%~dp0node_modules\serialport\" goto install
if not exist "%~dp0node_modules\socket.io-client\" goto install
goto run

:install
echo        Installing serialport and socket.io-client (first run only, needs internet)...
if not exist "%~dp0package.json" call npm init -y >nul
call npm install serialport@13 socket.io-client@4
if errorlevel 1 (
    color 0C
    echo.
    echo  ERROR: npm install failed. Check the internet connection / proxy and try again.
    pause
    exit /b 1
)

:run
echo.
set "MODE=%~1"
if "%MODE%"=="" (
    echo   Choose what to run:
    echo     1 = Normal  - stream live weight to the cloud  [default]
    echo     2 = Scan    - quick check of COM ports and baud rates
    echo     3 = Deep scan - try EVERY setting and command, about 10-15 minutes
    echo.
    choice /c 123 /t 10 /d 1 /n /m "  Press 1, 2 or 3 (Normal starts in 10 seconds): "
    if errorlevel 3 (set "MODE=deep") else if errorlevel 2 (set "MODE=scan") else (set "MODE=normal")
)
echo.
echo [3/3] Running agent (%MODE%)...
echo.
if /i "%MODE%"=="deep" (
    node "%~dp0weighbridge_agent.js" --deep
) else if /i "%MODE%"=="scan" (
    node "%~dp0weighbridge_agent.js" --scan
) else (
    node "%~dp0weighbridge_agent.js"
)

echo.
echo --------------------------------------------------------
echo The agent has stopped. See the message above.
echo --------------------------------------------------------
pause
