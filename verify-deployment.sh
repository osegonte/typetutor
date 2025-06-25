#!/bin/bash

echo "🔍 Verifying Deployment Status"
echo "=============================="

# Check Railway deployment
echo "1. Testing Railway backend..."
echo "Health endpoint:"
curl -s "https://typetutor-production.up.railway.app/api/health" | grep -o '"status":"[^"]*"' || echo "❌ Backend not responding"

echo ""
echo "Auth endpoint (should return error but respond):"
curl -s -w "Status: %{http_code}\n" "https://typetutor-production.up.railway.app/api/auth/login" -X POST -H "Content-Type: application/json" -d '{}' -o /dev/null

echo ""
echo "2. Testing CORS for your Vercel domain..."
CORS_RESPONSE=$(curl -s -w "Status: %{http_code}" -H "Origin: https://typetutor-git-main-osegontes-projects.vercel.app" "https://typetutor-production.up.railway.app/api/health" -o /dev/null)
echo "CORS test: $CORS_RESPONSE"

echo ""
echo "3. Checking if backend has latest CORS config..."
if grep -q "typetutor-git-main-osegontes-projects.vercel.app" app.py; then
    echo "✅ Backend has Vercel domain in CORS config"
else
    echo "❌ Backend missing Vercel domain - fixing now..."
    
    # Quick inline fix
    cp app.py app.py.backup2
    sed -i.tmp 's/"https:\/\/typetutor\.dev"/"https:\/\/typetutor.dev",\
    "https:\/\/typetutor-git-main-osegontes-projects.vercel.app",\
    "https:\/\/typetutor-2fo842jj2-osegontes-projects.vercel.app"/g' app.py
    
    echo "✅ Fixed CORS config"
    git add app.py
    git commit -m "fix: ensure Vercel domains in CORS"
    git push origin main
    echo "✅ Pushed fix - wait 2 minutes for Railway to redeploy"
fi

echo ""
echo "4. Testing Vercel deployment..."
if command -v curl > /dev/null; then
    VERCEL_STATUS=$(curl -s -w "%{http_code}" "https://typetutor-git-main-osegontes-projects.vercel.app" -o /dev/null)
    echo "Vercel status: $VERCEL_STATUS"
    
    if [ "$VERCEL_STATUS" = "200" ]; then
        echo "✅ Vercel deployment is live"
    else
        echo "❌ Vercel deployment issue"
    fi
fi

echo ""
echo "🔧 Manual Debug Commands:"
echo "----------------------------------------"
echo "Test from browser console:"
echo "fetch('https://typetutor-production.up.railway.app/api/health')"
echo ""
echo "Check Railway logs:"
echo "https://railway.app/dashboard (check your project logs)"
echo ""
echo "Check Vercel logs:"
echo "https://vercel.com/dashboard (check deployment logs)"
echo ""
echo "If still failing after 5 minutes, the issue might be:"
echo "1. Environment variable not set correctly in Vercel"
echo "2. Railway deployment didn't pick up CORS changes"
echo "3. Browser cache (try incognito mode)"