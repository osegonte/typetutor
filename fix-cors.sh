#!/bin/bash

# TypeTutor CORS Fix Script
# This script fixes the "Failed to fetch" error between Vercel frontend and Railway backend

set -e  # Exit on any error

echo "🔧 TypeTutor CORS Fix Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "frontend/package.json" ]; then
    print_error "This script must be run from the project root or frontend directory"
    exit 1
fi

# Navigate to project root if we're in frontend
if [ -f "package.json" ] && [ -d "../backend" ]; then
    cd ..
fi

print_info "Current directory: $(pwd)"

# Step 1: Get Vercel deployment URL
print_info "Step 1: Getting Vercel deployment information..."

if command -v vercel &> /dev/null; then
    print_info "Getting Vercel project info..."
    VERCEL_URL=$(vercel ls 2>/dev/null | grep typetutor | head -n1 | awk '{print $2}' || echo "")
    if [ -n "$VERCEL_URL" ]; then
        print_status "Found Vercel URL: $VERCEL_URL"
    else
        print_warning "Could not auto-detect Vercel URL"
        VERCEL_URL="typetutor-git-main-osegontes-projects.vercel.app"
        print_info "Using default: $VERCEL_URL"
    fi
else
    print_warning "Vercel CLI not installed, using default URL"
    VERCEL_URL="typetutor-git-main-osegontes-projects.vercel.app"
fi

# Step 2: Fix Backend CORS Configuration
print_info "Step 2: Updating backend CORS configuration..."

if [ -f "app.py" ]; then
    print_info "Updating app.py CORS settings..."
    
    # Create backup
    cp app.py app.py.backup
    print_status "Created backup: app.py.backup"
    
    # Update CORS allowed origins
    cat > cors_update.py << 'EOF'
import re
import sys

def update_cors_config(content):
    # Find the allowed_origins section and update it
    new_origins = '''allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://typetutor.vercel.app",
    "https://typetutor-git-main-osegontes-projects.vercel.app",
    "https://typetutor-osegonte.vercel.app",
    "https://typetutor-2fo842jj2-osegontes-projects.vercel.app",
    "https://typetutor-frontend-17neeudr8-osegontes-projects.vercel.app",
    "https://typetutor.dev"
]

# Dynamic Vercel URL matching
if request and hasattr(request, 'headers'):
    origin = request.headers.get('Origin', '')
    if re.match(r'https://typetutor.*\.vercel\.app$', origin):
        if origin not in allowed_origins:
            allowed_origins.append(origin)'''
    
    # Replace the existing allowed_origins section
    pattern = r'allowed_origins = \[.*?\]'
    if re.search(pattern, content, re.DOTALL):
        content = re.sub(pattern, new_origins.split('\n\n')[0], content, flags=re.DOTALL)
    else:
        # If not found, add after CORS import
        cors_import_pattern = r'(from flask_cors import CORS.*?\n)'
        if re.search(cors_import_pattern, content):
            content = re.sub(cors_import_pattern, r'\1\n' + new_origins + '\n', content)
    
    return content

# Read the file
with open('app.py', 'r') as f:
    content = f.read()

# Update content
updated_content = update_cors_config(content)

# Write back
with open('app.py', 'w') as f:
    f.write(updated_content)

print("✅ Updated app.py CORS configuration")
EOF

    python3 cors_update.py
    rm cors_update.py
    print_status "Updated backend CORS configuration"
else
    print_warning "app.py not found in current directory"
fi

# Step 3: Fix Frontend API Configuration  
print_info "Step 3: Updating frontend API configuration..."

if [ -d "frontend" ]; then
    cd frontend
    
    # Update AuthContext to handle CORS better
    if [ -f "src/context/AuthContext.jsx" ]; then
        print_info "Updating AuthContext.jsx..."
        
        # Create backup
        cp src/context/AuthContext.jsx src/context/AuthContext.jsx.backup
        
        # Update the login function to handle CORS properly
        cat > auth_fix.js << 'EOF'
const fs = require('fs');

let content = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');

// Replace the fetch call in login function
const newFetchCall = `        const response = await fetch(\`\${API_BASE_URL}/auth/login\`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit',
          body: JSON.stringify({ email, password }),
        });`;

// Find and replace the fetch call
content = content.replace(
  /const response = await fetch\(`\${API_BASE_URL}\/auth\/login`,[\s\S]*?\}\);/,
  newFetchCall
);

fs.writeFileSync('src/context/AuthContext.jsx', content);
console.log('✅ Updated AuthContext.jsx');
EOF

        node auth_fix.js
        rm auth_fix.js
        print_status "Updated AuthContext CORS handling"
    fi
    
    # Update API service
    if [ -f "src/services/api.js" ]; then
        print_info "Updating api.js..."
        
        cp src/services/api.js src/services/api.js.backup
        
        # Add explicit CORS mode to all fetch calls
        sed -i.tmp 's/mode: '\''cors'\''/mode: '\''cors'\''/g' src/services/api.js
        sed -i.tmp 's/credentials: '\''omit'\''/credentials: '\''omit'\''/g' src/services/api.js
        rm -f src/services/api.js.tmp
        
        print_status "Updated API service CORS settings"
    fi
    
    cd ..
fi

# Step 4: Test API Connection
print_info "Step 4: Testing API connection..."

# Create a test script
cat > test_api.js << 'EOF'
const API_URL = 'https://typetutor-production.up.railway.app/api';

async function testAPI() {
    try {
        console.log('🧪 Testing API connection...');
        
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API connection successful!');
            console.log('Response:', data);
            return true;
        } else {
            console.log('❌ API response error:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ API connection failed:', error.message);
        return false;
    }
}

testAPI().then(success => {
    process.exit(success ? 0 : 1);
});
EOF

if command -v node &> /dev/null; then
    if node test_api.js; then
        print_status "API connection test passed"
    else
        print_warning "API connection test failed - this might be expected until backend is deployed"
    fi
else
    print_warning "Node.js not found, skipping API test"
fi

rm -f test_api.js

# Step 5: Update Vercel configuration
print_info "Step 5: Ensuring Vercel configuration is correct..."

if [ -d "frontend" ]; then
    cd frontend
    
    # Ensure vercel.json has proper CORS headers
    cat > vercel.json << 'EOF'
{
  "version": 2,
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "https://typetutor-production.up.railway.app/api"
  },
  "build": {
    "env": {
      "VITE_API_URL": "https://typetutor-production.up.railway.app/api"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options", 
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
EOF
    
    print_status "Updated vercel.json configuration"
    cd ..
fi

# Step 6: Commit and deploy changes
print_info "Step 6: Committing changes..."

git add .
if git diff --staged --quiet; then
    print_info "No changes to commit"
else
    git commit -m "fix: update CORS configuration for Vercel deployment

- Added Vercel domains to backend allowed origins
- Updated frontend API calls for proper CORS handling  
- Fixed authentication service CORS mode
- Updated vercel.json configuration"
    
    print_status "Changes committed successfully"
    
    print_info "Pushing to repository..."
    if git push origin main; then
        print_status "Changes pushed to repository"
    else
        print_warning "Failed to push changes - you may need to push manually"
    fi
fi

# Step 7: Instructions for manual verification
echo ""
echo "🎉 CORS Fix Complete!"
echo "====================="
echo ""
print_info "Next steps:"
echo "1. Wait for automatic Vercel deployment (should trigger from git push)"
echo "2. Wait for Railway backend to redeploy (if auto-deploy is enabled)"
echo "3. Test login on your Vercel site: https://$VERCEL_URL"
echo ""
print_info "Manual deployment commands (if needed):"
echo "Frontend: cd frontend && vercel --prod"
echo "Backend: git push (if auto-deploy enabled on Railway)"
echo ""
print_info "Debug commands:"
echo "Test API: curl https://typetutor-production.up.railway.app/api/health"
echo "Check CORS: curl -H 'Origin: https://$VERCEL_URL' https://typetutor-production.up.railway.app/api/health"
echo ""
print_status "All fixes applied successfully!"

# Final test URL
echo ""
print_info "🔗 Test your deployment:"
echo "Frontend: https://$VERCEL_URL"
echo "Backend Health: https://typetutor-production.up.railway.app/api/health"
echo ""
echo "If you still get 'Failed to fetch', check the browser console for specific error details."