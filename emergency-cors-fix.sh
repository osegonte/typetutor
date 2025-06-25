#!/bin/bash

# TypeTutor Emergency CORS Fix Script
# Fixes "No 'Access-Control-Allow-Origin' header" error
# Usage: chmod +x emergency-cors-fix.sh && ./emergency-cors-fix.sh

set -e  # Exit on any error

echo "🚨 TypeTutor Emergency CORS Fix"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_step() { echo -e "${PURPLE}🔧 $1${NC}"; }

# Configuration
VERCEL_URL="https://typetutor-nhvu62hto-osegontes-projects.vercel.app"
BACKEND_URL="https://typetutor-production.up.railway.app"
APP_FILE="app.py"

# Validate we're in the right directory
if [ ! -f "$APP_FILE" ]; then
    print_error "app.py not found! Please run this script from the project root directory."
    exit 1
fi

print_info "Current Vercel URL: $VERCEL_URL"
print_info "Backend URL: $BACKEND_URL"
echo ""

# Step 1: Create backup
print_step "Step 1: Creating backup..."
BACKUP_FILE="app.py.emergency-backup-$(date +%s)"
cp "$APP_FILE" "$BACKUP_FILE"
print_status "Backup created: $BACKUP_FILE"

# Step 2: Check current CORS configuration
print_step "Step 2: Checking current CORS configuration..."
if grep -q "$VERCEL_URL" "$APP_FILE"; then
    print_warning "Vercel URL already in CORS config, but headers might not be working"
else
    print_error "Vercel URL missing from CORS config"
fi

# Step 3: Apply comprehensive CORS fix
print_step "Step 3: Applying comprehensive CORS fix..."

# Create the emergency CORS fix
cat > temp_cors_fix.py << EOF
import re

# Read the current app.py file
with open('$APP_FILE', 'r') as f:
    content = f.read()

# Ensure necessary imports are present
imports_needed = ['make_response']
flask_import_pattern = r'from flask import ([^\\n]+)'
flask_import_match = re.search(flask_import_pattern, content)

if flask_import_match:
    current_imports = flask_import_match.group(1)
    new_imports = current_imports
    
    for imp in imports_needed:
        if imp not in current_imports:
            new_imports += f', {imp}'
    
    content = content.replace(flask_import_match.group(0), f'from flask import {new_imports}')
    print(f"✅ Updated Flask imports: {new_imports}")

# Updated allowed origins with your Vercel URL
new_allowed_origins = '''# EMERGENCY CORS FIX - Updated origins
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://typetutor.vercel.app",
    "https://typetutor-git-main-osegontes-projects.vercel.app",
    "https://typetutor-osegonte.vercel.app",
    "https://typetutor-2fo842jj2-osegontes-projects.vercel.app",
    "https://typetutor-frontend-17neeudr8-osegontes-projects.vercel.app",
    "https://typetutor-nhvu62hto-osegontes-projects.vercel.app",
    "https://typetutor.dev"
]'''

# Replace allowed_origins
origins_pattern = r'# PRODUCTION CORS FIX.*?allowed_origins = \\[.*?\\]'
if re.search(origins_pattern, content, re.DOTALL):
    content = re.sub(origins_pattern, new_allowed_origins, content, flags=re.DOTALL)
    print("✅ Replaced existing allowed_origins")
else:
    # Fallback: just replace the array
    simple_pattern = r'allowed_origins = \\[.*?\\]'
    if re.search(simple_pattern, content, re.DOTALL):
        content = re.sub(simple_pattern, new_allowed_origins.split('\\n', 1)[1], content, flags=re.DOTALL)
        print("✅ Updated allowed_origins array")

# Add enhanced preflight handler
enhanced_preflight = '''
# Enhanced preflight request handling
@app.before_request
def handle_preflight():
    origin = request.headers.get('Origin', '')
    
    # Debug logging
    if origin:
        print(f"🔍 Request from origin: {origin}")
    
    # Auto-add Vercel domains
    if origin and 'typetutor' in origin and 'vercel.app' in origin:
        if origin not in allowed_origins:
            allowed_origins.append(origin)
            print(f"🌐 Auto-added Vercel origin: {origin}")
    
    if request.method == "OPTIONS":
        response = make_response()
        # Allow the specific origin or wildcard for development
        allowed_origin = origin if origin in allowed_origins else "*"
        response.headers.add("Access-Control-Allow-Origin", allowed_origin)
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization,X-User-ID")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add('Access-Control-Allow-Credentials', "true")
        return response
'''

# Add after the allowed_origins definition
insertion_point = content.find('print(f"🌐 CORS allowed origins: {allowed_origins}")')
if insertion_point != -1:
    # Insert before the print statement
    content = content[:insertion_point] + enhanced_preflight + '\\n' + content[insertion_point:]
    print("✅ Added enhanced preflight handler")
else:
    # Fallback: add after CORS initialization
    cors_init_pattern = r'CORS\\(app,.*?\\)'
    if re.search(cors_init_pattern, content, re.DOTALL):
        content = re.sub(cors_init_pattern, lambda m: m.group(0) + enhanced_preflight, content, flags=re.DOTALL)
        print("✅ Added preflight handler after CORS init")

# Add additional after_request handler for extra security
after_request_handler = '''
# Additional CORS headers for all responses
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin', '')
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    elif origin and 'typetutor' in origin and 'vercel.app' in origin:
        response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-ID')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response
'''

# Check if after_request already exists
if '@app.after_request' not in content:
    # Add before the main execution block
    main_pattern = r'if __name__ == \'__main__\':\\s*'
    if re.search(main_pattern, content):
        content = re.sub(main_pattern, after_request_handler + '\\n\\n' + r'if __name__ == \'__main__\':', content)
        print("✅ Added after_request handler")

# Write the updated content
with open('$APP_FILE', 'w') as f:
    f.write(content)

print("✅ Emergency CORS fix applied successfully")
EOF

# Execute the Python fix
python3 temp_cors_fix.py
rm temp_cors_fix.py

print_status "CORS configuration updated"

# Step 4: Verify the changes
print_step "Step 4: Verifying CORS changes..."

if grep -q "$VERCEL_URL" "$APP_FILE"; then
    print_status "✅ Vercel URL found in allowed_origins"
else
    print_error "❌ Vercel URL still missing - adding manually..."
    
    # Manual fallback addition
    sed -i.tmp "/\"https:\/\/typetutor\.dev\"/a\\    \"$VERCEL_URL\"," "$APP_FILE"
    rm -f "$APP_FILE.tmp"
    
    if grep -q "$VERCEL_URL" "$APP_FILE"; then
        print_status "✅ Manually added Vercel URL"
    else
        print_error "❌ Manual addition failed"
    fi
fi

if grep -q "@app.before_request" "$APP_FILE"; then
    print_status "✅ Enhanced preflight handler added"
else
    print_warning "⚠️ Preflight handler might not have been added"
fi

if grep -q "@app.after_request" "$APP_FILE"; then
    print_status "✅ After-request handler added"
else
    print_warning "⚠️ After-request handler might not have been added"
fi

# Step 5: Show what was changed
print_step "Step 5: Summary of changes made..."
echo ""
print_info "Changes applied to $APP_FILE:"
echo "  • Added/updated Flask imports (make_response)"
echo "  • Updated allowed_origins with your Vercel URL"
echo "  • Added enhanced preflight OPTIONS handler"
echo "  • Added after_request CORS headers"
echo "  • Added auto-detection for Vercel domains"
echo ""

# Step 6: Commit and push changes
print_step "Step 6: Committing and deploying changes..."

# Check if git is available and we're in a git repo
if command -v git &> /dev/null && [ -d ".git" ]; then
    git add "$APP_FILE"
    
    git commit -m "emergency: comprehensive CORS fix for Vercel deployment

🚨 CORS Emergency Fix Applied:
- Added $VERCEL_URL to allowed_origins
- Enhanced preflight OPTIONS request handling
- Added auto-detection for Vercel domains
- Added comprehensive CORS headers to all responses
- Fixed 'No Access-Control-Allow-Origin header' error

Fixes:
- TypeError: Failed to fetch
- CORS policy blocking requests
- Missing Access-Control-Allow-Origin header"

    print_status "Changes committed to git"
    
    # Push changes
    print_info "Pushing to trigger Railway deployment..."
    if git push origin main; then
        print_status "Successfully pushed to repository"
    else
        print_error "Failed to push to repository"
        print_warning "You may need to push manually: git push origin main"
    fi
else
    print_warning "Git not available or not in a git repository"
    print_info "Please manually commit and push the changes to trigger deployment"
fi

# Step 7: Instructions for testing
print_step "Step 7: Testing instructions..."
echo ""
print_warning "⏳ WAIT 2-3 MINUTES for Railway to deploy the changes"
echo ""
print_info "🧪 Test in browser console (paste this at $VERCEL_URL):"
echo ""
echo "fetch('$BACKEND_URL/api/health')"
echo "  .then(r => r.json())"
echo "  .then(d => console.log('✅ CORS FIXED!', d))"
echo "  .catch(e => console.error('❌ Still broken:', e));"
echo ""
print_info "🔗 Test login flow:"
echo "1. Go to: $VERCEL_URL"
echo "2. Click 'Sign Up' or 'Sign In'"
echo "3. Try creating an account or logging in"
echo "4. Should work without 'Failed to fetch' errors"
echo ""

# Step 8: Monitoring and troubleshooting
print_step "Step 8: Monitoring & troubleshooting..."
echo ""
print_info "📊 Monitor deployment:"
echo "• Railway Dashboard: https://railway.app/dashboard"
echo "• Health Check: $BACKEND_URL/api/health"
echo "• Deployment logs for any errors"
echo ""
print_info "🔍 If still not working:"
echo "• Try incognito/private browsing mode"
echo "• Check browser console for different error messages"
echo "• Verify Railway deployment completed successfully"
echo "• Check if Railway service is running"
echo ""

print_info "📋 Backup file created: $BACKUP_FILE"
print_warning "Keep this backup in case you need to rollback"
echo ""

print_status "🚀 Emergency CORS fix completed!"
print_warning "⏰ Test again in 2-3 minutes after Railway redeploys"

# Optional: Test API immediately
print_step "Step 9: Quick API test..."
if command -v curl &> /dev/null; then
    echo ""
    print_info "Testing API connectivity..."
    
    if curl -s "$BACKEND_URL/api/health" > /dev/null; then
        print_status "✅ Backend API is responding"
    else
        print_error "❌ Backend API not responding"
    fi
    
    print_info "Testing CORS headers..."
    CORS_TEST=$(curl -s -H "Origin: $VERCEL_URL" -I "$BACKEND_URL/api/health" | grep -i "access-control-allow-origin" || echo "not found")
    if [ "$CORS_TEST" != "not found" ]; then
        print_status "✅ CORS headers present: $CORS_TEST"
    else
        print_warning "⚠️ CORS headers not found yet (might need deployment)"
    fi
else
    print_info "curl not available - skipping API test"
fi

echo ""
echo "🎉 Emergency CORS fix script completed!"
echo "📧 If you still have issues, check the Railway deployment logs"
echo "🐛 For debugging, check browser console for specific error messages"