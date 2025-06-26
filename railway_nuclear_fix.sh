#!/bin/bash

# Railway Force Fix - Nuclear Options
echo "🚨 Railway Force Fix - Nuclear Options"
echo "====================================="

cd /Users/osegonte/typetutor

echo "Railway is SERIOUSLY stuck. Let's try aggressive fixes..."

echo ""
echo "🛠️ OPTION 1: Try Different Python Approach"
echo "==========================================="

# Try using python3 instead of python310
cat > backend/nixpacks.toml << 'EOF'
[phases.setup]
nixPkgs = ['python3', 'python3Packages.pip', 'python3Packages.setuptools']

[phases.install]
cmds = [
  'python3 -m pip install --upgrade pip',
  'python3 -m pip install -r requirements.txt'
]

[start]
cmd = 'python3 -m gunicorn --bind 0.0.0.0:$PORT app:app --timeout 120 --worker-class sync --workers 2'
EOF

echo "✅ Updated to python3 approach"
echo "📄 New nixpacks.toml:"
cat backend/nixpacks.toml

# Commit this change
git add backend/nixpacks.toml
git commit -m "Try python3 instead of python310 for Railway"
git push origin main

echo ""
echo "⏳ Waiting 4 minutes for Railway to rebuild..."
sleep 240

echo ""
echo "🧪 Testing after python3 change:"
VERSION_RESULT=$(curl -s https://typetutor-production.up.railway.app/api/health | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
echo "Current version: $VERSION_RESULT"

if [ "$VERSION_RESULT" = "3.1.0" ]; then
    echo "🎉 SUCCESS! Version 3.1.0 is now deployed!"
    
    echo ""
    echo "🧪 Testing CORS headers:"
    curl -I -H 'Origin: https://typetutor.vercel.app' \
         -X OPTIONS \
         https://typetutor-production.up.railway.app/api/health
    
    exit 0
else
    echo "❌ Still showing version: $VERSION_RESULT"
    echo "Moving to Option 2..."
fi

echo ""
echo "🛠️ OPTION 2: Remove ALL Railway Configs - Let Railway Auto-Detect"
echo "================================================================"

# Remove nixpacks.toml and railway.json - let Railway figure it out
mv backend/nixpacks.toml backend/nixpacks.toml.backup
mv backend/railway.json backend/railway.json.backup

echo "✅ Removed nixpacks.toml and railway.json"
echo "✅ Railway will now auto-detect Python project"

# Just keep requirements.txt and let Railway do everything
git add .
git commit -m "Remove all Railway configs - let Railway auto-detect"
git push origin main

echo ""
echo "⏳ Waiting 4 minutes for Railway auto-detection rebuild..."
sleep 240

echo ""
echo "🧪 Testing after auto-detection:"
VERSION_RESULT=$(curl -s https://typetutor-production.up.railway.app/api/health | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
echo "Current version: $VERSION_RESULT"

if [ "$VERSION_RESULT" = "3.1.0" ]; then
    echo "🎉 SUCCESS! Auto-detection worked!"
    
    echo ""
    echo "🧪 Testing CORS headers:"
    curl -I -H 'Origin: https://typetutor.vercel.app' \
         -X OPTIONS \
         https://typetutor-production.up.railway.app/api/health
    
    exit 0
else
    echo "❌ Still showing version: $VERSION_RESULT"
    echo "Moving to Option 3..."
fi

echo ""
echo "🛠️ OPTION 3: Dockerfile Approach"
echo "==============================="

# Create a simple Dockerfile that will definitely work
cat > backend/Dockerfile << 'EOF'
FROM python:3.10-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Start command
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app", "--timeout", "120", "--worker-class", "sync", "--workers", "2"]
EOF

echo "✅ Created Dockerfile"
echo "📄 Dockerfile contents:"
cat backend/Dockerfile

# Create .dockerignore
cat > backend/.dockerignore << 'EOF'
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
.venv
venv/
ENV/
env/
.venv/
EOF

echo "✅ Created .dockerignore"

# Update railway.json to use Docker
cat > backend/railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

echo "✅ Updated railway.json for Dockerfile"

git add .
git commit -m "Add Dockerfile - force Railway to use Docker build"
git push origin main

echo ""
echo "⏳ Waiting 5 minutes for Docker rebuild..."
sleep 300

echo ""
echo "🧪 Testing after Dockerfile approach:"
VERSION_RESULT=$(curl -s https://typetutor-production.up.railway.app/api/health | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
echo "Current version: $VERSION_RESULT"

if [ "$VERSION_RESULT" = "3.1.0" ]; then
    echo "🎉 SUCCESS! Dockerfile approach worked!"
    
    echo ""
    echo "🧪 Testing CORS headers:"
    curl -I -H 'Origin: https://typetutor.vercel.app' \
         -X OPTIONS \
         https://typetutor-production.up.railway.app/api/health
    
    echo ""
    echo "✅ TypeTutor is now properly deployed on Railway!"
    echo "✅ Version 3.1.0 with CORS headers working"
    
    exit 0
else
    echo "❌ STILL showing version: $VERSION_RESULT"
    echo ""
    echo "🚨 CRITICAL: Railway has a serious caching/deployment issue"
    echo "🚨 At this point, creating a new Railway service is recommended"
    echo ""
    echo "Manual steps to try:"
    echo "1. Go to Railway Dashboard"
    echo "2. Check deployment logs for errors"
    echo "3. Try manual redeploy from dashboard"
    echo "4. Consider creating new Railway service"
fi

echo ""
echo "🎯 SUMMARY OF ATTEMPTS"
echo "====================="
echo "❌ Option 1: python3 nixpacks approach - Failed"
echo "❌ Option 2: Railway auto-detection - Failed"  
echo "❌ Option 3: Dockerfile approach - Failed"
echo ""
echo "🚨 Railway appears to have a persistent caching issue"
echo "🚨 Manual intervention required via Railway Dashboard"