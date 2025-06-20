#!/bin/bash
# TypeTutor Complete Application Launcher
# Starts both backend and frontend with connection testing

echo "🚀 TypeTutor Complete Application Launcher"
echo "==========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_header() { echo -e "${PURPLE}[TYPETUTOR]${NC} $1"; }

# Global variables
BACKEND_PID=""
FRONTEND_PID=""
BACKEND_PORT=5001
FRONTEND_PORT=5173

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down TypeTutor..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        print_success "Backend stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        print_success "Frontend stopped"
    fi
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not found"
        exit 1
    fi
    print_success "Python 3 found: $(python3 --version)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not found"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not found"
        exit 1
    fi
    print_success "npm found: $(npm --version)"
    
    # Check project structure
    if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this from the TypeTutor project root directory"
        exit 1
    fi
    print_success "Project structure verified"
}

# Setup virtual environment
setup_python_env() {
    print_status "Setting up Python environment..."
    
    if [ ! -d "venv" ]; then
        print_status "Creating virtual environment..."
        python3 -m venv venv
        if [ $? -ne 0 ]; then
            print_error "Failed to create virtual environment"
            exit 1
        fi
    fi
    
    source venv/bin/activate
    if [ $? -ne 0 ]; then
        print_error "Failed to activate virtual environment"
        exit 1
    fi
    print_success "Virtual environment activated"
    
    # Install/update Python dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        print_error "Failed to install Python dependencies"
        exit 1
    fi
    print_success "Python dependencies installed"
}

# Setup frontend environment
setup_frontend_env() {
    print_status "Setting up frontend environment..."
    
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            print_error "Failed to install frontend dependencies"
            cd ..
            exit 1
        fi
    fi
    print_success "Frontend dependencies ready"
    
    # Verify environment file
    if [ ! -f ".env.development" ]; then
        print_status "Creating frontend environment file..."
        cat > .env.development << 'EOF'
VITE_API_URL=http://localhost:5001/api
VITE_APP_TITLE=TypeTutor Development
VITE_DEBUG_MODE=true
EOF
        print_success "Environment file created"
    else
        # Check if it has the correct URL
        if grep -q "VITE_API_URL=http://localhost:5001/api" .env.development; then
            print_success "Environment file correctly configured"
        else
            print_warning "Updating environment file for port 5001..."
            sed -i.bak 's|VITE_API_URL=.*|VITE_API_URL=http://localhost:5001/api|' .env.development
            print_success "Environment file updated"
        fi
    fi
    
    cd ..
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p uploads data logs cache
    chmod 755 uploads data logs cache
    
    # Create basic stats file if needed
    if [ ! -f "data/user_stats.json" ]; then
        cat > data/user_stats.json << 'EOF'
{
  "averageWpm": 0,
  "accuracy": 0,
  "practiceMinutes": 0,
  "currentStreak": 0,
  "totalSessions": 0,
  "recentSessions": []
}
EOF
        print_success "Initial stats file created"
    fi
}

# Check port availability
check_ports() {
    print_status "Checking port availability..."
    
    # Check backend port
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $BACKEND_PORT is in use"
        print_warning "On macOS, this might be AirPlay Receiver"
        print_warning "You can disable it in: System Preferences > Sharing > AirPlay Receiver"
        
        # Try alternative ports
        for alt_port in 5002 5003 5004 5005; do
            if ! lsof -Pi :$alt_port -sTCP:LISTEN -t >/dev/null 2>&1; then
                BACKEND_PORT=$alt_port
                export PORT=$alt_port
                print_success "Using alternative backend port: $alt_port"
                break
            fi
        done
    else
        print_success "Backend port $BACKEND_PORT is available"
    fi
    
    # Check frontend port (Vite will handle conflicts automatically)
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $FRONTEND_PORT is in use, Vite will find an alternative"
    fi
}

# Start backend server
start_backend() {
    print_status "Starting backend server..."
    
    # Ensure we're in the right environment
    source venv/bin/activate
    
    # Set environment variables
    export FLASK_ENV=development
    export FLASK_DEBUG=1
    export PORT=$BACKEND_PORT
    
    # Start backend in background
    python backend/app.py > backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    print_status "Waiting for backend to initialize..."
    for i in {1..10}; do
        if curl -s http://localhost:$BACKEND_PORT/api/health >/dev/null 2>&1; then
            print_success "Backend started successfully (PID: $BACKEND_PID)"
            print_success "Backend URL: http://localhost:$BACKEND_PORT"
            return 0
        fi
        sleep 1
    done
    
    print_error "Backend failed to start"
    cat backend.log
    return 1
}

# Start frontend server
start_frontend() {
    print_status "Starting frontend server..."
    
    cd frontend
    
    # Update environment for dynamic backend port
    if [ $BACKEND_PORT -ne 5001 ]; then
        sed -i.bak "s|VITE_API_URL=.*|VITE_API_URL=http://localhost:$BACKEND_PORT/api|" .env.development
        print_success "Updated frontend to use backend port $BACKEND_PORT"
    fi
    
    # Start frontend in background
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    cd ..
    
    # Wait for frontend to start
    print_status "Waiting for frontend to initialize..."
    sleep 5
    
    if ps -p $FRONTEND_PID > /dev/null; then
        print_success "Frontend started successfully (PID: $FRONTEND_PID)"
        
        # Try to detect the actual frontend URL from the log
        if [ -f "frontend.log" ]; then
            frontend_url=$(grep -o "http://localhost:[0-9]*" frontend.log | head -1)
            if [ ! -z "$frontend_url" ]; then
                print_success "Frontend URL: $frontend_url"
                FRONTEND_PORT=$(echo $frontend_url | grep -o '[0-9]*$')
            fi
        fi
        return 0
    else
        print_error "Frontend failed to start"
        cat frontend.log
        return 1
    fi
}

# Test connection between frontend and backend
test_connection() {
    print_status "Testing frontend-backend connection..."
    
    # Test backend health
    if curl -s http://localhost:$BACKEND_PORT/api/health | grep -q "healthy"; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Test basic API endpoints
    endpoints=("stats" "debug-info" "pdf-support")
    for endpoint in "${endpoints[@]}"; do
        if curl -s http://localhost:$BACKEND_PORT/api/$endpoint >/dev/null 2>&1; then
            print_success "API endpoint /$endpoint is responding"
        else
            print_warning "API endpoint /$endpoint may have issues"
        fi
    done
    
    return 0
}

# Main execution
main() {
    print_header "Starting TypeTutor Application Launch Sequence"
    
    # Run all setup steps
    check_prerequisites
    setup_python_env
    setup_frontend_env
    create_directories
    check_ports
    
    # Start services
    if ! start_backend; then
        exit 1
    fi
    
    if ! start_frontend; then
        cleanup
        exit 1
    fi
    
    # Test connection
    sleep 2
    test_connection
    
    # Display success information
    echo ""
    print_header "🎉 TypeTutor is now running!"
    echo ""
    echo "📱 Application URLs:"
    echo "   Frontend: http://localhost:$FRONTEND_PORT"
    echo "   Backend:  http://localhost:$BACKEND_PORT"
    echo ""
    echo "🔗 API Endpoints:"
    echo "   Health:    http://localhost:$BACKEND_PORT/api/health"
    echo "   Debug:     http://localhost:$BACKEND_PORT/api/debug-info"
    echo "   Stats:     http://localhost:$BACKEND_PORT/api/stats"
    echo ""
    echo "✨ Features Available:"
    echo "   • PDF Upload and Processing"
    echo "   • Custom Text Typing Practice"
    echo "   • Real-time Statistics Tracking"
    echo "   • Progress Analytics"
    echo "   • Dark/Light Mode"
    echo "   • Session History"
    echo ""
    echo "🧪 Quick Tests:"
    echo "   • Open http://localhost:$FRONTEND_PORT in your browser"
    echo "   • Upload a PDF file to test processing"
    echo "   • Try custom text typing practice"
    echo "   • Press Ctrl+Shift+D for debug panel in frontend"
    echo ""
    echo "📊 Logs:"
    echo "   • Backend: backend.log"
    echo "   • Frontend: frontend.log"
    echo ""
    print_warning "Press Ctrl+C to stop all servers"
    echo ""
    
    # Wait for user to stop
    wait
}

# Run the main function
main