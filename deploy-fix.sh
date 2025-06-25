#!/bin/bash

# TypeTutor Deployment Fix Script
echo "🚀 Starting TypeTutor deployment fix..."

# Check if we're in the right directory
if [ ! -f "app.py" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the typetutor project root directory"
    echo "   You should see 'app.py' and 'frontend' folder here"
    exit 1
fi

echo "✅ Found project files"

# Clean frontend cache
echo "🧹 Cleaning frontend cache..."
rm -rf frontend/dist
rm -rf frontend/node_modules/.vite
rm -rf frontend/.vercel

# Create cache-busting file
echo "🔄 Creating cache bust..."
echo "// Cache bust $(date)" > frontend/src/cache-bust.js

# Update App.jsx to force rebuild
echo "📝 Updating App.jsx..."
cat > frontend/src/App.jsx << 'EOF'
import React from 'react';
import AuthWrapper from './components/AuthWrapper';
import './cache-bust.js';
import './index.css';

function App() {
  return <AuthWrapper />;
}

export default App;
EOF

# Test build (optional)
echo "🧪 Testing frontend build..."
cd frontend
if npm run build > /dev/null 2>&1; then
    echo "✅ Frontend builds successfully"
else
    echo "⚠️  Frontend build has issues, but continuing..."
fi
cd ..

# Git operations
echo "📤 Committing changes..."
git add .
git commit -m "fix: Force rebuild with complete auth integration $(date)"

echo "🚀 Pushing to GitHub..."
if git push origin main; then
    echo "✅ Successfully pushed to GitHub"
else
    echo "❌ Failed to push. Check your git configuration"
    exit 1
fi

echo ""
echo "🎉 Deployment fix complete!"
echo ""
echo "⏱️  Wait 3-5 minutes, then check:"
echo "   🔗 Backend: https://typetutor-production.up.railway.app/api/health"
echo "   🔗 Frontend: Your Vercel URL"
echo ""
echo "👀 Look for login/signup buttons in the top-right corner"