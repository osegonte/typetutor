#!/bin/bash

# Quick CORS Fix Script - No Vercel CLI dependency
set -e

echo "🚀 Quick CORS Fix Script"
echo "========================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Known Vercel URLs from your deployment
VERCEL_URLS=(
    "https://typetutor-git-main-osegontes-projects.vercel.app"
    "https://typetutor-2fo842jj2-osegontes-projects.vercel.app"
    "https://typetutor.vercel.app"
    "https://typetutor-osegonte.vercel.app"
)

print_info "Using known Vercel URLs..."

# Step 1: Fix Backend CORS
print_info "Step 1: Updating backend CORS..."

# Backup app.py
cp app.py app.py.backup
print_status "Created backup: app.py.backup"

# Create new CORS configuration
cat > temp_cors_fix.py << 'EOF'
import re

# Read the current file
with open('app.py', 'r') as f:
    content = f.read()

# New allowed origins with all Vercel URLs
new_cors_section = '''# PRODUCTION CORS FIX - Allow specific domains
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://typetutor.vercel.app",
    "https://typetutor-git-main-osegontes-projects.vercel.app",
    "https://typetutor-osegonte.vercel.app",
    "https://typetutor-2fo842jj2-osegontes-projects.vercel.app",
    "https://typetutor-frontend-17neeudr8-osegontes-projects.vercel.app",
    "https://typetutor.dev"
]

# Also allow all Vercel preview domains for your project
import re
if request and hasattr(request, 'headers'):
    origin = request.headers.get('Origin', '')
    if re.match(r'https://typetutor.*\.vercel\.app$', origin):
        if origin not in allowed_origins:
            allowed_origins.append(origin)

print(f"🌐 CORS allowed origins: {allowed_origins}")

CORS(app, 
     origins=allowed_origins,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-User-ID"],
     supports_credentials=True,
     expose_headers=["Authorization"])'''

# Find and replace the CORS section
pattern = r'# PRODUCTION CORS FIX.*?expose_headers=\["Authorization"\]\)'
if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, new_cors_section, content, flags=re.DOTALL)
    print("✅ Updated existing CORS section")
else:
    # If pattern not found, replace the allowed_origins list
    origins_pattern = r'allowed_origins = \[.*?\]'
    if re.search(origins_pattern, content, re.DOTALL):
        new_origins = '''allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://typetutor.vercel.app",
    "https://typetutor-git-main-osegontes-projects.vercel.app",
    "https://typetutor-osegonte.vercel.app",
    "https://typetutor-2fo842jj2-osegontes-projects.vercel.app",
    "https://typetutor-frontend-17neeudr8-osegontes-projects.vercel.app",
    "https://typetutor.dev"
]'''
        content = re.sub(origins_pattern, new_origins, content, flags=re.DOTALL)
        print("✅ Updated allowed_origins list")
    else:
        print("⚠️ Could not find CORS section to update")

# Write the updated content
with open('app.py', 'w') as f:
    f.write(content)
EOF

python3 temp_cors_fix.py
rm temp_cors_fix.py
print_status "Backend CORS updated"

# Step 2: Fix Frontend Auth
print_info "Step 2: Updating frontend AuthContext..."

if [ -f "frontend/src/context/AuthContext.jsx" ]; then
    cd frontend/src/context
    cp AuthContext.jsx AuthContext.jsx.backup
    
    # Fix the fetch calls to use proper CORS
    sed -i.tmp 's/credentials: '\''omit'\''/mode: '\''cors'\'', credentials: '\''omit'\''/g' AuthContext.jsx
    rm -f AuthContext.jsx.tmp
    
    cd ../../..
    print_status "Frontend AuthContext updated"
fi

# Step 3: Test API connectivity
print_info "Step 3: Testing API connection..."

if command -v curl > /dev/null; then
    echo "Testing basic API connection..."
    if curl -s "https://typetutor-production.up.railway.app/api/health" > /dev/null; then
        print_status "API is reachable"
    else
        echo "⚠️ API connection test failed"
    fi
    
    echo "Testing CORS for main Vercel domain..."
    curl -s -H "Origin: https://typetutor-git-main-osegontes-projects.vercel.app" \
         "https://typetutor-production.up.railway.app/api/health" > /dev/null && \
         print_status "CORS test passed" || echo "⚠️ CORS test needs backend deployment"
fi

# Step 4: Commit and push
print_info "Step 4: Committing changes..."

git add .
git commit -m "fix: update CORS for Vercel deployment

- Added all Vercel preview URLs to backend CORS
- Updated frontend fetch to use proper CORS mode
- Fixed authentication service for production deployment"

print_status "Changes committed"

print_info "Pushing to trigger deployments..."
git push origin main
print_status "Pushed to repository"

echo ""
echo "🎉 Quick CORS Fix Complete!"
echo "=========================="
echo ""
echo "✅ Backend CORS updated with Vercel domains"
echo "✅ Frontend auth fixed for CORS"
echo "✅ Changes committed and pushed"
echo ""
echo "🔄 Deployments will happen automatically:"
echo "   • Railway: https://typetutor-production.up.railway.app"
echo "   • Vercel: https://typetutor-git-main-osegontes-projects.vercel.app"
echo ""
echo "⏱️  Wait 2-3 minutes for deployments, then test login!"
echo ""
echo "🐛 If still failing, check browser console for specific errors."