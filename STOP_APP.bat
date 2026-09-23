@echo off
title Stop MTN QuantRisk
echo Stopping all QuantRisk servers...

taskkill /FI "WINDOWTITLE eq QuantRisk*" /F >nul 2>&1
taskkill /IM uvicorn.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1

echo All servers stopped successfully.
timeout /t 2 >nul