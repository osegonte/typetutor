#!/bin/bash

echo "TypeTutor Improved Backend Setup Script"
echo "======================================="

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_header() { echo -e "${PURPLE}[HEADER]${NC} $1"; }

# Check if improvements have been applied
if [ ! -d "backend/config" ]; then
    print_error "Backend improvements not found. Please run ./improve_backend.sh first."
    exit 1
fi

print_status "Setting up improved TypeTutor backend..."

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    print_success "Virtual environment activated"
else
    print_error "Virtual environment not found. Please run: python3 -m venv venv"
    exit 1
fi

# Install/update dependencies
print_status "Installing dependencies..."
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Create directories
print_status "Creating necessary directories..."
mkdir -p uploads data logs cache
mkdir -p frontend/dist  # Ensure frontend dist exists

# Set permissions
chmod 755 uploads data logs cache

# Run tests to verify everything works
print_status "Running tests to verify setup..."
if command -v pytest &> /dev/null; then
    pytest tests/ -v --tb=short
    if [ $? -eq 0 ]; then
        print_success "All tests passed!"
    else
        print_warning "Some tests failed, but continuing..."
    fi
else
    print_warning "pytest not available, skipping tests"
fi

# Start the improved backend
print_status "Starting improved TypeTutor backend..."

# Set environment
export FLASK_ENV=development
export FLASK_DEBUG=1

# Start backend
python backend/app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    print_success "Improved backend started successfully (PID: $BACKEND_PID)"
    print_success "Backend running at: http://localhost:5000"
    print_success "Health check: http://localhost:5000/api/health"
    print_success "Debug info: http://localhost:5000/api/debug-info"
else
    print_error "Backend failed to start"
    exit 1
fi

# Function to handle script termination
function cleanup {
    print_status "Shutting down backend..."
    kill $BACKEND_PID 2>/dev/null
    print_success "Backend shutdown complete"
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

print_header "TypeTutor Improved Backend is running!"
echo ""
echo "New Features:"
echo "- ✅ Modular architecture with separated concerns"
echo "- ✅ Enhanced error handling and logging"
echo "- ✅ Input validation and security improvements"
echo "- ✅ Caching system for better performance"
echo "- ✅ Rate limiting protection"
echo "- ✅ Comprehensive health monitoring"
echo "- ✅ Test framework with unit and integration tests"
echo "- ✅ Docker support for deployment"
echo ""
echo "Available endpoints:"
echo "- GET  /api/health        - Health check"
echo "- GET  /api/debug-info    - Debug information"
echo "- GET  /api/pdf-support   - PDF support status"
echo "- POST /api/upload-pdf    - Upload PDF file"
echo "- POST /api/process-text  - Process custom text"
echo "- GET  /api/stats         - Get statistics"
echo "- POST /api/save-stats    - Save session stats"
echo "- POST /api/reset-stats   - Reset statistics"
echo ""
print_warning "Press Ctrl+C to stop the server"

# Wait for user to press Ctrl+C
wait
