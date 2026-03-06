@echo off
setlocal

set "ROOT=e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE"

echo Starting PTSI services in separate terminals...
echo.

if not exist "%ROOT%\backend\server.js" (
  echo [ERROR] Backend entry file not found: %ROOT%\backend\server.js
  exit /b 1
)

if not exist "%ROOT%\frontend\node_modules\vite\bin\vite.js" (
  echo [ERROR] Frontend dependencies missing. Run:
  echo   cd "%ROOT%\frontend" ^&^& npm install
  exit /b 1
)

if not exist "%ROOT%\ai-service\.venv\Scripts\python.exe" (
  echo [ERROR] AI virtual environment missing: %ROOT%\ai-service\.venv\Scripts\python.exe
  echo Create it with:
  echo   cd "%ROOT%\ai-service"
  echo   py -3 -m venv .venv
  echo   .venv\Scripts\python.exe -m pip install -r requirements.txt
  exit /b 1
)

start "PTSI Backend (5000)" cmd /k "cd /d ""%ROOT%\backend"" && ""C:\Program Files\nodejs\node.exe"" server.js"
start "PTSI Frontend (5173)" cmd /k "cd /d ""%ROOT%\frontend"" && ""C:\Program Files\nodejs\node.exe"" ""node_modules\vite\bin\vite.js"" --port 5173 --host"
start "PTSI AI Service (8000)" cmd /k "cd /d ""%ROOT%\ai-service"" && "".venv\Scripts\python.exe"" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo Launched:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000/health
echo   AI:        http://localhost:8000/health
echo.
echo If a terminal closes immediately, read the error in that terminal and share it.

endlocal
