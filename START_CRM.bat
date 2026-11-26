@echo off
title Taranganjali Realtech - Banking & Wealth CRM
cd /d "%~dp0"
echo =======================================================
echo   TARANGANJALI REALTECH - CORE BANKING & WEALTH CRM
echo =======================================================
echo.
echo Server starting at http://localhost:5000 ...
echo Browser automatically opening in 3 seconds...
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5000
node server/server.js
pause
