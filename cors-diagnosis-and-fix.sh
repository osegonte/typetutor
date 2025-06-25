#!/bin/bash

# Complete CORS Diagnosis and Ultimate Fix
# This script will diagnose the exact CORS issue and apply the nuclear option

set -e

echo "🔍 TypeTutor CORS Diagnosis & Ultimate Fix"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_step() { echo -e "${PURPLE}🔧 $1${NC}"; }

BACKEND_URL="https://typetutor-production.up.railway.app"
VERCEL_URL="https://typetutor-gsfx1kg5m-osegontes-projects.vercel.app"

# Step 1: Diagnose current issues
print_step "Step 1: Diagnosing current CORS status..."

print_info "Testing backend health..."
if curl -s "$BACKEND_URL/api/health" > /dev/null; then
    print_status "✅ Backend is responding"
else
    print_error "❌ Backend not responding!"
    exit 1
fi

print_info "Testing CORS headers..."
CORS_HEADERS=$(curl -s -H "Origin: $VERCEL_URL" -I "$BACKEND_URL/api/health" 2>/dev/null || echo "CURL_FAILED")

if [[ "$CORS_HEADERS" == *"access-control-allow-origin"* ]]; then
    print_status "✅ CORS headers are present"
    echo "$CORS_HEADERS" | grep -i "access-control"
else
    print_error "❌ CORS headers missing or Railway hasn't deployed yet"
    print_warning "This means Railway is still using the old code"
fi

print_info "Testing preflight OPTIONS request..."
OPTIONS_RESPONSE=$(curl -s -X OPTIONS -H "Origin: $VERCEL_URL" -H "Access-Control-Request-Method: POST" -I "$BACKEND_URL/api/auth/login" 2>/dev/null || echo "OPTIONS_FAILED")

if [[ "$OPTIONS_RESPONSE" == *"200 OK"* ]] || [[ "$OPTIONS_RESPONSE" == *"204"* ]]; then
    print_status "✅ OPTIONS requests working"
else
    print_error "❌ OPTIONS preflight requests failing"
    echo "Response: $OPTIONS_RESPONSE"
fi

# Step 2: Apply nuclear CORS fix
print_step "Step 2: Applying NUCLEAR CORS fix..."

print_warning "This will completely override ALL CORS settings with maximum compatibility"

# Create backup
BACKUP_FILE="app.py.nuclear-backup-$(date +%s)"
cp app.py "$BACKUP_FILE"
print_status "Backup created: $BACKUP_FILE"

# Nuclear CORS fix
cat > nuclear_cors_fix.py << 'EOF'
import re

with open('app.py', 'r') as f:
    content = f.read()

# Nuclear CORS fix - maximum compatibility
nuclear_cors = '''
# NUCLEAR CORS FIX - Maximum compatibility, allows everything
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

# Initialize CORS with maximum permissive settings
CORS(app, 
     origins="*",
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["*"],
     supports_credentials=False,  # Must be False with wildcard origin
     expose_headers=["*"])

# Override ALL CORS handling
@app.before_request
def nuclear_cors_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

@app.after_request
def nuclear_cors_response(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-User-ID, Accept, Origin"
    response.headers["Access-Control-Expose-Headers"] = "Authorization"
    return response
'''

# Remove ALL existing CORS configurations to avoid conflicts
content = re.sub(r'# EMERGENCY CORS FIX.*?return response', '', content, flags=re.DOTALL)
content = re.sub(r'# UNIVERSAL CORS FIX.*?return response', '', content, flags=re.DOTALL)
content = re.sub(r'# TEMPORARY WILDCARD CORS.*?return response', '', content, flags=re.DOTALL)
content = re.sub(r'@app\.before_request\s+def (?:handle_.*?|nuclear_cors_preflight)\(\):.*?return response', '', content, flags=re.DOTALL)
content = re.sub(r'@app\.after_request\s+def (?:.*?_cors.*?|after_request)\(response\):.*?return response', '', content, flags=re.DOTALL)

# Remove existing CORS() initialization
content = re.sub(r'CORS\(app,.*?\)', '', content, flags=re.DOTALL)

# Remove allowed_origins arrays
content = re.sub(r'allowed_origins = \[.*?\]', '', content, flags=re.DOTALL)

# Find where to insert nuclear CORS
app_creation_pattern = r'(app = Flask\(__name__\).*?\n)'
if re.search(app_creation_pattern, content, re.DOTALL):
    content = re.sub(app_creation_pattern, r'\1' + nuclear_cors + '\n', content, flags=re.DOTALL)
    print("✅ Nuclear CORS added after app creation")
else:
    # Fallback: add after imports
    import_pattern = r'(from flask_cors import CORS\n)'
    if re.search(import_pattern, content):
        content = re.sub(import_pattern, r'\1' + nuclear_cors + '\n', content)
        print("✅ Nuclear CORS added after imports (fallback)")
    else:
        print("❌ Could not find insertion point for nuclear CORS")

# Clean up any duplicate function definitions
lines = content.split('\n')
cleaned_lines = []
in_duplicate_function = False
current_function = None

for line in lines:
    if line.strip().startswith('@app.before_request') or line.strip().startswith('@app.after_request'):
        func_match = re.search(r'def (\w+)\(', line)
        if func_match:
            func_name = func_match.group(1)
            if func_name == current_function:
                in_duplicate_function = True
                continue
            current_function = func_name
    
    if not in_duplicate_function:
        cleaned_lines.append(line)
    
    if in_duplicate_function and line.strip() and not line.startswith(' ') and not line.startswith('\t'):
        in_duplicate_function = False
        cleaned_lines.append(line)

content = '\n'.join(cleaned_lines)

with open('app.py', 'w') as f:
    f.write(content)

print("✅ Nuclear CORS fix applied")
EOF

python3 nuclear_cors_fix.py
rm nuclear_cors_fix.py

print_status "Nuclear CORS configuration applied"

# Step 3: Verify the fix
print_step "Step 3: Verifying nuclear CORS fix..."

if grep -q "nuclear_cors_preflight" app.py; then
    print_status "✅ Nuclear preflight handler added"
else
    print_warning "⚠️ Nuclear preflight handler might be missing"
fi

if grep -q "nuclear_cors_response" app.py; then
    print_status "✅ Nuclear response handler added"
else
    print_warning "⚠️ Nuclear response handler might be missing"
fi

if grep -q 'origins="*"' app.py; then
    print_status "✅ Wildcard origins configured"
else
    print_warning "⚠️ Wildcard origins might not be set"
fi

# Step 4: Show what the nuclear fix does
print_step "Step 4: Nuclear CORS fix details..."
echo ""
print_info "📋 Nuclear CORS changes:"
echo "  • CORS(app, origins='*') - Allow ALL origins"
echo "  • Access-Control-Allow-Methods: '*' - Allow ALL methods"
echo "  • Access-Control-Allow-Headers: '*' - Allow ALL headers"
echo "  • Removed supports_credentials (conflicts with wildcard)"
echo "  • Override ALL preflight OPTIONS requests"
echo "  • Override ALL response headers"
echo "  • Removed ALL existing CORS handlers (clean slate)"
echo ""

# Step 5: Commit and deploy
print_step "Step 5: Deploying nuclear CORS fix..."

git add app.py

git commit -m "nuclear: maximum compatibility CORS fix

🚀 NUCLEAR CORS FIX APPLIED:
- CORS(app, origins='*') allows ALL domains
- Access-Control-Allow-Headers: '*' allows ALL headers
- Access-Control-Allow-Methods: '*' allows ALL methods  
- Override ALL preflight OPTIONS handling
- Override ALL response headers
- Removed ALL conflicting CORS configurations
- Maximum compatibility for any frontend deployment

This should fix:
- Signup/login from any Vercel URL
- File upload from any domain
- Any CORS-related fetch failures

Current failing URL: $VERCEL_URL"

git push origin main

print_status "Nuclear CORS fix deployed to Railway!"

# Step 6: Testing instructions
print_step "Step 6: Testing the nuclear fix..."
echo ""
print_warning "⏳ Wait 2-3 minutes for Railway to deploy"
echo ""
print_info "🧪 Complete test checklist:"
echo ""
echo "1. 📡 Test basic connectivity:"
echo "   fetch('$BACKEND_URL/api/health')"
echo "     .then(r => r.json())"
echo "     .then(d => console.log('✅ API OK:', d))"
echo ""
echo "2. 🔐 Test auth endpoint:"
echo "   fetch('$BACKEND_URL/api/auth/register', {"
echo "     method: 'POST',"
echo "     headers: { 'Content-Type': 'application/json' },"
echo "     body: JSON.stringify({ email: 'test@test.com', password: 'test123' })"
echo "   }).then(r => r.json()).then(d => console.log('Auth response:', d))"
echo ""
echo "3. 📤 Test file upload endpoint:"
echo "   - Try uploading a PDF file through the UI"
echo "   - Should work without CORS errors"
echo ""
echo "4. 👤 Test signup/login:"
echo "   - Create a new account"
echo "   - Login with existing credentials"
echo "   - Should work from: $VERCEL_URL"
echo ""

print_info "🎯 Expected results after 3 minutes:"
echo "✅ Zero CORS errors in browser console"
echo "✅ All fetch() calls successful" 
echo "✅ Signup/login forms working"
echo "✅ File upload working"
echo "✅ All API endpoints accessible"
echo ""

print_warning "📋 If this NUCLEAR fix doesn't work:"
echo "1. Check Railway deployment logs for errors"
echo "2. Try incognito mode (clear browser cache)"
echo "3. Check if Railway service restarted successfully"
echo "4. Verify the /api/health endpoint returns 200 OK"
echo ""

print_status "🚀 Nuclear CORS fix completed!"
print_warning "This allows requests from ANY domain - replace with secure CORS after testing"
print_info "Backup saved as: $BACKUP_FILE"

# Final verification
print_step "Step 7: Quick verification..."
echo ""
if command -v curl &> /dev/null; then
    print_info "Testing Railway deployment status..."
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
    if [ "$HTTP_STATUS" = "200" ]; then
        print_status "✅ Railway backend responding (HTTP $HTTP_STATUS)"
    else
        print_error "❌ Railway backend issue (HTTP $HTTP_STATUS)"
    fi
    
    print_info "Testing auth endpoint availability..."
    AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/auth/register")
    if [ "$AUTH_STATUS" = "400" ] || [ "$AUTH_STATUS" = "405" ]; then
        print_status "✅ Auth endpoint responding (HTTP $AUTH_STATUS - expected)"
    else
        print_warning "⚠️ Auth endpoint status: HTTP $AUTH_STATUS"
    fi
fi

echo ""
echo "🎉 NUCLEAR CORS FIX DEPLOYMENT COMPLETE!"
echo ""
print_warning "⏰ TEST IN 3 MINUTES:"
echo "🔗 Go to: $VERCEL_URL"
echo "🧪 Try signup, login, and file upload"
echo "📊 Check browser console for CORS errors (should be ZERO)"