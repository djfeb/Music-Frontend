#!/bin/bash

# Music Streaming App - Update Script
# This script rebuilds and redeploys the application

set -e

echo "🔄 Music Streaming App - Update Script"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="music-streaming"
IMAGE_NAME="music-streaming-app"

# Check if container exists
if [ ! "$(docker ps -aq -f name=$APP_NAME)" ]; then
    echo -e "${RED}Error: Container '$APP_NAME' not found!${NC}"
    echo "Please run ./deploy.sh first to deploy the application."
    exit 1
fi

echo -e "${YELLOW}Stopping container...${NC}"
docker stop $APP_NAME

echo -e "${YELLOW}Removing old container...${NC}"
docker rm $APP_NAME

echo -e "${YELLOW}Removing old image...${NC}"
docker rmi $IMAGE_NAME:latest 2>/dev/null || true

echo -e "${YELLOW}Building new Docker image...${NC}"
docker build -t $IMAGE_NAME:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Docker image built successfully"
else
    echo -e "${RED}Error: Docker build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting new container...${NC}"
docker run -d \
    --name $APP_NAME \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file .env.local \
    $IMAGE_NAME:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Container started successfully"
else
    echo -e "${RED}Error: Failed to start container!${NC}"
    exit 1
fi

echo -e "${YELLOW}Waiting for application to start...${NC}"
sleep 5

if [ "$(docker ps -q -f name=$APP_NAME)" ]; then
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "======================================="
    echo -e "${GREEN}✅ Update successful!${NC}"
    echo "======================================="
    echo ""
    echo "Application is running at:"
    echo "  - http://localhost:3000"
    echo "  - http://$SERVER_IP:3000"
    echo ""
    echo "View logs: docker logs -f $APP_NAME"
    echo ""
else
    echo -e "${RED}Error: Container failed to start!${NC}"
    echo "Check logs with: docker logs $APP_NAME"
    exit 1
fi
