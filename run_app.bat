@echo off
setlocal enabledelayedexpansion
title Karmayogi Pragya Platform Launch

echo ===================================================
echo Starting Karmayogi Pragya Enterprise Platform...
echo ===================================================

cd /d "%~dp0"

:: 1. Detect Python or Virtual Environment
set "PY_BIN="
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_BIN=%~dp0.venv\Scripts\python.exe"
    echo [OK] Using virtual environment: .venv
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PY_BIN=%~dp0venv\Scripts\python.exe"
    echo [OK] Using virtual environment: venv
) else (
    py -3 --version >nul 2>&1
    if !errorlevel! equ 0 (
        set "PY_BIN=py -3"
        echo [OK] Using Windows py launcher
    ) else (
        set "PY_BIN=python"
        echo [OK] Using system PATH Python
    )
)

:: 2. Launch Backend
echo [1/2] Starting FastAPI Backend on port 8000...
cd /d "%~dp0backend"
start "Karmayogi Pragya Backend Service" cmd /k ""%PY_BIN%" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

:: 3. Await backend boot and open authentication portal
timeout /t 3 /nobreak >nul
echo [2/2] Launching Authentication Portal in default browser...
start http://127.0.0.1:8000/

echo ===================================================
echo Karmayogi Pragya is now running!
echo URL: http://127.0.0.1:8000/
echo ===================================================