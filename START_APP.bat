@echo off
title MTN QuantRisk Portable Launcher
echo ===================================================
echo   Starting MTN QuantRisk (Portable Environment)
echo ===================================================

cd /d "%~dp0"

:: Add portable tools to temporary session PATH
set "PATH=%~dp0portable_node;%~dp0portable_python;%~dp0portable_python\Scripts;%PATH%"

:: 1. Start Main Backend API on Port 8001
echo Starting Main Backend API (Port 8001)...
start "QuantRisk Main API (8001)" /min cmd /c "cd /d "%~dp0backend" && "%~dp0portable_python\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8001"

:: 2. Start Auth Backend API on Port 8000
echo Starting Auth Backend API (Port 8000)...
start "QuantRisk Auth API (8000)" /min cmd /c "cd /d "%~dp0backend" && "%~dp0portable_python\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: 3. Start Next.js Frontend on Port 3000
echo Starting Frontend UI (Port 3000)...
start "QuantRisk Frontend (3000)" /min cmd /c "cd /d "%~dp0frontend" && npx next dev -p 3000"

:: Wait 7 seconds for servers to initialize
echo Waiting for servers to initialize...
timeout /t 7 /nobreak >nul

:: Open browser
start http://localhost:3000

echo.
echo ===================================================
echo   MTN QuantRisk is running at http://localhost:3000
echo ===================================================
pause