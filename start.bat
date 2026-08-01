@echo off
title WSMS Start Script

echo ==========================================
echo Starting WSMS (Nature Green Weighment)
echo ==========================================

echo Starting Backend Server...
start "WSMS Backend" cmd /k "cd backend && npm run dev"

echo Starting Frontend Server...
start "WSMS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo The frontend will be available at http://localhost:5173
echo You can close this window now.
pause
