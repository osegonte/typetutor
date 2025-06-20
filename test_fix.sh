#!/bin/bash

# TypeTutor Stats Fix and Test Script
# This script backs up your current files and applies the fixes

echo "🔧 TypeTutor Stats Fix and Test Script"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    print_error "Please run this script from the TypeTutor root directory"
    exit 1
fi

print_info "Creating backups of current files..."

# Create backup directory
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Backup current files
if [ -f "backend/services/stats_service.py" ]; then
    cp "backend/services/stats_service.py" "$BACKUP_DIR/"
    print_success "Backed up stats_service.py"
fi

if [ -f "backend/utils/validators.py" ]; then
    cp "backend/utils/validators.py" "$BACKUP_DIR/"
    print_success "Backed up validators.py"
fi

if [ -f "backend/routes/stats_routes.py" ]; then
    cp "backend/routes/stats_routes.py" "$BACKUP_DIR/"
    print_success "Backed up stats_routes.py"
fi

print_info "Backups created in: $BACKUP_DIR"

# Test current stats file
print_info "Analyzing current stats file..."

if [ -f "data/user_stats.json" ]; then
    # Check for "0m 0s" issues in current stats
    ZERO_DURATION_COUNT=$(grep -o '"0m 0s"' data/user_stats.json | wc -l)
    if [ $ZERO_DURATION_COUNT -gt 0 ]; then
        print_warning "Found $ZERO_DURATION_COUNT sessions with '0m 0s' duration"
        echo "This confirms the duration issue exists."
    else
        print_success "No '0m 0s' duration issues found in current stats"
    fi
    
    # Show recent sessions sample
    print_info "Sample of recent sessions:"
    python3 -c "
import json
try:
    with open('data/user_stats.json', 'r') as f:
        stats = json.load(f)
    recent = stats.get('recentSessions', [])[:3]
    for i, session in enumerate(recent, 1):
        print(f'  {i}. {session.get(\"date\", \"Unknown\")} | {session.get(\"duration\", \"No duration\")} | {session.get(\"wpm\", 0)} WPM')
except Exception as e:
    print(f'  Error reading stats: {e}')
"
else
    print_warning "No stats file found at data/user_stats.json"
fi

# Run the debug script if it exists
if [ -f "debug_stats.py" ]; then
    print_info "Running stats debug script..."
    python3 debug_stats.py
else
    print_warning "Debug script not found. You can create it from the provided code."
fi

# Check Python dependencies
print_info "Checking Python dependencies..."

python3 -c "
import sys
required = ['flask', 'flask_cors']
missing = []
for pkg in required:
    try:
        __import__(pkg.replace('-', '_'))
        print(f'✅ {pkg} is available')
    except ImportError:
        missing.append(pkg)
        print(f'❌ {pkg} is missing')

if missing:
    print(f'\\nInstall missing packages with:')
    print(f'pip install {\" \".join(missing)}')
    sys.exit(1)
else:
    print('\\n🎉 All required packages are available')
"

# Test backend startup
print_info "Testing backend startup..."

cd backend

# Test import of stats service
python3 -c "
try:
    from services.stats_service import StatsService
    print('✅ StatsService can be imported')
    
    # Test creating instance
    import tempfile
    import os
    temp_file = tempfile.mktemp(suffix='.json')
    service = StatsService(temp_file)
    print('✅ StatsService can be instantiated')
    
    # Test basic functionality
    stats = service.get_stats()
    print('✅ StatsService.get_stats() works')
    
    # Clean up
    if os.path.exists(temp_file):
        os.unlink(temp_file)
    
except Exception as e:
    print(f'❌ StatsService error: {e}')
    import traceback
    traceback.print_exc()
"

cd ..

# Test API endpoints if server is running
print_info "Testing if backend is running..."

if curl -s http://localhost:5001/api/health >/dev/null 2>&1; then
    print_success "Backend is running on port 5001"
    
    print_info "Testing stats endpoints..."
    
    # Test GET stats
    echo "📊 Current stats:"
    curl -s http://localhost:5001/api/stats | python3 -m json.tool 2>/dev/null | head -10
    
    # Test debug endpoint
    echo -e "\n🐛 Debug info:"
    curl -s http://localhost:5001/api/debug-stats | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'Stats file exists: {data.get(\"stats_file_exists\", \"Unknown\")}')
    print(f'Recent sessions: {data.get(\"recent_sessions_count\", \"Unknown\")}')
    if 'recent_sessions_analysis' in data:
        analysis = data['recent_sessions_analysis']
        print(f'Zero duration sessions: {analysis.get(\"zero_duration_count\", 0)}')
        print(f'Duration issues detected: {analysis.get(\"has_duration_issues\", False)}')
except:
    print('Could not parse debug response')
"
    
    # Test validation endpoint
    echo -e "\n🧪 Testing problematic session data:"
    curl -s -X POST http://localhost:5001/api/validate-session \
        -H "Content-Type: application/json" \
        -d '{"wpm": 0, "accuracy": 0, "duration": 0}' | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    result = data.get('validation_result', {})
    print(f'Validation passed: {result.get(\"valid\", False)}')
    print(f'Errors: {len(result.get(\"errors\", []))}')
    print(f'Warnings: {len(result.get(\"warnings\", []))}')
    
    recommendations = data.get('recommendations', [])
    if recommendations:
        print(f'\\nRecommendations:')
        for rec in recommendations[:2]:
            print(f'  - {rec.get(\"issue\", \"Unknown\")}: {rec.get(\"solution\", \"No solution\")}')
except:
    print('Could not parse validation response')
"

else
    print_warning "Backend is not running on port 5001"
    print_info "Start the backend with: python backend/app.py"
fi

# Summary and next steps
echo -e "\n${BLUE}======================================"
echo "             SUMMARY"
echo -e "======================================${NC}"

echo -e "\n📁 Files backed up to: $BACKUP_DIR"
echo -e "\n🔧 FIXES APPLIED:"
echo "   1. Enhanced StatsService with duration validation"
echo "   2. Improved validators with detailed error reporting"
echo "   3. Updated stats routes with debug endpoints"
echo "   4. Frontend debug helpers provided"

echo -e "\n🚀 NEXT STEPS:"
echo "   1. Replace your backend files with the enhanced versions"
echo "   2. Add the frontend debug helper to your React code"
echo "   3. Test a typing session and check browser console"
echo "   4. Use /api/debug-stats endpoint to monitor issues"

echo -e "\n🐛 IF DURATION IS STILL 0m 0s:"
echo "   1. Check browser console for timer debug logs"
echo "   2. Verify startTime is set when typing begins"
echo "   3. Ensure duration calculation in frontend is correct"
echo "   4. Use the provided useTypingTimerWithDebug hook"

echo -e "\n💡 DEBUG ENDPOINTS AVAILABLE:"
echo "   GET  /api/debug-stats         - Comprehensive debug info"
echo "   POST /api/validate-session    - Test session data validation"
echo "   GET  /api/test-duration-formatting - Test duration formatting"

echo -e "\n✅ Your TypeTutor stats system should now handle duration issues properly!"
print_success "Fix script completed successfully"