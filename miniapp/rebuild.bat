@echo off
setlocal
echo ==========================================
echo   FitCalorie Mini Program CLEAN REBUILD
echo ==========================================

cd /d "%~dp0"

echo [1/3] Cleaning dist and cache folders...
if exist dist (
    echo Deleting dist...
    rd /s /q dist
)
if exist .taro (
    echo Deleting .taro cache...
    rd /s /q .taro
)
if exist node_modules\.cache (
    echo Deleting webpack cache...
    rd /s /q node_modules\.cache
)

echo [2/3] Checking dependencies...
if not exist node_modules (
    echo [INFO] node_modules not found, installing...
    call npm install
)

echo [3/3] Starting a fresh full compilation...
echo [INFO] This might take a bit longer than a normal start.
npm run dev:weapp

pause
