@echo off
setlocal

cd /d "%~dp0"

if not defined GOOGLE_APPLICATION_CREDENTIALS (
  if exist "%APPDATA%\gcloud\application_default_credentials.json" (
    set "GOOGLE_APPLICATION_CREDENTIALS=%APPDATA%\gcloud\application_default_credentials.json"
  )
)

set "PYTHONUTF8=1"

set HTTP_PROXY=
set HTTPS_PROXY=
set ALL_PROXY=
set http_proxy=
set https_proxy=
set all_proxy=
set GIT_HTTP_PROXY=
set GIT_HTTPS_PROXY=

echo Running test.py...
".venv\Scripts\python.exe" test.py

echo.
pause
