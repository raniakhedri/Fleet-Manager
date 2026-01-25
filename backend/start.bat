@echo off
REM Backend Startup Script
echo Starting Fleet Manager Backend...
echo Backend will run on: http://127.0.0.1:3000
echo.

cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;C:\Program Files\nodejs\node_modules\npm\bin;%PATH%"

REM Load .env file
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "%%a=%%b"
)



REM Start dev server
npm.cmd run dev