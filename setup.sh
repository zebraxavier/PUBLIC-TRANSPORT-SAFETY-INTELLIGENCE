#!/bin/bash
# PTSI Quick Start Script (Linux/macOS)

set -e

echo "🚀 PUBLIC TRANSPORT SAFETY INTELLIGENCE - Quick Start"
echo "======================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}Checking prerequisites...${NC}"
check_command node
check_command npm
check_command python3
check_command mongodb

# Start MongoDB
echo -e "${YELLOW}Starting MongoDB...${NC}"
mongod --dbpath ./data/db &
MONGO_PID=$!
sleep 2

# Start Redis
echo -e "${YELLOW}Starting Redis...${NC}"
redis-server &
REDIS_PID=$!
sleep 1

# Backend
echo -e "${YELLOW}Setting up backend...${NC}"
cd backend
npm install > /dev/null 2>&1
npm run seed > /dev/null 2>&1
echo -e "${GREEN}✅ Backend configured${NC}"

# AI Service
echo -e "${YELLOW}Setting up AI service...${NC}"
cd ../ai-service
python3 -m venv venv > /dev/null 2>&1
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
echo -e "${GREEN}✅ AI service configured${NC}"

# Frontend
echo -e "${YELLOW}Setting up frontend...${NC}"
cd ../frontend
npm install > /dev/null 2>&1
echo -e "${GREEN}✅ Frontend configured${NC}"

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Start services in separate terminals:"
echo ""
echo -e "Terminal 1 (Backend):"
echo "  cd backend && npm run dev"
echo ""
echo -e "Terminal 2 (AI Service):"
echo "  cd ai-service && source venv/bin/activate && uvicorn main:app --reload"
echo ""
echo -e "Terminal 3 (Frontend):"
echo "  cd frontend && npm run dev"
echo ""
echo "Dashboard will be available at: http://localhost:5173"
echo ""
echo "Cleanup: kill $MONGO_PID && kill $REDIS_PID"
