#!/bin/bash

# Music Streaming App - View Logs Script

APP_NAME="music-streaming"

echo "📋 Viewing logs for Music Streaming App..."
echo "Press Ctrl+C to exit"
echo ""

if [ "$(docker ps -q -f name=$APP_NAME)" ]; then
    docker logs -f $APP_NAME
else
    echo "⚠ Application is not running"
    echo ""
    echo "View last logs from stopped container:"
    docker logs $APP_NAME 2>/dev/null || echo "No logs available"
fi
