@echo off
setlocal
echo ==========================================
echo   FitCalorie Mini Program Starter
echo ==========================================

cd /d "%~dp0"

if not exist node_modules (
    echo [INFO] node_modules not found, installing dependencies...
    call npm install
)

echo [INFO] Starting Taro development server (WeApp)...
echo [INFO] Please keep this window open while developing.
echo.

npm run dev:weapp

pause
