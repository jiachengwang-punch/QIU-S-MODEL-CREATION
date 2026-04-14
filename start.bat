@echo off
title Game Asset Studio

echo [1/2] Starting backend...
cd /d "%~dp0backend"
start "Backend" cmd /k "pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000"

echo [2/2] Starting frontend...
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npm install && npm run dev"

echo.
echo ============================================
echo  Game Asset Studio is starting up...
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:8000
echo ============================================
timeout /t 5
start http://localhost:5173
