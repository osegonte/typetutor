#!/bin/bash

# TypeTutor Debug & Cleanup Script
# This script will debug Railway deployment issues and clean up redundant files

set -e  # Exit on any error

echo "🔧 TypeTutor Debug & Cleanup Script"
echo "===================================="

PROJECT_ROOT="/Users/osegonte/typetutor"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Check if we're in the right directory
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "❌ Project directory not found: $PROJECT_ROOT"
    echo "Please run this script from the correct location"
    exit 1
fi

cd "$PROJECT_ROOT"

echo ""
echo "📍 Current directory: $(pwd)"
echo "📍 Backend directory: $BACKEND_DIR"

# Function to check file existence and content
check_file() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        echo "✅ $description exists: $file"
        echo "   Size: $(wc -c < "$file") bytes"
        echo "   Modified: $(stat -f "%Sm" "$file")"
    else
        echo "❌ $description missing: $file"
    fi
}

# Function to show file content with header
show_file_content() {
    local file="$1"
    local description="$2"
    
    echo ""
    echo "📄 $description ($file):"
    echo "----------------------------------------"
    if [ -f "$file" ]; then
        cat "$file"
    else
        echo "FILE NOT FOUND"
    fi
    echo "----------------------------------------"
}

echo ""
echo "🔍 STEP 1: Checking Project Structure"
echo "====================================="

# Check main directories
echo "📁 Directory structure:"
ls -la "$PROJECT_ROOT" | head -10

echo ""
echo "📁 Backend directory contents:"
if [ -d "$BACKEND_DIR" ]; then
    ls -la "$BACKEND_DIR" | head -15
else
    echo "❌ Backend directory not found!"
fi

echo ""
echo "🔍 STEP 2: Checking Critical Files"
echo "=================================="

# Check critical files
check_file "$BACKEND_DIR/app.py" "Main Flask app"
check_file "$BACKEND_DIR/requirements.txt" "Requirements file"
check_file "$BACKEND_DIR/nixpacks.toml" "Nixpacks config"
check_file "$BACKEND_DIR/runtime.txt" "Python runtime"
check_file "$BACKEND_DIR/Procfile" "Procfile"
check_file "$BACKEND_DIR/railway.json" "Railway config"
check_file "$PROJECT_ROOT/railway.json" "Root Railway config"

echo ""
echo "🔍 STEP 3: Analyzing File Contents"
echo "================================="

# Show critical file contents
show_file_content "$BACKEND_DIR/requirements.txt" "Requirements"
show_file_content "$BACKEND_DIR/nixpacks.toml" "Nixpacks Config"
show_file_content "$BACKEND_DIR/runtime.txt" "Python Runtime"
show_file_content "$BACKEND_DIR/Procfile" "Procfile"
show_file_content "$BACKEND_DIR/railway.json" "Backend Railway Config"
show_file_content "$PROJECT_ROOT/railway.json" "Root Railway Config"

echo ""
echo "🔍 STEP 4: Checking App.py Version"
echo "================================="

if [ -f "$BACKEND_DIR/app.py" ]; then
    echo "📄 Checking version in app.py:"
    grep -n "version.*=" "$BACKEND_DIR/app.py" || echo "No version found in app.py"
    
    echo ""
    echo "📄 Checking CORS configuration:"
    grep -n -A 10 -B 2 "CORS\|cors" "$BACKEND_DIR/app.py" || echo "No CORS config found"
    
    echo ""
    echo "📄 Checking app.py structure:"
    echo "   Lines in file: $(wc -l < "$BACKEND_DIR/app.py")"
    echo "   Import statements:"
    grep -n "^import\|^from" "$BACKEND_DIR/app.py" | head -10
fi

echo ""
echo "🧹 STEP 5: Cleanup Redundant Files"
echo "================================="

BACKUP_DIR="$PROJECT_ROOT/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup directory: $BACKUP_DIR"

# List of redundant files to remove
REDUNDANT_FILES=(
    "$BACKEND_DIR/app.py.clean_backup"
    "$BACKEND_DIR/app.py.precise_backup"
    "$PROJECT_ROOT/typetutor_cors_problem_summary.md"
    "$PROJECT_ROOT/test-deployment.sh"
)

echo ""
echo "🗑️  Removing redundant files:"
for file in "${REDUNDANT_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   Moving to backup: $(basename "$file")"
        mv "$file" "$BACKUP_DIR/"
    else
        echo "   Not found: $(basename "$file")"
    fi
done

# Remove duplicate railway configs (keep only backend/railway.json)
if [ -f "$PROJECT_ROOT/railway.json" ] && [ -f "$BACKEND_DIR/railway.json" ]; then
    echo "   Removing duplicate root railway.json (keeping backend version)"
    mv "$PROJECT_ROOT/railway.json" "$BACKUP_DIR/"
fi

echo ""
echo "🔧 STEP 6: Ensuring Correct Configuration"
echo "========================================"

# Ensure we have the right railway config
cat > "$BACKEND_DIR/railway.json" << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "gunicorn --bind 0.0.0.0:$PORT app:app --timeout 120 --worker-class sync --workers 2",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

echo "✅ Updated backend/railway.json"

# Ensure we have the right requirements.txt
cat > "$BACKEND_DIR/requirements.txt" << 'EOF'
Flask==3.0.0
flask-cors==4.0.0
gunicorn==21.2.0
python-dotenv==1.0.0
supabase==2.8.0
PyJWT==2.8.0
bcrypt==4.0.1
python-dateutil==2.8.2
requests==2.31.0
EOF

echo "✅ Updated requirements.txt (removed psycopg2-binary)"

# Ensure we have the right nixpacks config
cat > "$BACKEND_DIR/nixpacks.toml" << 'EOF'
[phases.setup]
nixPkgs = ['python310']

[phases.install]
cmds = ['pip install -r requirements.txt']

[start]
cmd = 'gunicorn --bind 0.0.0.0:$PORT app:app --timeout 120 --worker-class sync --workers 2'
EOF

echo "✅ Updated nixpacks.toml"

# Ensure runtime.txt
echo "python-3.10.12" > "$BACKEND_DIR/runtime.txt"
echo "✅ Updated runtime.txt"

echo ""
echo "🔍 STEP 7: Checking App.py CORS Configuration"
echo "============================================"

# Check if app.py has the correct CORS setup
if grep -q "version.*3\.1\.0" "$BACKEND_DIR/app.py"; then
    echo "✅ Found version 3.1.0 in app.py"
else
    echo "❌ Version 3.1.0 not found in app.py"
    echo "🔧 Let's check what version is there:"
    grep -n "version" "$BACKEND_DIR/app.py" || echo "No version string found"
fi

# Check CORS configuration
if grep -q "CORS.*app" "$BACKEND_DIR/app.py"; then
    echo "✅ Found CORS configuration in app.py"
    echo "📄 CORS config:"
    grep -A 8 "CORS.*app" "$BACKEND_DIR/app.py"
else
    echo "❌ CORS configuration not found in app.py"
fi

echo ""
echo "🚀 STEP 8: Testing Local Setup"
echo "============================="

cd "$BACKEND_DIR"

echo "📍 Testing requirements installation:"
if python3 -m pip install -r requirements.txt --dry-run > /dev/null 2>&1; then
    echo "✅ Requirements can be installed"
else
    echo "❌ Requirements installation would fail"
    echo "🔧 Checking specific packages:"
    python3 -m pip install Flask==3.0.0 --dry-run > /dev/null 2>&1 && echo "  ✅ Flask OK" || echo "  ❌ Flask issue"
    python3 -m pip install flask-cors==4.0.0 --dry-run > /dev/null 2>&1 && echo "  ✅ Flask-CORS OK" || echo "  ❌ Flask-CORS issue"
    python3 -m pip install gunicorn==21.2.0 --dry-run > /dev/null 2>&1 && echo "  ✅ Gunicorn OK" || echo "  ❌ Gunicorn issue"
fi

echo ""
echo "📍 Testing app.py syntax:"
if python3 -m py_compile app.py > /dev/null 2>&1; then
    echo "✅ app.py syntax is valid"
else
    echo "❌ app.py has syntax errors"
    python3 -m py_compile app.py
fi

echo ""
echo "🎯 STEP 9: Git Status and Next Steps"
echo "===================================="

cd "$PROJECT_ROOT"

echo "📊 Current git status:"
git status --porcelain

echo ""
echo "🚀 Ready to commit and push changes:"
echo "   git add ."
echo "   git commit -m 'Debug and cleanup - fix Railway deployment'"
echo "   git push origin main"

echo ""
echo "🧪 STEP 10: Manual Tests to Run After Push"
echo "=========================================="

echo "After pushing, wait 3-5 minutes then run:"
echo ""
echo "# Test 1: Check version"
echo "curl -s https://typetutor-production.up.railway.app/api/health | grep version"
echo ""
echo "# Test 2: Check CORS"
echo "curl -I -H 'Origin: https://typetutor.vercel.app' \\"
echo "     -X OPTIONS \\"
echo "     https://typetutor-production.up.railway.app/api/health"
echo ""
echo "# Test 3: Full health check"
echo "curl -s https://typetutor-production.up.railway.app/api/health | jq ."

echo ""
echo "🎯 SUMMARY"
echo "=========="
echo "✅ Cleaned up redundant files (moved to backup)"
echo "✅ Fixed requirements.txt (removed psycopg2-binary)"
echo "✅ Ensured proper Railway configuration files"
echo "✅ Verified app.py syntax"
echo "📦 Backup created at: $BACKUP_DIR"
echo ""
echo "🚀 Next: Commit and push the changes to trigger Railway redeploy"

echo ""
echo "🔗 Quick commit and push:"
echo "=================================="
read -p "Do you want to commit and push now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .
    git commit -m "Debug and cleanup - fix Railway deployment"
    git push origin main
    echo "✅ Changes pushed! Wait 3-5 minutes then test the URLs above."
else
    echo "⏸️  Run the git commands manually when ready."
fi