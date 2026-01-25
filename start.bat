@echo off
REM Fleet Manager Startup Script
REM This script sets up the environment and runs the dev server

setlocal enabledelayedexpansion

REM Set Node PATH
set "PATH=C:\Program Files\nodejs;C:\Program Files\nodejs\node_modules\npm\bin;%PATH%"

REM Set environment variables for backend
set "NODE_ENV=development"
set "PORT=3000"
set "DATABASE_URL=postgres://postgres:raniakhedri@localhost:5432/ahmed"
set "JWT_SECRET=dev-jwt-secret-change-in-production"
set "SESSION_SECRET=dev-session-secret"
set "REPL_ID=fleet-local"

echo Starting Fleet Manager...
echo Backend: http://127.0.0.1:3000
echo Frontend: http://localhost:5173
echo.

REM Run dev server
npm.cmd run dev
