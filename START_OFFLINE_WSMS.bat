@echo off
title WSMS Offline Weighbridge System
color 0A

echo ========================================================
echo         WSMS OFFLINE WEIGHBRIDGE SYSTEM
echo      (100%% Operational Without Internet)
echo ========================================================
echo.

cd /d "%~dp0\backend"

:: Set Offline Mode Environment Variables
set NODE_ENV=production
set PORT=5000
set IS_OFFLINE_NODE=true
set DATABASE_URL=file:./dev.db
set CLOUD_SERVER_URL=https://wsms-1.onrender.com/api

echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Initializing local database and services...
if not exist "prisma\dev.db" (
    echo Creating fresh local SQLite database...
    call npx prisma db push --schema=prisma/schema.sqlite.prisma --accept-data-loss
)

echo [3/3] Starting Local WSMS Server on port 5000...
start "" "http://localhost:5000"

:: Start Node.js server
node dist/index.js

pause
