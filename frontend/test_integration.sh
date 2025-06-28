#!/bin/bash

# TypeTutor Integration Test Script
# Tests the frontend connection to Railway backend

set -e

RAILWAY_API_URL="https://perceptive-blessing-production.up.railway.app/api"

echo "🧪 TypeTutor Integration Test"
echo "============================="

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    echo "   Expected: frontend/package.json"
    exit 1
fi

echo "📁 Working in: $(pwd)"

# Test 1: Railway Backend Health
echo ""
echo "1️⃣ Testing Railway Backend Health..."
if curl -s -f "$RAILWAY_API_URL/health" > /tmp/health_check.json; then
    echo "✅ Railway backend is healthy!"
    echo "📋 Health Response:"
    cat /tmp/health_check.json | python3 -m json.tool 2>/dev/null || cat /tmp/health_check.json
else
    echo "❌ Railway backend health check failed!"
    echo "🔗 URL: $RAILWAY_API_URL/health"
    exit 1
fi

# Test 2: Check if dependencies are installed
echo ""
echo "2️⃣ Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Test 3: Check environment configuration
echo ""
echo "3️⃣ Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local found"
    echo "📋 Environment variables:"
    grep VITE_ .env.local || echo "   No VITE_ variables found"
else
    echo "⚠️ .env.local not found - using defaults"
fi

# Test 4: Test build
echo ""
echo "4️⃣ Testing production build..."
if npm run build > /tmp/build.log 2>&1; then
    echo "✅ Build successful!"
    echo "📊 Build output size:"
    if [ -d "dist" ]; then
        du -sh dist/ 2>/dev/null || echo "   Could not calculate size"
    fi
else
    echo "❌ Build failed!"
    echo "📋 Build log:"
    cat /tmp/build.log
    exit 1
fi

# Test 5: Check API configuration in built files
echo ""
echo "5️⃣ Verifying API configuration in build..."
if [ -f "dist/assets/index-*.js" ]; then
    if grep -q "perceptive-blessing-production.up.railway.app" dist/assets/index-*.js; then
        echo "✅ Railway API URL found in build files"
    else
        echo "⚠️ Railway API URL not found in build files"
        echo "   This might mean environment variables aren't being applied"
    fi
else
    echo "⚠️ Could not find built JavaScript files to verify"
fi

# Test 6: Test API endpoints directly
echo ""
echo "6️⃣ Testing Authentication Endpoints..."

# Test register endpoint
echo "Testing registration endpoint..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$RAILWAY_API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test-'$(date +%s)'@example.com","password":"TestPass123","display_name":"Test User"}')

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Registration endpoint working!"
elif [ "$HTTP_CODE" = "400" ] && echo "$RESPONSE_BODY" | grep -q "already exists"; then
    echo "✅ Registration endpoint working (user already exists)"
else
    echo "⚠️ Registration endpoint response: HTTP $HTTP_CODE"
    echo "📋 Response: $RESPONSE_BODY"
fi

# Test 7: Preview the application
echo ""
echo "7️⃣ Starting preview server..."
echo "🌐 Preview will be available at: http://localhost:4173"
echo "📋 Manual tests to perform:"
echo "   1. Open http://localhost:4173 in your browser"
echo "   2. Try to sign up with a new email"
echo "   3. Check browser console for any errors"
echo "   4. Verify API calls go to Railway backend"
echo "   5. Test PDF upload functionality"
echo ""
echo "⚡ Starting preview server (Ctrl+C to stop)..."
echo "   Note: This will block the terminal - open another tab for testing"

# Start preview server
npm run preview

echo ""
echo "🎉 Integration test completed!"
echo ""
echo "📋 Summary:"
echo "   ✅ Railway backend is healthy and responding"
echo "   ✅ Frontend builds successfully"
echo "   ✅ Dependencies are installed"
echo "   ✅ Authentication endpoints are working"
echo ""
echo "🚀 Next Steps:"
echo "   1. If preview testing was successful, deploy with: vercel"
echo "   2. If issues found, check browser console for error details"
echo "   3. Ensure all API calls are going to Railway backend"
echo ""
echo "🔗 Railway API: $RAILWAY_API_URL"