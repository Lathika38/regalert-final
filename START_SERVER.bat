@echo off
title RegAlert Backend Startup
color 0A
echo.
echo  ====================================================
echo   RegAlert — Starting Backend Server
echo  ====================================================
echo.
echo  [1/2] Checking MongoDB...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: MongoDB not found!
  echo  Install from: https://www.mongodb.com/try/download/community
  pause
  exit /b
)

echo  [2/2] Starting Node.js server...
echo.
cd /d "%~dp0server"
node server.js
pause
