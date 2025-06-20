#!/bin/bash

# TypeTutor Integration Test Script
# Tests the complete flow: backend -> frontend -> timer -> stats

echo "🧪 TypeTutor Integration Test Script"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}[✅ PASS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[⚠️  WARN]${NC} $1"; }
print_error() { echo -e "${RED}[❌ FAIL]${NC} $1"; }
print_info() { echo -e "${BLUE}[ℹ️  INFO]${NC} $1"; }

# Test 1: Check if backend is running
print_info "Testing backend connection..."
if curl -s http://localhost:5001/api/health >/dev/null 2>&1; then
    print_success "Backend is running on port 5001"
    
    # Get health status
    HEALTH_RESPONSE=$(curl -s http://localhost:5001/api/health)
    echo "   Health status: $HEALTH_RESPONSE"
else
    print_error "Backend is not running on port 5001"
    echo "   Please start the backend with: python backend/app.py"
    exit 1
fi

# Test 2: Test stats endpoint
print_info "Testing stats endpoint..."
if curl -s http://localhost:5001/api/stats >/dev/null 2>&1; then
    print_success "Stats endpoint is accessible"
    
    # Show current stats
    STATS_RESPONSE=$(curl -s http://localhost:5001/api/stats)
    echo "   Current stats preview:"
    echo "$STATS_RESPONSE" | python3 -m json.tool 2>/dev/null | head -10 || echo "   (Stats data exists but not JSON formatted)"
else
    print_error "Stats endpoint failed"
fi

# Test 3: Test duration problem with save-stats
print_info "Testing session save with zero duration (the main problem)..."

# Test problematic session data
PROBLEM_SESSION='{
    "wpm": 45,
    "accuracy": 92,
    "duration": 0,
    "errors": 2,
    "itemType": "Custom Text",
    "totalCharacters": 200,
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

SAVE_RESPONSE=$(curl -s -X POST http://localhost:5001/api/save-stats \
    -H "Content-Type: application/json" \
    -d "$PROBLEM_SESSION")

if echo "$SAVE_RESPONSE" | grep -q "success.*true" 2>/dev/null; then
    print_success "Backend handled zero duration correctly"
    echo "   Response: $SAVE_RESPONSE"
else
    print_warning "Backend may have issues with zero duration"
    echo "   Response: $SAVE_RESPONSE"
fi

# Test 4: Test normal session data
print_info "Testing session save with normal duration..."

NORMAL_SESSION='{
    "wpm": 45,
    "accuracy": 92,
    "duration": 180,
    "errors": 2,
    "itemType": "Custom Text",
    "totalCharacters": 200,
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

SAVE_RESPONSE=$(curl -s -X POST http://localhost:5001/api/save-stats \
    -H "Content-Type: application/json" \
    -d "$NORMAL_SESSION")

if echo "$SAVE_RESPONSE" | grep -q "success.*true" 2>/dev/null; then
    print_success "Normal session saved successfully"
else
    print_error "Failed to save normal session"
    echo "   Response: $SAVE_RESPONSE"
fi

# Test 5: Check recent sessions for duration formatting
print_info "Checking recent sessions for duration issues..."

RECENT_STATS=$(curl -s http://localhost:5001/api/stats)
ZERO_DURATION_COUNT=$(echo "$RECENT_STATS" | grep -o '"0m 0s"' | wc -l || echo 0)

if [ "$ZERO_DURATION_COUNT" -eq 0 ]; then
    print_success "No '0m 0s' duration issues found"
else
    print_warning "Found $ZERO_DURATION_COUNT sessions with '0m 0s' duration"
    echo "   This indicates the frontend timer issue"
fi

# Test 6: Test validation endpoint if available
print_info "Testing session validation endpoint..."

if curl -s http://localhost:5001/api/validate-session >/dev/null 2>&1; then
    VALIDATION_RESPONSE=$(curl -s -X POST http://localhost:5001/api/validate-session \
        -H "Content-Type: application/json" \
        -d "$PROBLEM_SESSION")
    
    if echo "$VALIDATION_RESPONSE" | grep -q "valid.*false" 2>/dev/null; then
        print_success "Validation correctly identified problematic session"
    else
        print_warning "Validation endpoint exists but may not catch duration issues"
    fi
else
    print_warning "Validation endpoint not available (using basic backend)"
fi

# Test 7: Test debug endpoint if available
print_info "Testing debug endpoint..."

if curl -s http://localhost:5001/api/debug-stats >/dev/null 2>&1; then
    DEBUG_RESPONSE=$(curl -s http://localhost:5001/api/debug-stats)
    
    if echo "$DEBUG_RESPONSE" | grep -q "stats_file_exists.*true" 2>/dev/null; then
        print_success "Debug endpoint working, stats file exists"
    else
        print_warning "Debug endpoint available but may have issues"
    fi
else
    print_warning "Debug endpoint not available"
fi

# Test 9: File permissions and directories
print_info "Checking file permissions and directories..."

# Check if data directory exists and is writable
if [ -d "data" ] && [ -w "data" ]; then
    print_success "Data directory exists and is writable"
else
    print_warning "Data directory may have permission issues"
    mkdir -p data 2>/dev/null || print_error "Cannot create data directory"
fi

# Check stats file
if [ -f "data/user_stats.json" ]; then
    print_success "Stats file exists"
    
    # Check for syntax errors
    if python3 -m json.tool data/user_stats.json >/dev/null 2>&1; then
        print_success "Stats file has valid JSON"
    else
        print_error "Stats file has invalid JSON syntax"
    fi
else
    print_warning "Stats file doesn't exist (will be created on first use)"
fi

# Test 10: Python backend dependencies
print_info "Checking Python backend dependencies..."

# Check if we can import required modules
python3 -c "
import sys
required_modules = ['flask', 'flask_cors', 'json', 'os', 'datetime']
missing = []

for module in required_modules:
    try:
        __import__(module.replace('_', '.') if '_' in module else module)
        print(f'✅ {module}')
    except ImportError:
        missing.append(module)
        print(f'❌ {module}')

if missing:
    print(f'\\nMissing modules: {missing}')
    print('Install with: pip install flask flask-cors')
    sys.exit(1)
else:
    print('\\n✅ All required Python modules available')
" 2>/dev/null

if [ $? -eq 0 ]; then
    print_success "Python dependencies are satisfied"
else
    print_error "Missing Python dependencies"
    echo "   Run: pip install flask flask-cors"
fi

# Test 11: Node.js frontend dependencies
print_info "Checking Node.js frontend dependencies..."

if [ -f "frontend/package.json" ]; then
    print_success "Frontend package.json exists"
    
    # Check if node_modules exists
    if [ -d "frontend/node_modules" ]; then
        print_success "Frontend dependencies installed"
    else
        print_warning "Frontend dependencies not installed"
        echo "   Run: cd frontend && npm install"
    fi
else
    print_error "Frontend package.json not found"
fi

# Test 12: Port availability check
print_info "Checking port availability..."

# Check if ports are available
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_success "Port 5001 is in use (backend should be running)"
else
    print_warning "Port 5001 is not in use (backend not running)"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_success "Port 5173 is in use (frontend should be running)"
else
    print_warning "Port 5173 is not in use (frontend not running)"
fi

# Summary and recommendations
echo ""
echo "🏁 Test Summary and Recommendations"
echo "=================================="

print_info "Integration Test Complete!"

echo ""
echo "📋 Quick Checklist for Duration Fix:"
echo ""
echo "1. ✅ Replace backend/services/stats_service.py with enhanced version"
echo "2. ✅ Replace backend/utils/validators.py with enhanced version"
echo "3. ✅ Replace backend/routes/stats_routes.py with enhanced version"
echo "4. ✅ Add frontend/src/utils/timerDebugHelper.js"
echo "5. ✅ Replace your PracticeScreen.jsx with the enhanced version"
echo "6. ✅ Update frontend/src/services/api.js with correct port (5001)"
echo ""

echo "🚀 To apply the fixes:"
echo ""
echo "   # 1. Start backend (if not running)"
echo "   python backend/app.py"
echo ""
echo "   # 2. Start frontend (if not running)"
echo "   cd frontend && npm run dev"
echo ""
echo "   # 3. Test a typing session"
echo "   # 4. Check browser console for timer debug logs"
echo "   # 5. Verify stats are saved correctly"
echo ""

echo "🐛 Debug Tips:"
echo ""
echo "   • Open browser dev tools (F12)"
echo "   • Look for timer debug logs starting with [TimerDebug]"
echo "   • Check Network tab for API calls to /api/save-stats"
echo "   • Use Ctrl+Shift+D to export debug data"
echo ""

echo "📊 Monitoring:"
echo ""
echo "   • Backend logs: Check console where you ran 'python backend/app.py'"
echo "   • Debug endpoint: http://localhost:5001/api/debug-stats"
echo "   • Validation endpoint: http://localhost:5001/api/validate-session"
echo "   • Health check: http://localhost:5001/api/health"
echo ""

# Check if we should provide specific next steps
if ! curl -s http://localhost:5001/api/health >/dev/null 2>&1; then
    echo "⚠️  NEXT STEP: Start the backend server first!"
    echo "   cd /path/to/typetutor && python backend/app.py"
    echo ""
fi

if ! curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "⚠️  NEXT STEP: Start the frontend development server!"
    echo "   cd frontend && npm run dev"
    echo ""
fi

echo "✨ Once both servers are running, test a typing session!"
echo "   The duration should now show correctly instead of '0m 0s'"

# Create a simple curl test for the duration issue
cat > test_duration_fix.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing Duration Fix"
echo "====================="

# Test with zero duration (should be handled gracefully)
echo "Testing zero duration session..."
curl -s -X POST http://localhost:5001/api/save-stats \
  -H "Content-Type: application/json" \
  -d '{
    "wpm": 45,
    "accuracy": 92,
    "duration": 0,
    "errors": 2,
    "itemType": "Test Session"
  }' | python3 -m json.tool

echo -e "\n---\n"

# Check recent sessions
echo "Checking recent sessions..."
curl -s http://localhost:5001/api/stats | python3 -c "
import json, sys
data = json.load(sys.stdin)
sessions = data.get('recentSessions', [])
print(f'Recent sessions: {len(sessions)}')
for i, session in enumerate(sessions[:3]):
    duration = session.get('duration', 'N/A')
    wpm = session.get('wpm', 0)
    date = session.get('date', 'N/A')
    print(f'  {i+1}. {date} | {duration} | {wpm} WPM')
    if duration == '0m 0s':
        print(f'     ⚠️  Found zero duration issue!')
    else:
        print(f'     ✅ Duration looks good')
"
EOF

chmod +x test_duration_fix.sh

echo ""
echo "📝 Created test_duration_fix.sh - run this after applying fixes"
echo ""

print_success "Integration test completed! Check the summary above for next steps."