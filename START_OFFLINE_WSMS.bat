@echo off
title WSMS Offline Weighbridge System
color 0A

echo ========================================================
echo         WSMS OFFLINE WEIGHBRIDGE SYSTEM
echo   (All-in-One: Server + Weighbridge Reader + Auto-Sync)
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

echo [0/4] Checking for online app updates...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'https://wsms-1.onrender.com/api/health' -TimeoutSec 4 -UseBasicParsing; if ($r.StatusCode -eq 200) { Write-Host 'Internet detected. Downloading latest offline update...'; $zip = Join-Path $env:TEMP 'wsms_update.zip'; $ext = Join-Path $env:TEMP 'wsms_update_dir'; Invoke-WebRequest -Uri 'https://wsms-1.onrender.com/api/system/download-offline-package' -OutFile $zip -TimeoutSec 30 -UseBasicParsing; if (Test-Path $ext) { Remove-Item -Recurse -Force $ext }; Expand-Archive -Path $zip -DestinationPath $ext -Force; Copy-Item -Recurse -Force (Join-Path $ext 'dist') . ; Copy-Item -Recurse -Force (Join-Path $ext 'public') . ; if (Test-Path (Join-Path $ext 'electron')) { Copy-Item -Recurse -Force (Join-Path $ext 'electron') . }; Copy-Item -Force (Join-Path $ext 'prisma\schema.sqlite.prisma') 'prisma\' ; Copy-Item -Force (Join-Path $ext 'package.json') . ; Remove-Item -Force $zip; Remove-Item -Recurse -Force $ext; Write-Host 'App updated successfully!' } } catch { Write-Host 'Offline mode: skipping update check.' }"

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

echo [4/4] Starting Local WSMS Server, Weighbridge Reader & Cloud Sync on port 5000...
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
