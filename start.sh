#!/bin/bash

echo "🚀 Starting ImgBad Image Hosting System..."
echo ""

if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null
then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if [ -f "docker-compose.yml" ]; then
    echo "📦 Building and starting containers..."
    docker-compose up -d --build
    
    echo ""
    echo "✅ ImgBad is now running!"
    echo "🌐 Access the application at: http://localhost:3000"
    echo ""
    echo "📝 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
else
    echo "❌ docker-compose.yml not found"
    exit 1
fi
