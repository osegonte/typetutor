#!/bin/bash
# deploy-frontend.sh - TypeTutor Frontend Deployment Script

set -e

echo "🚀 TypeTutor Frontend Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
BACKEND_URL="https://typetutor-production.up.railway.app"
API_URL="${BACKEND_URL}/api"

echo -e "${BLUE}📁 Checking frontend directory...${NC}"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found!${NC}"
    exit 1
fi

cd $FRONTEND_DIR

echo -e "${BLUE}📦 Checking Node.js and npm...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) and npm $(npm --version) found${NC}"

echo -e "${BLUE}🔧 Setting up environment configuration...${NC}"

# Create production environment file
cat > .env.production << EOF
VITE_API_URL=$API_URL
VITE_APP_TITLE=TypeTutor
VITE_DEBUG_MODE=false
VITE_NODE_ENV=production
EOF

echo -e "${GREEN}✅ Created .env.production${NC}"

# Create vercel.json if it doesn't exist
if [ ! -f "vercel.json" ]; then
    echo -e "${BLUE}📝 Creating vercel.json configuration...${NC}"
    cat > vercel.json << 'EOF'
{
  "version": 2,
  "name": "typetutor-frontend",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://typetutor-production.up.railway.app/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
EOF
    echo -e "${GREEN}✅ Created vercel.json${NC}"
fi

echo -e "${BLUE}🔍 Testing backend connectivity...${NC}"
if curl -f -s "$BACKEND_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is accessible at $BACKEND_URL${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Backend may not be accessible. Continuing anyway...${NC}"
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🔨 Building production bundle...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${BLUE}🧪 Testing production build locally...${NC}"
echo -e "${YELLOW}Starting preview server on http://localhost:4173${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop and continue with deployment${NC}"

# Start preview server in background
npm run preview &
PREVIEW_PID=$!

# Wait a moment for server to start
sleep 3

# Test if preview is working
if curl -f -s "http://localhost:4173" > /dev/null; then
    echo -e "${GREEN}✅ Preview server is running!${NC}"
else
    echo -e "${YELLOW}⚠️  Preview server may not be ready yet${NC}"
fi

# Function to cleanup preview server
cleanup() {
    if [ ! -z "$PREVIEW_PID" ]; then
        kill $PREVIEW_PID 2>/dev/null || true
    fi
}

# Set trap to cleanup on script exit
trap cleanup EXIT

echo ""
echo -e "${BLUE}🚀 Ready for deployment!${NC}"
echo ""
echo "Choose deployment option:"
echo "1) Deploy to Vercel (recommended)"
echo "2) Deploy to Netlify"
echo "3) Just build (skip deployment)"
echo "4) Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo -e "${BLUE}🌐 Deploying to Vercel...${NC}"
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo -e "${YELLOW}📦 Installing Vercel CLI...${NC}"
            npm install -g vercel
        fi
        
        echo -e "${BLUE}🚀 Starting Vercel deployment...${NC}"
        echo ""
        echo "Follow the prompts to configure your project:"
        echo "- Project name: typetutor-frontend"
        echo "- Framework: Vite"
        echo "- Root directory: ./ (current directory)"
        echo ""
        
        vercel --prod
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
            echo ""
            echo "Next steps:"
            echo "1. Test your deployed application"
            echo "2. Set up custom domain (optional)"
            echo "3. Configure environment variables in Vercel dashboard"
            echo ""
        else
            echo -e "${RED}❌ Deployment failed!${NC}"
            exit 1
        fi
        ;;
    2)
        echo -e "${BLUE}🌐 Preparing for Netlify deployment...${NC}"
        echo ""
        echo "Manual Netlify deployment steps:"
        echo "1. Go to https://app.netlify.com/drop"
        echo "2. Drag and drop the 'dist' folder"
        echo "3. Or connect your Git repository"
        echo ""
        echo "Build settings for Netlify:"
        echo "- Build command: npm run build"
        echo "- Publish directory: dist"
        echo ""
        echo "Environment variables to set:"
        echo "- VITE_API_URL=$API_URL"
        echo "- VITE_APP_TITLE=TypeTutor"
        echo "- VITE_DEBUG_MODE=false"
        echo ""
        ;;
    3)
        echo -e "${GREEN}✅ Build completed! Files are in the 'dist' directory.${NC}"
        ;;
    4)
        echo -e "${YELLOW}👋 Deployment cancelled.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid choice!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}📋 Deployment Summary:${NC}"
echo "- Frontend built successfully"
echo "- Environment configured for production"
echo "- Backend URL: $BACKEND_URL"
echo "- API URL: $API_URL"
echo ""
echo -e "${BLUE}🧪 Post-deployment testing checklist:${NC}"
echo "□ Homepage loads correctly"
echo "□ API health check works"
echo "□ Typing practice functions"
echo "□ Statistics save/load"
echo "□ Mobile responsiveness"
echo "□ Performance (Lighthouse score >90)"
echo ""
echo -e "${GREEN}🎉 TypeTutor frontend deployment complete!${NC}"

# Keep preview server running for a bit longer if user wants to test
if [ $choice -ne 4 ]; then
    echo ""
    echo -e "${YELLOW}Preview server still running at http://localhost:4173${NC}"
    echo "Press Enter to stop preview server and exit..."
    read
fi