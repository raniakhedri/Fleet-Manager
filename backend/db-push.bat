@echo off
set PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files\nodejs\node_modules\npm\bin
cd /d "%~dp0"
call npm.cmd run db:push
pause
