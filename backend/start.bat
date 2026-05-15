@echo off
setlocal
if exist python_portable (
    echo Starting Backend from portable directory...
    set PYTHON_EXE=.\python_portable\python.exe
) else if exist .venv (
    echo Starting Backend from local virtual environment...
    set PYTHON_EXE=.\.venv\Scripts\python.exe
) else if exist backend\python_portable (
    cd /d backend
    set PYTHON_EXE=.\python_portable\python.exe
)

if not exist "%PYTHON_EXE%" (
    echo Error: Python interpreter not found. Please ensure python_portable or .venv exists.
    pause
    exit /b 1
)

echo Starting Backend...
"%PYTHON_EXE%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
pause
