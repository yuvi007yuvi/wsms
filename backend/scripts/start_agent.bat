@echo off
title WSMS Weighbridge Machine Direct Agent
color 0A
echo ========================================================
echo        STARTING WSMS LOCAL WEIGHBRIDGE AGENT
echo ========================================================
echo.
echo Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/ to run this agent.
    pause
    exit /b
)

echo Starting agent...
node "%~dp0weighbridge_agent.js"
pause
