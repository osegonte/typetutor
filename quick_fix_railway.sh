#!/bin/bash
# Quick fix Railway CORS and redeploy

echo "🔧 Quick Fix: Railway CORS Issue"
echo "================================="

# Step 1: Get Railway URL first
echo "1. Getting Railway URL..."
railway_url=$(railway domain 2>/dev/null)

if [ ! -z "$railway_url" ]; then
    echo "✅ Railway URL: https://$railway_url"
    export RAILWAY_URL="https://$railway_url"
else
    echo "❌ Could not get Railway URL automatically"
    echo "💡 Check your Railway dashboard: railway open"
    echo "💡 Or run: railway domain"
    echo ""
    echo "Continue anyway? (y/N)"
    read -r continue_anyway
    if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 2: Update CORS environment variable
echo ""
echo "2. Setting CORS environment variables..."

# Set a temporary permissive CORS for debugging
railway variables set FLASK_CORS_ORIGINS="*"
railway variables set CORS_DEBUG="true"

echo "✅ CORS variables set"

# Step 3: Quick commit and redeploy
echo ""
echo "3. Preparing for redeployment..."

# Add a comment to force rebuild
echo "# CORS fix - $(date)" >> rebuild.txt

# Commit changes
git add .
git commit -m "Fix CORS for Railway deployment - $(date)"

echo "✅ Changes committed"

# Step 4: Deploy
echo ""
echo "4. Redeploying to Railway..."
echo "⏳ This will take a few minutes..."

railway up --detach

echo ""
echo "5. Waiting for deployment to complete..."
sleep 30

# Step 5: Test the deployment
echo ""
echo "6. Testing fixed deployment..."

if [ ! -z "$railway_url" ]; then
    echo ""
    echo "Testing CORS headers..."
    curl -I -X OPTIONS "https://$railway_url/api/health" \
        -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: GET" \
        2>/dev/null | grep -i "access-control"
    
    echo ""
    echo "Testing health endpoint..."
    curl -s "https://$railway_url/api/health" | grep -E "(status|cors)" | head -3
    
    echo ""
    echo "🎉 Quick Fix Applied!"
    echo ""
    echo "📋 Test your frontend with:"
    echo "   API URL: https://$railway_url/api"
    echo ""
    echo "🧪 Test CORS manually:"
    echo "   curl -X GET 'https://$railway_url/api/health' \\"
    echo "        -H 'Origin: http://localhost:5173'"
    echo ""
    echo "If still having issues:"
    echo "1. Check Railway logs: railway logs"
    echo "2. Check frontend console for specific error"
    echo "3. Verify frontend API URL matches: https://$railway_url/api"
    
else
    echo ""
    echo "⚠️  Could not auto-test. Please:"
    echo "1. Get your Railway URL: railway domain"
    echo "2. Update your frontend API_URL"
    echo "3. Test the connection"
fi

echo ""
echo "🚀 Deployment should be ready!"
echo "Check Railway dashboard: railway open"