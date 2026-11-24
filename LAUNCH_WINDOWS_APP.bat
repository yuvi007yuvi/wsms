@echo off
title WeightT360Pro Desktop Application
color 0B

echo ========================================================
echo        WEIGHTT360PRO WINDOWS DESKTOP APP
echo         (100%% Operational Offline System)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo Installing production dependencies...
    call npm install --omit=dev
)

:: Ensure electron is available
if not exist "node_modules\electron\" (
    echo Installing Desktop App Engine (Electron)...
    call npm install electron@^28.3.3 --save-dev
)

echo [3/3] Launching WeightT360Pro Desktop Application...
:: Prefer locally installed electron binary over npx
if exist "node_modules\.bin\electron.cmd" (
    call "node_modules\.bin\electron.cmd" "%~dp0\electron\main.js"
) else (
    call npx electron "%~dp0\electron\main.js"
)

