#!/bin/bash

# TypeTutor Startup Fix Script
# Fixes permissions and starts the application properly

echo "🔧 TypeTutor Startup Fix Script"
echo "==============================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}[✅ SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[⚠️  WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[❌ ERROR]${NC} $1"; }
print_info() { echo -e "${BLUE}[ℹ️  INFO]${NC} $1"; }

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the TypeTutor root directory"
    echo "   Expected structure: typetutor/backend/ and typetutor/frontend/"
    exit 1
fi

# Fix 1: Check Python installation
print_info "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python3 is available: $PYTHON_VERSION"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    print_success "Python is available: $PYTHON_VERSION"
    PYTHON_CMD="python"
else
    print_error "Python is not installed or not in PATH"
    echo "   Please install Python 3.7+ from https://python.org"
    exit 1
fi

# Fix 2: Check and create virtual environment
print_info "Checking Python virtual environment..."
if [ ! -d "venv" ]; then
    print_warning "Virtual environment not found. Creating one..."
    $PYTHON_CMD -m venv venv
    if [ $? -eq 0 ]; then
        print_success "Virtual environment created"
    else
        print_error "Failed to create virtual environment"
        exit 1
    fi
else
    print_success "Virtual environment already exists"
fi

# Fix 3: Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

if [ $? -eq 0 ]; then
    print_success "Virtual environment activated"
    echo "   Python path: $(which python)"
else
    print_warning "Could not activate virtual environment, continuing with system Python"
fi

# Fix 4: Install Python dependencies
print_info "Installing Python dependencies..."
pip install -q flask flask-cors python-decouple

if [ $? -eq 0 ]; then
    print_success "Python dependencies installed"
else
    print_warning "Some dependencies might have failed to install"
fi

# Fix 5: Create necessary directories
print_info "Creating necessary directories..."
mkdir -p data logs uploads cache
chmod 755 data logs uploads cache
print_success "Directories created with proper permissions"

# Fix 6: Check backend files
print_info "Checking backend files..."
if [ ! -f "backend/app.py" ]; then
    print_error "backend/app.py not found"
    exit 1
fi

# Fix 7: Make backend/app.py executable (this was the issue)
print_info "Fixing backend/app.py permissions..."
chmod +x backend/app.py
print_success "backend/app.py is now executable"

# Fix 8: Check if backend/app.py has proper shebang
print_info "Checking backend/app.py shebang..."
FIRST_LINE=$(head -n 1 backend/app.py)
if [[ $FIRST_LINE == "#!"* ]]; then
    print_success "Shebang found: $FIRST_LINE"
else
    print_warning "No shebang found, will run with python command"
fi

# Fix 9: Test backend startup
print_info "Testing backend startup..."

# Try to start backend in background to test
echo "Starting backend server..."

# Method 1: Try with python command
if [ -n "$VIRTUAL_ENV" ] || command -v python3 &> /dev/null; then
    echo "Using: python backend/app.py"
    python backend/app.py &
    BACKEND_PID=$!
else
    echo "Using: ./backend/app.py"
    ./backend/app.py &
    BACKEND_PID=$!
fi

# Wait a moment for startup
sleep 3

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    print_success "Backend started successfully (PID: $BACKEND_PID)"
    
    # Test health endpoint
    print_info "Testing backend health endpoint..."
    sleep 2
    
    if curl -s http://localhost:5001/api/health >/dev/null 2>&1; then
        print_success "Backend health check passed"
        HEALTH_RESPONSE=$(curl -s http://localhost:5001/api/health)
        echo "   Response: $HEALTH_RESPONSE"
    else
        print_warning "Backend started but health check failed"
        echo "   This might be normal if the server is still starting up"
    fi
    
    # Stop test backend
    kill $BACKEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    print_info "Test backend stopped"
    
else
    print_error "Backend failed to start"
    echo "   Check the error messages above"
    exit 1
fi

# Fix 10: Check Node.js for frontend
print_info "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is available: $NODE_VERSION"
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is available: $NPM_VERSION"
    else
        print_warning "npm not found, but Node.js is available"
    fi
else
    print_warning "Node.js not found. Frontend may not work."
    echo "   Install Node.js from https://nodejs.org"
fi

# Fix 11: Check frontend dependencies
if [ -f "frontend/package.json" ]; then
    print_info "Checking frontend dependencies..."
    
    if [ -d "frontend/node_modules" ]; then
        print_success "Frontend dependencies are installed"
    else
        print_warning "Frontend dependencies not installed"
        echo "   Run: cd frontend && npm install"
        
        if command -v npm &> /dev/null; then
            print_info "Installing frontend dependencies..."
            cd frontend
            npm install
            if [ $? -eq 0 ]; then
                print_success "Frontend dependencies installed"
            else
                print_warning "Frontend dependency installation had issues"
            fi
            cd ..
        fi
    fi
else
    print_warning "frontend/package.json not found"
fi

# Fix 12: Create startup scripts
print_info "Creating startup scripts..."

# Backend startup script
cat > start_backend.sh << 'EOF'
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
EOF

# Frontend startup script
cat > start_frontend.sh << 'EOF'
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
EOF

# Make scripts executable
chmod +x start_backend.sh start_frontend.sh

print_success "Created startup scripts:"
echo "   • start_backend.sh  - Starts the Python backend server"
echo "   • start_frontend.sh - Starts the React frontend development server"

# Fix 13: Create simple test script
cat > quick_test.sh << 'EOF'
#!/bin/bash
echo "🧪 Quick TypeTutor Test"
echo "======================"

# Test backend
echo "Testing backend..."
if curl -s http://localhost:5001/api/health >/dev/null 2>&1; then
    echo "✅ Backend is running on port 5001"
else
    echo "❌ Backend is not running"
    echo "   Start with: ./start_backend.sh"
fi

# Test frontend  
echo "Testing frontend..."
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "✅ Frontend is running on port 5173"
else
    echo "❌ Frontend is not running"
    echo "   Start with: ./start_frontend.sh"
fi

echo ""
echo "🌐 URLs:"
echo "   Backend API: http://localhost:5001/api/health"
echo "   Frontend:    http://localhost:5173"
EOF

chmod +x quick_test.sh

print_success "Created quick_test.sh for easy testing"

# Summary
echo ""
echo "🎉 TypeTutor Startup Fix Complete!"
echo "=================================="
echo ""
echo "🚀 To start TypeTutor:"
echo ""
echo "   1. Start backend (in one terminal):"
echo "      ./start_backend.sh"
echo ""
echo "   2. Start frontend (in another terminal):"
echo "      ./start_frontend.sh"
echo ""
echo "   3. Open your browser to:"
echo "      http://localhost:5173"
echo ""
echo "🧪 To test if everything is working:"
echo "   ./quick_test.sh"
echo ""
echo "🐛 For integration testing:"
echo "   ./integration_test_script.sh"
echo ""

# Final check
print_info "Current status:"
echo "   ✅ Python available: $(which python 2>/dev/null || which python3 2>/dev/null)"
echo "   ✅ Backend executable: backend/app.py"
echo "   ✅ Directories created: data/ logs/ uploads/ cache/"
echo "   ✅ Startup scripts: start_backend.sh, start_frontend.sh"

if command -v node &> /dev/null; then
    echo "   ✅ Node.js available: $(which node)"
else
    echo "   ⚠️  Node.js not available (frontend won't work)"
fi

print_success "You can now start TypeTutor with the provided scripts!"
echo ""
echo "💡 Tip: Run './start_backend.sh' first, then './start_frontend.sh' in a separate terminal"