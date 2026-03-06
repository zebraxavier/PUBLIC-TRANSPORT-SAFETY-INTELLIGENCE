@echo off
echo ===================================================
echo   Public Transport Safety Intelligence (PTSI)
echo   Starting All Services
echo ===================================================
echo.

cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\backend
echo Starting Backend on port 5000...
start "PTSI Backend" cmd /k "cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\backend && node server.js"

timeout /t 3 /nobreak >nul

cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\ai-service
echo Starting AI Service on port 8000...
start "PTSI AI Service" cmd /k "cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\ai-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\frontend
echo Starting Frontend on port 5173...
start "PTSI Frontend" cmd /k "cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\frontend && npm install && npm run dev"

echo.
echo ===================================================
echo All services are starting in new windows!
echo.
echo Backend:    http://localhost:5000
echo AI Service: http://localhost:8000
echo Frontend:  http://localhost:5173
echo ===================================================
pause

