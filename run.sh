#!/bin/bash

echo "TypeTutor Setup and Launch Script"
echo "================================="

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status message
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

# Function to print success message
print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to print error message
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to print warning message
print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check directory permissions
check_directory_permission() {
    dir_path="$1"
    if [ -d "$dir_path" ]; then
        if [ -w "$dir_path" ]; then
            print_success "Directory '$dir_path' exists and is writable ✓"
            return 0
        else
            print_error "Directory '$dir_path' exists but is not writable! ✗"
            print_warning "Run: chmod -R 755 $dir_path"
            return 1
        fi
    else
        print_error "Directory '$dir_path' does not exist! ✗"
        print_warning "Creating directory..."
        mkdir -p "$dir_path"
        if [ $? -eq 0 ]; then
            print_success "Directory '$dir_path' created successfully ✓"
            return 0
        else
            print_error "Failed to create directory '$dir_path' ✗"
            return 1
        fi
    fi
}

print_status "Checking environment..."

# Check Python version
python_version=$(python3 --version 2>&1)
if [[ $python_version == Python\ 3* ]]; then
    print_success "Python detected: $python_version ✓"
else
    print_error "Python 3 is required but not found! ✗"
    exit 1
fi

# Check if node/npm is installed
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    print_success "npm detected: v$npm_version ✓"
else
    print_error "npm is required but not found! ✗"
    print_warning "Please install Node.js and npm first."
    exit 1
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
    if [ $? -eq 0 ]; then
        print_success "Virtual environment created ✓"
    else
        print_error "Failed to create virtual environment ✗"
        exit 1
    fi
fi

# Activate the virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    print_error "Failed to activate virtual environment ✗"
    exit 1
fi

# Install or update requirements
print_status "Installing dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    print_error "Failed to install Python dependencies ✗"
    exit 1
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install frontend dependencies ✗"
        cd ..
        exit 1
    fi
    cd ..
fi

# Check critical directories
print_status "Checking application directories..."
check_directory_permission "uploads"
check_directory_permission "data"
check_directory_permission "backend"
check_directory_permission "frontend"

# Define log file for Flask
LOG_FILE="backend_server.log"

# Start the application
print_status "Starting TypeTutor application..."

# Start backend
print_status "Starting Flask backend server..."
python backend/app.py > $LOG_FILE 2>&1 &
BACKEND_PID=$!

# Wait a moment for the backend to start
sleep 2

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    print_success "Backend server started successfully (PID: $BACKEND_PID) ✓"
else
    print_error "Backend server failed to start ✗"
    print_warning "Check $LOG_FILE for details"
    cat $LOG_FILE
    exit 1
fi

# Start frontend development server
print_status "Starting React frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 2

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null; then
    print_success "Frontend server started successfully (PID: $FRONTEND_PID) ✓"
else
    print_error "Frontend server failed to start ✗"
    # Kill backend since frontend failed
    kill $BACKEND_PID
    exit 1
fi

# Function to handle script termination
function cleanup {
    print_status "Shutting down servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    print_success "Servers shutdown complete ✓"
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

print_success "\nTypeTutor is now running!"
echo "- Backend: http://localhost:5000"
echo "- Frontend: Check the URL provided by Vite (usually http://localhost:5173)"
echo ""
echo "For troubleshooting:"
echo "- Backend logs: $LOG_FILE"
echo "- Debug API: http://localhost:5000/api/debug-info"
echo ""
print_warning "Press Ctrl+C to stop all servers."

# Wait for user to press Ctrl+C
wait