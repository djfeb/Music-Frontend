#!/bin/bash

# Music Streaming App - Stop Script

APP_NAME="music-streaming"

echo "🛑 Stopping Music Streaming App..."

if [ "$(docker ps -q -f name=$APP_NAME)" ]; then
    docker stop $APP_NAME
    echo "✓ Application stopped"
else
    echo "⚠ Application is not running"
fi
