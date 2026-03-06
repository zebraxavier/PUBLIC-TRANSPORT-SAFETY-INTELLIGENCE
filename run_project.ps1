# PTSI Project Startup Script
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Public Transport Safety Intelligence (PTSI)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if Python is available
try {
    $pythonVersion = python --version
    Write-Host "Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Python is not installed or not in PATH" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\backend'; npm install; npm run dev" -WindowStyle Normal

# Wait a bit
Start-Sleep -Seconds 3

# Start AI Service
Write-Host "Starting AI Service (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\ai-service'; pip install -r requirements.txt; uvicorn main:app --reload --port 8000" -WindowStyle Normal

# Wait a bit
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'e:\PUBLIC TRANSPORT SAFETY INTELLIGENCE\frontend'; npm install; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Services started! Please check the opened windows." -ForegroundColor Green
Write-Host "- Backend: http://localhost:5000" -ForegroundColor White
Write-Host "- AI Service: http://localhost:8000" -ForegroundColor White
Write-Host "- Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan

