@echo off
REM PTSI Quick Start Script (Windows)

echo.
echo ===============================================================
echo PUBLIC TRANSPORT SAFETY INTELLIGENCE - Quick Start (Windows)
echo ===============================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.9+ first.
    pause
    exit /b 1
)

echo [Info] Checking prerequisites... OK
echo.

REM Backend
echo [Setup] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend installation failed
    pause
    exit /b 1
)
call npm run seed
cd ..
echo [OK] Backend configured

echo.

REM AI Service
echo [Setup] Installing AI service dependencies...
cd ai-service
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] AI service installation failed
    pause
    exit /b 1
)
cd ..
echo [OK] AI service configured

echo.

REM Frontend
echo [Setup] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend installation failed
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend configured

echo.
echo ===============================================================
echo Setup complete!
echo ===============================================================
echo.
echo Start services in separate terminal windows:
echo.
echo Terminal 1 - Backend (http://localhost:5000):
echo   cd backend && npm run dev
echo.
echo Terminal 2 - AI Service (http://localhost:8000):
echo   cd ai-service
echo   venv\Scripts\activate.bat
echo   uvicorn main:app --reload --port 8000
echo.
echo Terminal 3 - Frontend (http://localhost:5173):
echo   cd frontend && npm run dev
echo.
echo Make sure MongoDB and Redis are running:
echo   - MongoDB: mongod
echo   - Redis: redis-server
echo.
echo Dashboard: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
pause
