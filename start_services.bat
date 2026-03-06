@echo off
echo Starting PTSI Services...
echo.
echo Starting Backend on port 5000...
start "PTSI Backend" cmd /k "cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\backend && node server.js"

timeout /t 2 /nobreak >nul

echo Starting Frontend on port 5173...
start "PTSI Frontend" cmd /k "cd /d e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\frontend && npm run dev"

echo.
echo Services should be starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause

