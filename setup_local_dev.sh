#!/bin/bash
# setup_local_dev.sh - TypeTutor Local Development Setup

set -e

echo "🚀 TypeTutor Local Development Setup"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Python
echo -e "${BLUE}🐍 Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.7+ first.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✅ Python ${PYTHON_VERSION} found${NC}"

# Check pip
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 not found. Please install pip first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ pip3 found${NC}"

# Create virtual environment
echo -e "${BLUE}📦 Setting up virtual environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${YELLOW}⚠️  Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}🔧 Activating virtual environment...${NC}"
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

if [ "$VIRTUAL_ENV" != "" ]; then
    echo -e "${GREEN}✅ Virtual environment activated${NC}"
else
    echo -e "${RED}❌ Failed to activate virtual environment${NC}"
    exit 1
fi

# Upgrade pip
echo -e "${BLUE}⬆️  Upgrading pip...${NC}"
pip install --upgrade pip

# Install dependencies
echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Create necessary directories
echo -e "${BLUE}📁 Creating project directories...${NC}"
mkdir -p data logs uploads cache backend/services
echo -e "${GREEN}✅ Directories created${NC}"

# Create services directory and __init__.py if it doesn't exist
touch backend/__init__.py
touch backend/services/__init__.py

# Create .env for local development
echo -e "${BLUE}⚙️  Setting up environment variables...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# TypeTutor Local Development Environment
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=dev-secret-key-change-in-production
PORT=5001

# Database (optional)
USE_DATABASE=false
SUPABASE_URL=
SUPABASE_ANON_KEY=

# File paths
UPLOAD_FOLDER=uploads
STATS_FILE=data/user_stats.json
CACHE_DIR=cache
LOG_DIR=logs

# Limits
MAX_CONTENT_LENGTH=16777216
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW=60
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
fi

# Test the installation
echo -e "${BLUE}🧪 Testing installation...${NC}"

# Test Python imports
python3 -c "
import flask
import flask_cors
import pypdf
import psutil
print('✅ All required packages imported successfully')
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Package installation test passed${NC}"
else
    echo -e "${RED}❌ Package installation test failed${NC}"
    exit 1
fi

# Create run script
echo -e "${BLUE}📝 Creating run script...${NC}"
cat > run_local.sh << 'EOF'
#!/bin/bash
# Local development runner

echo "🚀 Starting TypeTutor Backend (Local Development)"
echo "=================================================="

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
    echo "✅ Virtual environment activated"
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
fi

# Create directories
mkdir -p data logs uploads cache

# Set Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd):$(pwd)/backend"

echo ""
echo "🌐 Backend will be available at:"
echo "   http://localhost:5001"
echo "   http://127.0.0.1:5001"
echo ""
echo "📋 API Endpoints:"
echo "   GET  /api/health        - Health check"
echo "   GET  /api/stats         - Get statistics"
echo "   POST /api/save-stats    - Save session"
echo "   POST /api/process-text  - Process text"
echo "   POST /api/upload-pdf    - Upload PDF"
echo ""
echo "🔧 CORS is enabled for frontend development"
echo "   Frontend URLs: http://localhost:5173, http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the application
python app.py
EOF

chmod +x run_local.sh
echo -e "${GREEN}✅ run_local.sh created${NC}"

# Create test script
echo -e "${BLUE}🧪 Creating test script...${NC}"
cat > test_local.sh << 'EOF'
#!/bin/bash
# Test local backend

echo "🧪 Testing TypeTutor Backend"
echo "============================="

BASE_URL="http://localhost:5001"

echo "Testing health endpoint..."
curl -s "$BASE_URL/api/health" | python3 -m json.tool

echo ""
echo "Testing stats endpoint..."
curl -s "$BASE_URL/api/stats" | python3 -m json.tool

echo ""
echo "Testing CORS (OPTIONS request)..."
curl -s -X OPTIONS "$BASE_URL/api/health" -H "Origin: http://localhost:5173" -v

echo ""
echo "✅ Basic tests completed"
EOF

chmod +x test_local.sh
echo -e "${GREEN}✅ test_local.sh created${NC}"

# Summary
echo ""
echo -e "${GREEN}🎉 Local development setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Start the backend: ./run_local.sh"
echo "2. Test the backend: ./test_local.sh"
echo "3. Access health check: http://localhost:5001/api/health"
echo ""
echo -e "${BLUE}🔧 Development workflow:${NC}"
echo "• Backend runs on http://localhost:5001"
echo "• Frontend should use VITE_API_URL=http://localhost:5001/api"
echo "• CORS is configured for localhost:5173 and localhost:3000"
echo "• Statistics are saved to data/user_stats.json"
echo "• Logs are written to logs/ directory"
echo ""
echo -e "${BLUE}📁 Project structure:${NC}"
echo "• app.py - Main application file"
echo "• backend/services/ - Service modules"
echo "• data/ - Statistics and data files"
echo "• uploads/ - PDF upload directory"
echo "• logs/ - Application logs"
echo "• cache/ - PDF processing cache"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "• Use 'deactivate' to exit the virtual environment"
echo "• Run 'source venv/bin/activate' to reactivate it"
echo "• Edit .env to customize configuration"
echo "• Check logs/typetutor.log for debugging"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"