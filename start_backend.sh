#!/bin/bash
echo "🚀 Starting TypeTutor Backend..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
    echo "✅ Virtual environment activated"
fi

# Create necessary directories
mkdir -p data logs uploads cache

# Set Python path to include backend directory
export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend"

# Start backend
echo "Starting backend server on port 5001..."
python backend/app.py
