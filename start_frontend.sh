#!/bin/bash
echo "🚀 Starting TypeTutor Frontend..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install it from https://nodejs.org"
    exit 1
fi

# Go to frontend directory
cd frontend

# Install dependencies if not present
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "Starting frontend development server on port 5173..."
npm run dev
