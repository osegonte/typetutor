#!/bin/bash

echo "🧪 Testing TypeTutor Deployment"
echo "==============================="

API_URL="https://typetutor-production.up.railway.app/api"
FRONTEND_URL="https://typetutor-git-main-osegontes-projects.vercel.app"

echo "1. Testing backend health..."
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Backend is healthy"
    echo "   Version: $(echo "$HEALTH_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)"
else
    echo "❌ Backend health check failed"
    echo "   Response: $HEALTH_RESPONSE"
fi

echo ""
echo "2. Testing CORS for Vercel..."
CORS_TEST=$(curl -s -w "%{http_code}" -H "Origin: $FRONTEND_URL" "$API_URL/health" -o /dev/null)
if [ "$CORS_TEST" = "200" ]; then
    echo "✅ CORS is working for Vercel"
else
    echo "❌ CORS test failed (Status: $CORS_TEST)"
fi

echo ""
echo "3. Testing stats endpoint..."
STATS_TEST=$(curl -s "$API_URL/stats")
if echo "$STATS_TEST" | grep -q "averageWpm"; then
    echo "✅ Stats endpoint working"
else
    echo "❌ Stats endpoint failed"
fi

echo ""
echo "4. Testing frontend..."
FRONTEND_TEST=$(curl -s -w "%{http_code}" "$FRONTEND_URL" -o /dev/null)
if [ "$FRONTEND_TEST" = "200" ]; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend test failed (Status: $FRONTEND_TEST)"
fi

echo ""
echo "🔗 Manual Test URLs:"
echo "   Backend Health: $API_URL/health"
echo "   Frontend: $FRONTEND_URL"
echo ""
echo "🧪 Browser Console Test:"
echo "   fetch('$API_URL/health').then(r=>r.json()).then(console.log)"
