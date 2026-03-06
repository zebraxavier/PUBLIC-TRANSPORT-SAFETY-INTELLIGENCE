$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR]  $msg" -ForegroundColor Red }

function Test-Cmd($name) {
    try {
        Get-Command $name -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Wait-Url($url, $timeoutSec) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 700
        }
    }
    return $false
}

function Stop-PortListeners([int[]]$Ports) {
    foreach ($Port in $Ports) {
        try {
            $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
            if ($listeners) {
                $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
                foreach ($pid in $pids) {
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction Stop
                        Write-Warn "Stopped process $pid on port $Port"
                    } catch {
                        Write-Warn "Could not stop process $pid on port ${Port}: $($_.Exception.Message)"
                    }
                }
            }
        } catch {
            Write-Warn "Port check failed for ${Port}: $($_.Exception.Message)"
        }
    }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root) { $Root = (Get-Location).Path }

$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$AiDir = Join-Path $Root "ai-service"
$LogDir = Join-Path $Root "runtime-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$BackendOut = Join-Path $LogDir "backend.out.log"
$BackendErr = Join-Path $LogDir "backend.err.log"
$FrontendOut = Join-Path $LogDir "frontend.out.log"
$FrontendErr = Join-Path $LogDir "frontend.err.log"
$AiOut = Join-Path $LogDir "ai.out.log"
$AiErr = Join-Path $LogDir "ai.err.log"

Write-Info "Root: $Root"

if (-not (Test-Cmd "node")) {
    Write-Err "Node.js not found in PATH."
    exit 1
}

$NodeExe = (Get-Command node).Source
Write-Ok "Node.js found at: $NodeExe"

if (-not (Test-Path (Join-Path $BackendDir "server.js"))) {
    Write-Err "Missing backend entry file: $BackendDir\server.js"
    exit 1
}

if (-not (Test-Path (Join-Path $FrontendDir "node_modules\vite\bin\vite.js"))) {
    Write-Err "Frontend dependencies missing. Run: cd frontend; npm install"
    exit 1
}

Write-Info "Clearing conflicting listeners on ports 8000/5000/5173..."
Stop-PortListeners -Ports @(8000, 5000, 5173)

Write-Info "Starting backend (5000)..."
Start-Process -FilePath $NodeExe `
    -ArgumentList "server.js" `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $BackendOut `
    -RedirectStandardError $BackendErr `
    -WindowStyle Hidden | Out-Null

Write-Info "Starting frontend (5173)..."
Start-Process -FilePath $NodeExe `
    -ArgumentList "node_modules/vite/bin/vite.js" `
    -WorkingDirectory $FrontendDir `
    -RedirectStandardOutput $FrontendOut `
    -RedirectStandardError $FrontendErr `
    -WindowStyle Hidden | Out-Null

$AiPythonVenv = Join-Path $AiDir "venv\Scripts\python.exe"
$AiPythonDotVenv = Join-Path $AiDir ".venv\Scripts\python.exe"
$AiPython = $null
if (Test-Path $AiPythonVenv) {
    $AiPython = $AiPythonVenv
} elseif (Test-Path $AiPythonDotVenv) {
    $AiPython = $AiPythonDotVenv
}

if ($AiPython) {
    Write-Info "Starting AI service (8000)..."
    Start-Process -FilePath $AiPython `
        -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000" `
        -WorkingDirectory $AiDir `
        -RedirectStandardOutput $AiOut `
        -RedirectStandardError $AiErr `
        -WindowStyle Hidden | Out-Null
} else {
    Write-Warn "AI service not started (missing ai-service\\venv or ai-service\\.venv Python executable)."
}

Write-Info "Checking service health..."
$BackendUp = Wait-Url "http://localhost:5000/health" 20
$FrontendUp = Wait-Url "http://localhost:5173" 20
$AiUp = Wait-Url "http://localhost:8000/health" 20

if ($BackendUp) { Write-Ok "Backend:  http://localhost:5000/health" } else { Write-Warn "Backend health check failed. See $BackendErr" }
if ($FrontendUp) { Write-Ok "Frontend: http://localhost:5173" } else { Write-Warn "Frontend health check failed. See $FrontendErr" }
if ($AiUp) { Write-Ok "AI:       http://localhost:8000/health" } else { Write-Warn "AI health check failed or AI not started. See $AiErr" }

Write-Host ""
Write-Host "Logs folder: $LogDir" -ForegroundColor White
