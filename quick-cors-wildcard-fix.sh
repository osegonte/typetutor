#!/bin/bash

# Quick CORS Wildcard Fix for TypeTutor
# This applies a temporary wildcard CORS to allow ALL origins
# Use this for immediate testing while we fix the universal solution

set -e

echo "⚡ Quick CORS Wildcard Fix"
echo "=========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check if app.py exists
if [ ! -f "app.py" ]; then
    print_error "app.py not found! Run this script from the project root."
    exit 1
fi

print_info "Current Vercel URL causing issues: typetutor-gsfx1kg5m-osegontes-projects.vercel.app"
print_warning "Applying temporary wildcard CORS to allow ALL origins"

# Create backup
BACKUP_FILE="app.py.wildcard-backup-$(date +%s)"
cp app.py "$BACKUP_FILE"
print_status "Backup created: $BACKUP_FILE"

# Apply wildcard CORS fix
print_info "Adding temporary wildcard CORS..."

cat > wildcard_fix.py << 'EOF'
import re

with open('app.py', 'r') as f:
    content = f.read()

# Temporary wildcard CORS fix
wildcard_cors = '''
# TEMPORARY WILDCARD CORS - Allows ALL origins for testing
@app.after_request
def temp_wildcard_cors(response):
    origin = request.headers.get('Origin', '')
    print(f"🔍 Request from origin: {origin}")
    
    # Allow any origin temporarily
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-User-ID"
    response.headers["Access-Control-Allow-Credentials"] = "false"  # Note: must be false with wildcard
    
    print(f"✅ CORS headers set for origin: {origin}")
    return response

# Enhanced OPTIONS handling
@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-User-ID"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response
'''

# Remove any existing after_request handlers to avoid conflicts
content = re.sub(r'@app\.after_request\s+def (?:after_request|temp_wildcard_cors)\(response\):.*?return response', '', content, flags=re.DOTALL)
content = re.sub(r'@app\.before_request\s+def (?:handle_preflight|handle_options|handle_cors)\(\):.*?return response', '', content, flags=re.DOTALL)

# Add the wildcard CORS before main execution
main_pattern = r'if __name__ == \'__main__\':\s*'
if re.search(main_pattern, content):
    content = re.sub(main_pattern, wildcard_cors + '\n\n' + r'if __name__ == \'__main__\':', content)
    print("✅ Wildcard CORS added before main execution")
else:
    # Fallback: add at end of file
    content = content.rstrip() + '\n\n' + wildcard_cors + '\n'
    print("✅ Wildcard CORS added at end of file")

# Write the updated content
with open('app.py', 'w') as f:
    f.write(content)

print("✅ Wildcard CORS fix applied")
EOF

python3 wildcard_fix.py
rm wildcard_fix.py

print_status "Wildcard CORS applied to app.py"

# Verify the changes
if grep -q "temp_wildcard_cors" app.py; then
    print_status "✅ Wildcard CORS function added"
else
    print_error "❌ Wildcard CORS might not have been added"
fi

if grep -q "handle_options" app.py; then
    print_status "✅ OPTIONS handler added"
else
    print_error "❌ OPTIONS handler might not have been added"
fi

# Show what was added
print_info "📝 Changes made:"
echo "  • Added temp_wildcard_cors() function"
echo "  • Added handle_options() for preflight requests"
echo "  • Set Access-Control-Allow-Origin to '*'"
echo "  • Removed any conflicting CORS handlers"

# Commit and push
print_info "Committing wildcard CORS fix..."

git add app.py

git commit -m "temp: wildcard CORS for immediate testing

⚡ Quick Fix Applied:
- Added temporary wildcard CORS (Access-Control-Allow-Origin: *)
- Enhanced OPTIONS preflight handling
- Allows requests from ANY origin (including new Vercel URLs)
- Debug logging for origin detection

Current failing URL: typetutor-gsfx1kg5m-osegontes-projects.vercel.app
This is a TEMPORARY fix for testing - replace with proper CORS later"

git push origin main

print_status "Wildcard fix pushed to Railway!"

echo ""
print_warning "🚨 IMPORTANT: This is a TEMPORARY fix!"
print_info "Wildcard CORS (*) allows requests from ANY website"
print_warning "Replace with proper domain-specific CORS after testing"
echo ""

print_info "⏳ Wait 2 minutes for Railway deployment, then test:"
echo ""
print_info "🧪 Test in browser console at your Vercel site:"
echo "fetch('https://typetutor-production.up.railway.app/api/health')"
echo "  .then(r => r.json())"
echo "  .then(d => console.log('✅ WILDCARD CORS WORKING!', d))"
echo ""

print_info "🔗 Test URLs:"
echo "• https://typetutor-gsfx1kg5m-osegontes-projects.vercel.app (current)"
echo "• https://typetutor-nhvu62hto-osegontes-projects.vercel.app (previous)"
echo "• Any other Vercel preview URL"
echo ""

print_warning "📋 After testing works:"
echo "1. Login/signup should work from ANY Vercel URL"
echo "2. No more CORS errors in browser console"
echo "3. All API calls should succeed"
echo ""

print_warning "🔄 Next step: Replace with secure CORS"
echo "Once confirmed working, run a proper CORS fix that only allows your domains"

print_status "🚀 Wildcard CORS fix completed!"
print_info "Backup saved as: $BACKUP_FILE"

# Quick API test
if command -v curl &> /dev/null; then
    echo ""
    print_info "🧪 Quick API test..."
    
    if curl -s https://typetutor-production.up.railway.app/api/health > /dev/null; then
        print_status "✅ API is responding"
    else
        print_error "❌ API not responding"
    fi
else
    print_info "curl not available for API test"
fi

echo ""
echo "🎯 Expected result after 2 minutes:"
echo "✅ CORS errors completely gone"
echo "✅ Login/signup working from Vercel"
echo "✅ All API endpoints accessible"