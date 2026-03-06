#!/bin/bash
echo "==================================================="
echo "  Public Transport Safety Intelligence (PTSI)"
echo "  Production Environment Launcher"
echo "==================================================="
echo ""
echo "Please ensure MongoDB (27017) and Redis (6379) are running."
echo ""

# Start services in background
echo "Starting AI Service API (Port 8000)..."
cd ai-service
source .venv/bin/activate 2>/dev/null || true
uvicorn main:app --host 0.0.0.0 --port 8000 &
AI_PID=$!
cd ..

echo "Starting AI Frame Worker (Redis Consumer)..."
cd ai-service
source .venv/bin/activate 2>/dev/null || true
python workers/frame_worker.py &
WORKER_PID=$!
cd ..

echo "Starting Backend Analytics Server (Port 5000)..."
cd backend
npm install
npm start &
BACKEND_PID=$!
cd ..

echo "Starting Server API / WebSocket (Port 3001)..."
cd server
npm install
npm run dev &
SERVER_PID=$!
cd ..

echo ""
echo "All background services started!"
echo "- AI Service: http://localhost:8000"
echo "- Backend Node Server: http://localhost:5000"
echo "- WebSocket Scaled Server: ws://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services."

trap "kill $AI_PID $WORKER_PID $BACKEND_PID $SERVER_PID" SIGINT
wait
