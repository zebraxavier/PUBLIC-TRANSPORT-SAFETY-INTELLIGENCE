#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/runtime-logs"
mkdir -p "$LOG_DIR"

AI_LOG="$LOG_DIR/ai.log"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

ai_pid=""
backend_pid=""
frontend_pid=""

cleanup() {
  for pid in "$frontend_pid" "$backend_pid" "$ai_pid"; do
    if [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT

info() { echo "[INFO] $*"; }
ok() { echo "[OK]   $*"; }
warn() { echo "[WARN] $*"; }
err() { echo "[ERR]  $*" >&2; }

require_dir() {
  local d="$1"
  [[ -d "$d" ]] || { err "Missing directory: $d"; exit 1; }
}

wait_http() {
  local url="$1"
  local seconds="${2:-20}"
  local i
  for ((i=1; i<=seconds; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

free_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      warn "Killing process(es) on port $port: $pids"
      kill -9 $pids 2>/dev/null || true
    fi
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    local pids
    pids="$(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $NF}' | sed -E 's/.*pid=([0-9]+).*/\1/' | tr '\n' ' ')"
    if [[ -n "${pids// }" ]]; then
      warn "Killing process(es) on port $port: $pids"
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

require_dir "$ROOT_DIR/backend"
require_dir "$ROOT_DIR/frontend"
require_dir "$ROOT_DIR/ai-service"

if ! command -v node >/dev/null 2>&1; then
  err "Node.js not found in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  err "npm not found in PATH."
  exit 1
fi

if [[ -x "$ROOT_DIR/ai-service/venv/Scripts/python.exe" ]]; then
  PYTHON_BIN="$ROOT_DIR/ai-service/venv/Scripts/python.exe"
elif [[ -x "$ROOT_DIR/ai-service/.venv/Scripts/python.exe" ]]; then
  PYTHON_BIN="$ROOT_DIR/ai-service/.venv/Scripts/python.exe"
elif [[ -x "$ROOT_DIR/ai-service/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT_DIR/ai-service/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  err "Python not found. Create ai-service/.venv and install requirements."
  exit 1
fi

info "Starting AI service on 8000..."
free_port 8000
(
  cd "$ROOT_DIR/ai-service"
  "$PYTHON_BIN" -m uvicorn main:app --host 0.0.0.0 --port 8000
) >"$AI_LOG" 2>&1 &
ai_pid=$!
sleep 3

if ! kill -0 "$ai_pid" 2>/dev/null; then
  err "AI failed to start. Check $AI_LOG"
  exit 1
fi

if wait_http "http://localhost:8000/health" 20 || wait_http "http://localhost:8000/docs" 20; then
  ok "AI service running: http://localhost:8000/docs"
else
  warn "AI health/docs endpoint not reachable yet. Check $AI_LOG"
fi

info "Starting backend on 5000..."
free_port 5000
(
  cd "$ROOT_DIR/backend"
  npm run dev
) >"$BACKEND_LOG" 2>&1 &
backend_pid=$!
sleep 3

if ! kill -0 "$backend_pid" 2>/dev/null; then
  err "Backend failed to start. Check $BACKEND_LOG"
  exit 1
fi

if wait_http "http://localhost:5000/health" 20; then
  ok "Backend running: http://localhost:5000/health"
else
  warn "Backend health endpoint not reachable yet. Check $BACKEND_LOG"
fi

info "Starting frontend on 5173..."
free_port 5173
(
  cd "$ROOT_DIR/frontend"
  npm run dev -- --host --port 5173
) >"$FRONTEND_LOG" 2>&1 &
frontend_pid=$!
sleep 3

if ! kill -0 "$frontend_pid" 2>/dev/null; then
  err "Frontend failed to start. Check $FRONTEND_LOG"
  exit 1
fi

if wait_http "http://localhost:5173" 20; then
  ok "Frontend running: http://localhost:5173"
else
  warn "Frontend URL not reachable yet. Check $FRONTEND_LOG"
fi

info "WebSocket endpoint: ws://localhost:5000/ws"
echo
echo "Logs:"
echo "  AI:       $AI_LOG"
echo "  Backend:  $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
echo
echo "Press Ctrl+C to stop all services."
wait
