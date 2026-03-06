# =============================================================================
# Transport Safety Intelligence - Reliable System Startup Script
# =============================================================================
# This script starts all services for the PTSI application
# Run as: .\start_system.ps1
# =============================================================================

param(
    [switch]$SkipChecks,
    [switch]$CleanLogs
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "E:\PUBLIC TRANSPORT SAFETY INTELLIGENCE"
$LogDir = "$ProjectRoot\runtime-logs"

# Create logs directory
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Clean logs if requested
if ($CleanLogs) {
    Get-ChildItem $LogDir -Filter "*.log" | Remove-Item -Force
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "$LogDir\system_start_$timestamp.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Write-Host $entry
    Add-Content -Path $logFile -Value $entry
}

function Test-Port {
    param([int]$Port)
    $connection = New-Object System.Net.Sockets.TcpClient
    try {
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

function Clear-Port {
    param([int]$Port)
    Write-Log "Checking port $Port..."
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        Write-Log "Port $Port in use, terminating processes..." -Level "WARN"
        $connections | ForEach-Object { 
            try { 
                Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue 
            } catch {} 
        }
        Start-Sleep -Seconds 2
    }
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

Write-Log "=========================================="
Write-Log "Transport Safety Intelligence - Startup"
Write-Log "=========================================="

# Phase 1: Verify PATH and ComSpec
if (-not $SkipChecks) {
    Write-Log "Phase 1: Verifying system environment..."
    
    if (-not $env:ComSpec) {
        Write-Log "ComSpec not set!" -Level "ERROR"
        exit 1
    }
    Write-Log "ComSpec: $env:ComSpec"
    
    if (-not (Test-Path $env:ComSpec)) {
        Write-Log "ComSpec path invalid: $env:ComSpec" -Level "ERROR"
        exit 1
    }
    Write-Log "System environment OK"
}

# Phase 2: Clear required ports
Write-Log "Phase 2: Clearing ports..."
Clear-Port -Port 8000  # AI Service
Clear-Port -Port 5000  # Backend
Clear-Port -Port 5173  # Frontend

# Phase 3: Start AI Service
Write-Log "Phase 3: Starting AI Service..."
$aiServiceScript = @"
Set-Location '$ProjectRoot\ai-service'
python -m uvicorn main:app --host 0.0.0.0 --port 8000
"@

$aiJob = Start-Job -ScriptBlock {
    param($script, $logFile)
    $env:PYTHONIOENCODING = "utf-8"
    Invoke-Expression $script 2>&1 | ForEach-Object { 
        $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [AI] $_"
        Add-Content -Path $logFile -Value $entry
    }
} -ArgumentList $aiServiceScript, $logFile

Write-Log "AI Service starting (PID: $($aiJob.Id))"

# Wait for AI service
Start-Sleep -Seconds 5
$aiReady = $false
for ($i = 0; $i -lt 30; $i++) {
    if (Test-Port -Port 8000) {
        $aiReady = $true
        break
    }
    Start-Sleep -Seconds 1
}

if ($aiReady) {
    Write-Log "AI Service ready on port 8000"
} else {
    Write-Log "AI Service failed to start" -Level "WARN"
}

# Phase 4: Start Backend
Write-Log "Phase 4: Starting Backend..."
$backendScript = @"
Set-Location '$ProjectRoot\backend'
& 'C:\Program Files\nodejs\node.exe' server.js
"@

$backendJob = Start-Job -ScriptBlock {
    param($script, $logFile)
    Invoke-Expression $script 2>&1 | ForEach-Object { 
        $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [BACKEND] $_"
        Add-Content -Path $logFile -Value $entry
    }
} -ArgumentList $backendScript, $logFile

Write-Log "Backend starting (PID: $($backendJob.Id))"

# Wait for backend
Start-Sleep -Seconds 5
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    if (Test-Port -Port 5000) {
        $backendReady = $true
        break
    }
    Start-Sleep -Seconds 1
}

if ($backendReady) {
    Write-Log "Backend ready on port 5000"
} else {
    Write-Log "Backend failed to start" -Level "WARN"
}

# Phase 5: Start Frontend
Write-Log "Phase 5: Starting Frontend..."
$frontendScript = @"
Set-Location '$ProjectRoot\frontend'
& 'C:\Program Files\nodejs\node.exe' node_modules\vite\bin\vite.js
"@

$frontendJob = Start-Job -ScriptBlock {
    param($script, $logFile)
    Invoke-Expression $script 2>&1 | ForEach-Object { 
        $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [FRONTEND] $_"
        Add-Content -Path $logFile -Value $entry
    }
} -ArgumentList $frontendScript, $logFile

Write-Log "Frontend starting (PID: $($frontendJob.Id))"

# Wait for frontend
Start-Sleep -Seconds 5
$frontendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    if (Test-Port -Port 5173) {
        $frontendReady = $true
        break
    }
    Start-Sleep -Seconds 1
}

if ($frontendReady) {
    Write-Log "Frontend ready on port 5173"
} else {
    Write-Log "Frontend failed to start" -Level "WARN"
}

# Phase 6: Health Checks
Write-Log "=========================================="
Write-Log "Phase 6: Health Checks"
Write-Log "=========================================="

$healthResults = @()

# Check Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Log "Frontend: HEALTHY" -Level "OK"
        $healthResults += "Frontend: OK"
    }
} catch {
    Write-Log "Frontend: UNHEALTHY" -Level "ERROR"
    $healthResults += "Frontend: ERROR"
}

# Check Backend
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.status -eq "ok") {
        Write-Log "Backend: HEALTHY (Status: $($response.status))" -Level "OK"
        $healthResults += "Backend: OK"
    }
} catch {
    Write-Log "Backend: UNHEALTHY" -Level "ERROR"
    $healthResults += "Backend: ERROR"
}

# Check AI Service
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.status -eq "ok") {
        Write-Log "AI Service: HEALTHY (Status: $($response.status))" -Level "OK"
        $healthResults += "AI Service: OK"
    }
} catch {
    Write-Log "AI Service: UNHEALTHY" -Level "ERROR"
    $healthResults += "AI Service: ERROR"
}

# Summary
Write-Log "=========================================="
Write-Log "STARTUP COMPLETE"
Write-Log "=========================================="
Write-Log "Services:"
Write-Log "  Frontend:   http://localhost:5173"
Write-Log "  Backend:    http://localhost:5000"
Write-Log "  AI Service: http://localhost:8000"
Write-Log "  WebSocket:  ws://localhost:5000/ws"
Write-Log ""
Write-Log "Logs written to: $logFile"

# Keep script running to maintain jobs
Write-Log "Press Ctrl+C to stop all services..."

# Wait for jobs
try {
    while ($true) {
        Start-Sleep -Seconds 10
    }
} finally {
    # Cleanup on exit
    Write-Log "Stopping all services..."
    Stop-Job -Job $aiJob, $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $aiJob, $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
    Write-Log "All services stopped"
}

