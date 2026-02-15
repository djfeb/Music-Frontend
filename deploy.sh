#!/bin/bash

# Music Streaming App - Deployment Script
# This script builds and deploys the application using Docker

set -e

echo "🎵 Music Streaming App - Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="music-streaming"
IMAGE_NAME="music-streaming-app"
PORT=3000

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found!${NC}"
    echo "Please create .env.local from .env.example and add your configuration."
    exit 1
fi

echo -e "${GREEN}✓${NC} Found .env.local file"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed!${NC}"
    echo "Please install Docker first: https://docs.docker.com/engine/install/ubuntu/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is installed"

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=$APP_NAME)" ]; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop $APP_NAME 2>/dev/null || true
    docker rm $APP_NAME 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Removed existing container"
fi

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t $IMAGE_NAME:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Docker image built successfully"
else
    echo -e "${RED}Error: Docker build failed!${NC}"
    exit 1
fi

# Run the container
echo -e "${YELLOW}Starting container...${NC}"
docker run -d \
    --name $APP_NAME \
    --restart unless-stopped \
    -p $PORT:3000 \
    --env-file .env.local \
    $IMAGE_NAME:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Container started successfully"
else
    echo -e "${RED}Error: Failed to start container!${NC}"
    exit 1
fi

# Wait a few seconds for the container to start
echo -e "${YELLOW}Waiting for application to start...${NC}"
sleep 5

# Check if container is running
if [ "$(docker ps -q -f name=$APP_NAME)" ]; then
    echo -e "${GREEN}✓${NC} Container is running"
    
    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo "=========================================="
    echo ""
    echo "Application is running at:"
    echo "  - http://localhost:$PORT"
    echo "  - http://$SERVER_IP:$PORT"
    echo ""
    echo "Useful commands:"
    echo "  View logs:    docker logs -f $APP_NAME"
    echo "  Stop app:     docker stop $APP_NAME"
    echo "  Start app:    docker start $APP_NAME"
    echo "  Restart app:  docker restart $APP_NAME"
    echo "  Remove app:   docker rm -f $APP_NAME"
    echo ""
else
    echo -e "${RED}Error: Container failed to start!${NC}"
    echo "Check logs with: docker logs $APP_NAME"
    exit 1
fi
