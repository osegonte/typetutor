#!/bin/bash
echo "🧪 Quick TypeTutor Test"
echo "======================"

# Test backend
echo "Testing backend..."
if curl -s http://localhost:5001/api/health >/dev/null 2>&1; then
    echo "✅ Backend is running on port 5001"
else
    echo "❌ Backend is not running"
    echo "   Start with: ./start_backend.sh"
fi

# Test frontend  
echo "Testing frontend..."
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "✅ Frontend is running on port 5173"
else
    echo "❌ Frontend is not running"
    echo "   Start with: ./start_frontend.sh"
fi

echo ""
echo "🌐 URLs:"
echo "   Backend API: http://localhost:5001/api/health"
echo "   Frontend:    http://localhost:5173"
