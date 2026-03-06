@echo off
echo ===================================================
echo   Public Transport Safety Intelligence (PTSI) 
echo   Production Environment Launcher
echo ===================================================
echo.
echo Please ensure MongoDB (27017) and Redis (6379) are running.
echo.

echo Starting Backend Server (Port 5000)...
start "PTSI Backend" cmd /k "cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\backend && npm run dev"

echo Starting AI Service API (Port 8000)...
start "PTSI AI API" cmd /k "cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\ai-service && (if exist venv\Scripts\activate call venv\Scripts\activate) && uvicorn main:app --host 0.0.0.0 --port 8000"

echo Starting Frontend Dashboard (Port 5173)...
start "PTSI Frontend" cmd /k "cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\frontend && npm run dev"

echo.
echo ===================================================
echo All services started successfully!
echo ===================================================
echo.
echo Services:
echo - Backend API:    http://localhost:5000
echo - AI Service:    http://localhost:8000
echo - Frontend:      http://localhost:5173
echo.
echo API Documentation: http://localhost:8000/docs
echo.
echo Note: MongoDB and Redis must be running first!
echo.
pause
