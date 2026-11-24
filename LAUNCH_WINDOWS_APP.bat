@echo off
title WeightT360Pro Desktop Application
color 0B

echo Starting WeightT360Pro Windows App...
cd /d "%~dp0"

:: Start Electron desktop app
call npx electron .
