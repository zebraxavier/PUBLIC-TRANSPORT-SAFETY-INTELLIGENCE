@echo off
setlocal

set "ROOT=%~dp0"
echo ===================================================
echo   Public Transport Safety Intelligence (PTSI)
echo   Starting All Services
echo ===================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%start_project_reliable.ps1"
if errorlevel 1 (
  echo [ERROR] Startup failed. Check runtime-logs for details.
  exit /b 1
)

echo.
echo Startup command completed.
echo Backend:  http://localhost:5000/health
echo AI:       http://localhost:8000/docs
echo Frontend: http://localhost:5173

endlocal

