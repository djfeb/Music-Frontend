#!/bin/bash

# Music Streaming App - Status Check Script

APP_NAME="music-streaming"
IMAGE_NAME="music-streaming-app"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Music Streaming App - Status Check"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if image exists
if docker images | grep -q $IMAGE_NAME; then
    echo -e "${GREEN}✓ Docker image exists${NC}"
    IMAGE_SIZE=$(docker images $IMAGE_NAME:latest --format "{{.Size}}")
    echo "  Image size: $IMAGE_SIZE"
else
    echo -e "${RED}✗ Docker image not found${NC}"
    echo "  Run ./deploy.sh to build and deploy"
fi

# Check if container exists
if [ "$(docker ps -aq -f name=$APP_NAME)" ]; then
    # Check if container is running
    if [ "$(docker ps -q -f name=$APP_NAME)" ]; then
        echo -e "${GREEN}✓ Container is running${NC}"
        
        # Get container info
        CONTAINER_ID=$(docker ps -q -f name=$APP_NAME)
        UPTIME=$(docker ps -f name=$APP_NAME --format "{{.Status}}")
        PORT=$(docker ps -f name=$APP_NAME --format "{{.Ports}}")
        
        echo "  Container ID: $CONTAINER_ID"
        echo "  Status: $UPTIME"
        echo "  Ports: $PORT"
        
        # Get server IP
        SERVER_IP=$(hostname -I | awk '{print $1}')
        
        echo ""
        echo "Access URLs:"
        echo "  - http://localhost:3000"
        echo "  - http://$SERVER_IP:3000"
        
        # Check if app is responding
        echo ""
        echo "Testing connection..."
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 > /dev/null 2>&1; then
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
            if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
                echo -e "${GREEN}✓ Application is responding (HTTP $HTTP_CODE)${NC}"
            else
                echo -e "${YELLOW}⚠ Application returned HTTP $HTTP_CODE${NC}"
            fi
        else
            echo -e "${RED}✗ Application is not responding${NC}"
            echo "  Check logs with: ./logs.sh"
        fi
        
    else
        echo -e "${RED}✗ Container exists but is not running${NC}"
        echo "  Start with: docker start $APP_NAME"
    fi
else
    echo -e "${RED}✗ Container not found${NC}"
    echo "  Run ./deploy.sh to deploy"
fi

echo ""
echo "======================================"
echo "Useful commands:"
echo "  ./deploy.sh  - Deploy application"
echo "  ./update.sh  - Update application"
echo "  ./logs.sh    - View logs"
echo "  ./stop.sh    - Stop application"
echo "  ./status.sh  - Check status (this script)"
echo ""
