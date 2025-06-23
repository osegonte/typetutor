#!/bin/bash
echo "🚀 Starting TypeTutor Backend (Development)"
echo "============================================"

# Activate virtual environment
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
fi

# Create directories
mkdir -p data uploads

echo ""
echo "🌐 Backend will be available at:"
echo "   http://localhost:5001"
echo "   http://127.0.0.1:5001"
echo ""
echo "📋 CORS-enabled API Endpoints:"
echo "   GET  /api/health        - Health check"
echo "   GET  /api/stats         - Get statistics" 
echo "   POST /api/save-stats    - Save session"
echo "   POST /api/process-text  - Process text"
echo "   POST /api/upload-pdf    - Upload PDF (CORS FIXED!)"
echo ""
echo "🔧 CORS Configuration:"
echo "   ✅ Preflight requests (OPTIONS) supported"
echo "   ✅ File uploads enabled"
echo "   ✅ Frontend origins: localhost:5173, localhost:3000"
echo "   ✅ Production origins: *.vercel.app, *.netlify.app"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the application
python app.py
