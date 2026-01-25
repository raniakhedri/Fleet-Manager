@echo off
REM Frontend Startup Script
echo Starting Fleet Manager Frontend...
echo Frontend will run on: http://localhost:5173
echo.

cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;C:\Program Files\nodejs\node_modules\npm\bin;%PATH%"

npm.cmd run dev
