$ErrorActionPreference = "Stop"

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "[OK]   $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Err($m) { Write-Host "[ERR]  $m" -ForegroundColor Red }

function Wait-Url($url, $timeoutSec = 20) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
        } catch {
            Start-Sleep -Milliseconds 700
        }
    }
    return $false
}

function Stop-Port([int]$port) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $listeners) { return }
    $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Warn "Stopped process $pid on port $port"
        } catch {
            Warn "Failed to stop process $pid on port ${port}: $($_.Exception.Message)"
        }
    }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root) { $Root = (Get-Location).Path }

$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$AiDir = Join-Path $Root "ai-service"
$Logs = Join-Path $Root "runtime-logs"
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

$BackendOut = Join-Path $Logs "backend.out.log"
$BackendErr = Join-Path $Logs "backend.err.log"
$FrontendOut = Join-Path $Logs "frontend.out.log"
$FrontendErr = Join-Path $Logs "frontend.err.log"
$AiOut = Join-Path $Logs "ai.out.log"
$AiErr = Join-Path $Logs "ai.err.log"

if (-not (Test-Path (Join-Path $BackendDir "server.js"))) { Err "backend/server.js missing"; exit 1 }
if (-not (Test-Path (Join-Path $FrontendDir "node_modules\\vite\\bin\\vite.js"))) { Err "frontend dependencies missing"; exit 1 }

$NodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodeExe) { Err "Node.js not found in PATH"; exit 1 }
$CmdExe = "C:\Windows\System32\cmd.exe"
if (-not (Test-Path $CmdExe)) {
    Warn "cmd.exe is not accessible at $CmdExe. npm scripts may fail in this shell."
}

$AiPython = $null
if (Test-Path (Join-Path $AiDir "venv\\Scripts\\python.exe")) {
    $AiPython = Join-Path $AiDir "venv\\Scripts\\python.exe"
} elseif (Test-Path (Join-Path $AiDir ".venv\\Scripts\\python.exe")) {
    $AiPython = Join-Path $AiDir ".venv\\Scripts\\python.exe"
}

if (-not $AiPython) {
    Err "AI Python not found in ai-service\\venv or ai-service\\.venv"
    exit 1
}

Info "Clearing ports 8000/5000/5173..."
Stop-Port 8000
Stop-Port 5000
Stop-Port 5173

Info "Starting AI service on 8000..."
Start-Process -FilePath $AiPython `
    -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000" `
    -WorkingDirectory $AiDir `
    -RedirectStandardOutput $AiOut `
    -RedirectStandardError $AiErr `
    -WindowStyle Hidden | Out-Null

Info "Starting backend on 5000..."
Start-Process -FilePath $NodeExe `
    -ArgumentList "server.js" `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $BackendOut `
    -RedirectStandardError $BackendErr `
    -WindowStyle Hidden | Out-Null

Info "Starting frontend on 5173..."
Start-Process -FilePath $NodeExe `
    -ArgumentList "node_modules/vite/bin/vite.js --host localhost --port 5173" `
    -WorkingDirectory $FrontendDir `
    -RedirectStandardOutput $FrontendOut `
    -RedirectStandardError $FrontendErr `
    -WindowStyle Hidden | Out-Null

Info "Checking endpoints..."
$aiUp = Wait-Url "http://localhost:8000/docs" 60
$beUp = Wait-Url "http://localhost:5000/health" 30
$feUp = Wait-Url "http://localhost:5173" 30

if ($aiUp) { Ok "AI:       http://localhost:8000/docs" } else { Warn "AI failed. Check $AiErr" }
if ($beUp) { Ok "Backend:  http://localhost:5000/health" } else { Warn "Backend failed. Check $BackendErr" }
if ($feUp) { Ok "Frontend: http://localhost:5173" } else { Warn "Frontend failed. Check $FrontendErr" }

Write-Host ""
Write-Host "WebSocket: ws://localhost:5000/ws" -ForegroundColor White
Write-Host "Logs: $Logs" -ForegroundColor White
