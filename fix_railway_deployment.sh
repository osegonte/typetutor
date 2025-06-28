#!/bin/bash
# fix_railway_deployment.sh
# Complete fix for TypeTutor Railway deployment issues

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() { echo -e "${PURPLE}=== $1 ===${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

PROJECT_ROOT=$(pwd)
RAILWAY_URL="https://perceptive-blessing-production.up.railway.app"

print_header "TypeTutor Railway Deployment Fix"
echo "This script will fix the Railway deployment issues by:"
echo "1. Updating startup configuration"
echo "2. Adding version tracking"
echo "3. Fixing path issues"
echo "4. Force redeploying with cache clear"
echo "5. Testing the deployment"
echo ""

# Step 1: Backup current files
print_header "Step 1: Backing up current files"
mkdir -p backups
cp start.py backups/start.py.backup 2>/dev/null || print_warning "start.py not found"
cp railway.json backups/railway.json.backup 2>/dev/null || print_warning "railway.json not found"
cp backend/app.py backups/app.py.backup 2>/dev/null || print_error "backend/app.py not found - wrong directory?"
print_success "Files backed up to backups/ directory"

# Step 2: Create new simplified start.py
print_header "Step 2: Creating new start.py"
cat > start.py << 'EOF'
#!/usr/bin/env python3
# start.py - Fixed Railway startup for TypeTutor v3.4.0
import os
import sys
from datetime import datetime

# Version info
APP_VERSION = "3.4.0"
DEPLOYMENT_TIMESTAMP = datetime.now().isoformat()

print(f"🚀 TypeTutor v{APP_VERSION} starting...")
print(f"⏰ Deployment: {DEPLOYMENT_TIMESTAMP}")

# Get the absolute path to the project root
project_root = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(project_root, 'backend')

print(f"📁 Project root: {project_root}")
print(f"📁 Backend dir: {backend_dir}")

# Verify backend directory exists
if not os.path.exists(backend_dir):
    print(f"❌ Backend directory not found: {backend_dir}")
    print(f"📁 Available files: {os.listdir(project_root)}")
    sys.exit(1)

# Change to backend directory and add to path
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)
sys.path.insert(0, project_root)

print(f"📁 Current dir: {os.getcwd()}")
print(f"📁 Backend files: {os.listdir('.')}")

try:
    # Import the Flask app
    print("🔄 Importing Flask app...")
    from app import app
    
    # Verify auth routes are loaded
    auth_routes = [rule.rule for rule in app.url_map.iter_rules() if '/api/auth' in rule.rule]
    all_routes = [rule.rule for rule in app.url_map.iter_rules()]
    
    print(f"🔐 Auth routes loaded: {len(auth_routes)}")
    print(f"📍 Total routes: {len(all_routes)}")
    
    if len(auth_routes) > 0:
        print("   Auth routes found:")
        for route in auth_routes:
            print(f"     - {route}")
    else:
        print("   ❌ No auth routes found!")
    
    # Check environment
    print(f"🌍 Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"🗄️  Supabase URL: {'✅ Set' if os.environ.get('SUPABASE_URL') else '❌ Missing'}")
    print(f"🔑 Supabase Key: {'✅ Set' if os.environ.get('SUPABASE_ANON_KEY') else '❌ Missing'}")
    print(f"🔐 Secret Key: {'✅ Set' if os.environ.get('SECRET_KEY') else '❌ Missing'}")
    
    # Update app config
    app.config.update({
        'APP_VERSION': APP_VERSION,
        'DEPLOYMENT_TIMESTAMP': DEPLOYMENT_TIMESTAMP
    })
    
    # Start the app
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 Starting Flask server on port {port}")
    print(f"🌐 Health check will be available at: /api/health")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False,
        use_reloader=False,
        threaded=True
    )
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print(f"📁 Python path: {sys.path}")
    print(f"📁 Current directory contents: {os.listdir('.')}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Startup error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
EOF

chmod +x start.py
print_success "Created new start.py with improved diagnostics"

# Step 3: Update railway.json
print_header "Step 3: Updating railway.json"
cat > railway.json << 'EOF'
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install --no-cache-dir -r requirements.txt"
  },
  "deploy": {
    "startCommand": "python start.py",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF
print_success "Updated railway.json with improved configuration"

# Step 4: Add version info to backend/app.py
print_header "Step 4: Adding version tracking to app.py"

# Create a backup and add version info at the top of app.py
if [ -f "backend/app.py" ]; then
    # Check if version info already exists
    if ! grep -q "APP_VERSION = " backend/app.py; then
        # Add version info after imports
        sed -i.bak '/^app = Flask(__name__)/i\
# Version and deployment tracking\
APP_VERSION = "3.4.0"\
DEPLOYMENT_TIMESTAMP = "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"\
print(f"🚀 TypeTutor Backend v{APP_VERSION} initializing...")\
print(f"⏰ Build timestamp: {DEPLOYMENT_TIMESTAMP}")\
' backend/app.py
        
        print_success "Added version tracking to backend/app.py"
    else
        print_info "Version tracking already exists in backend/app.py"
    fi
    
    # Update the health endpoint to include version info
    if ! grep -q "app_version.*APP_VERSION" backend/app.py; then
        # Find and replace the health endpoint
        python3 << 'PYTHON_SCRIPT'
import re

with open('backend/app.py', 'r') as f:
    content = f.read()

# Find the health endpoint and add version info
health_pattern = r"('version': ')[^']*(')"
if re.search(health_pattern, content):
    content = re.sub(health_pattern, r"\g<1>' + APP_VERSION + '\g<2>", content)
    
    with open('backend/app.py', 'w') as f:
        f.write(content)
    print("Updated health endpoint with dynamic version")
else:
    print("Could not find version field in health endpoint")
PYTHON_SCRIPT
    fi
else
    print_error "backend/app.py not found!"
    exit 1
fi

# Step 5: Check Railway CLI
print_header "Step 5: Checking Railway CLI"
if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI not found. Installing..."
    curl -fsSL https://railway.app/install.sh | sh
    
    if ! command -v railway &> /dev/null; then
        print_error "Failed to install Railway CLI"
        exit 1
    fi
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    print_warning "Not logged in to Railway. Please run 'railway login' first"
    exit 1
fi

print_success "Railway CLI ready"

# Step 6: Force clear cache and redeploy
print_header "Step 6: Force redeploying to Railway"

# Create a cache-busting file
echo "# Force rebuild $(date)" > .railway-rebuild
echo "APP_VERSION=3.4.0" >> .railway-rebuild
echo "BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .railway-rebuild

# Commit changes if using git
if [ -d ".git" ]; then
    print_info "Committing changes to git..."
    git add .
    git commit -m "Fix Railway deployment - v3.4.0 with embedded auth" || print_warning "Nothing to commit"
    
    # Push if remote exists
    if git remote | grep -q origin; then
        git push || print_warning "Failed to push to remote"
    fi
fi

print_info "Starting Railway deployment..."
railway up --detach

if [ $? -eq 0 ]; then
    print_success "Deployment initiated successfully!"
else
    print_error "Deployment failed. Check Railway dashboard."
    exit 1
fi

# Step 7: Wait and test deployment
print_header "Step 7: Testing deployment"

print_info "Waiting for deployment to start... (30 seconds)"
sleep 30

print_info "Testing health endpoint..."
for i in {1..10}; do
    echo "Attempt $i/10..."
    
    HEALTH_RESPONSE=$(curl -s --max-time 10 "$RAILWAY_URL/api/health" 2>/dev/null || echo "CURL_FAILED")
    
    if [ "$HEALTH_RESPONSE" != "CURL_FAILED" ]; then
        echo "Response received:"
        echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
        
        # Check if version is correct
        VERSION=$(echo "$HEALTH_RESPONSE" | jq -r '.version // "unknown"' 2>/dev/null)
        AUTH_AVAILABLE=$(echo "$HEALTH_RESPONSE" | jq -r '.auth_available // false' 2>/dev/null)
        
        if [ "$VERSION" = "3.4.0" ] && [ "$AUTH_AVAILABLE" = "true" ]; then
            print_success "Deployment successful! Version 3.4.0 with auth working"
            break
        elif [ "$VERSION" = "3.4.0" ]; then
            print_warning "Version correct but auth not available"
        else
            print_warning "Still deploying... (version: $VERSION)"
        fi
    else
        print_warning "Health endpoint not responding yet..."
    fi
    
    if [ $i -eq 10 ]; then
        print_error "Deployment may have failed. Check Railway logs."
    else
        sleep 20
    fi
done

# Step 8: Test auth endpoints
print_header "Step 8: Testing auth endpoints"

print_info "Testing auth registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPass123","display_name":"Test User"}' \
    2>/dev/null || echo "CURL_FAILED")

if [ "$REGISTER_RESPONSE" != "CURL_FAILED" ]; then
    echo "Registration response:"
    echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"
    
    if echo "$REGISTER_RESPONSE" | grep -q "success.*true\|User created successfully\|already exists"; then
        print_success "Auth registration endpoint working!"
    else
        print_warning "Auth registration may have issues"
    fi
else
    print_error "Could not test registration endpoint"
fi

# Step 9: Summary and next steps
print_header "Deployment Fix Complete!"

echo ""
echo "🎉 Railway deployment fix completed!"
echo ""
echo "📊 What was fixed:"
echo "   ✅ Simplified startup script with better diagnostics"
echo "   ✅ Updated Railway configuration"
echo "   ✅ Added version tracking (3.4.0)"
echo "   ✅ Improved error handling and logging"
echo "   ✅ Force cache clear and redeploy"
echo ""
echo "🔗 Test your deployment:"
echo "   Health: $RAILWAY_URL/api/health"
echo "   Auth Test: $RAILWAY_URL/api/auth/verify"
echo "   Dashboard: https://railway.app/project/a27902d5-dd41-447b-938a-362cce39cfa4"
echo ""
echo "🔍 If issues persist:"
echo "   1. Check Railway logs: railway logs"
echo "   2. Check build logs: railway logs --build"
echo "   3. Monitor deployment: railway status"
echo ""
echo "📁 Backup files saved in: ./backups/"
echo ""

# Final status check
FINAL_HEALTH=$(curl -s --max-time 10 "$RAILWAY_URL/api/health" 2>/dev/null || echo "TIMEOUT")
if [ "$FINAL_HEALTH" != "TIMEOUT" ]; then
    FINAL_VERSION=$(echo "$FINAL_HEALTH" | jq -r '.version // "unknown"' 2>/dev/null)
    FINAL_AUTH=$(echo "$FINAL_HEALTH" | jq -r '.auth_available // false' 2>/dev/null)
    
    if [ "$FINAL_VERSION" = "3.4.0" ] && [ "$FINAL_AUTH" = "true" ]; then
        print_success "🚀 Deployment is working correctly!"
        echo "   Version: $FINAL_VERSION"
        echo "   Auth: Available"
    else
        print_warning "Deployment may still be starting or have issues"
        echo "   Version: $FINAL_VERSION"
        echo "   Auth: $FINAL_AUTH"
    fi
else
    print_warning "Could not verify final status - check Railway dashboard"
fi

echo ""
print_success "Fix script completed. Check the URLs above to verify everything works!"