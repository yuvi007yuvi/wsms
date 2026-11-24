@echo off
title WSMS Offline Weighbridge System
color 0A

echo ========================================================
echo         WSMS OFFLINE WEIGHBRIDGE SYSTEM
echo      (100%% Operational Without Internet)
echo ========================================================
echo.

:: Detect if we are inside repository root or extracted package root
if exist "%~dp0\backend" (
    cd /d "%~dp0\backend"
) else (
    cd /d "%~dp0"
)

:: Set Offline Mode Environment Variables
set NODE_ENV=production
set PORT=5000
set IS_OFFLINE_NODE=true
set DATABASE_URL=file:./dev.db
set CLOUD_SERVER_URL=https://wsms-1.onrender.com/api

echo [1/4] Checking Node.js environment...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [2/4] Checking dependencies...
if not exist "node_modules\" (
    echo Installing production dependencies...
    call npm install --omit=dev
)

echo [3/4] Initializing local database and services...
:: Replace schema.prisma with sqlite schema for local offline node
if exist "prisma\schema.sqlite.prisma" (
    copy /y "prisma\schema.sqlite.prisma" "prisma\schema.prisma" >nul
)

echo Generating local offline database client...
call npx prisma generate --schema=prisma/schema.prisma

if not exist "prisma\dev.db" (
    echo Creating fresh local SQLite database...
    call npx prisma db push --schema=prisma/schema.prisma --accept-data-loss
    if exist "dist\seed-offline.js" (
        node dist\seed-offline.js
    )
) else (
    echo Updating local SQLite database...
    call npx prisma db push --schema=prisma/schema.prisma --accept-data-loss
    if exist "dist\seed-offline.js" (
        node dist\seed-offline.js
    )
)

echo [4/4] Starting Local WSMS Server on port 5000...
start "" "http://localhost:5000"

:: Start Node.js server
if exist "dist\index.js" (
    node dist\index.js
) else if exist "src\index.ts" (
    call npx tsx src\index.ts
) else (
    color 0C
    echo [ERROR] Cannot find server build files! Make sure the offline package was extracted completely.
    pause
)

pause
