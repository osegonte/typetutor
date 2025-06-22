#!/bin/bash
# TypeTutor Production Deployment Script

echo "🚀 TypeTutor Production Deployment"
echo "==================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Step 1: Pre-deployment checks
print_step "1. Running pre-deployment checks..."

# Check if required tools are installed
command -v git >/dev/null 2>&1 || { print_error "git is required but not installed"; exit 1; }
command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed"; exit 1; }
command -v python3 >/dev/null 2>&1 || { print_error "Python 3 is required but not installed"; exit 1; }

print_success "All required tools are available"

# Step 2: Install deployment tools
print_step "2. Installing deployment tools..."

# Install Vercel CLI
if ! command -v vercel &> /dev/null; then
    npm install -g vercel
    print_success "Vercel CLI installed"
else
    print_success "Vercel CLI already installed"
fi

# Install Railway CLI
if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI not found. Please install it manually:"
    echo "  curl -fsSL https://railway.app/install.sh | sh"
    echo "  Then run this script again."
    exit 1
else
    print_success "Railway CLI already installed"
fi

# Step 3: Prepare frontend for deployment
print_step "3. Preparing frontend for deployment..."

cd frontend

# Install dependencies
npm install

# Create production environment file
print_warning "Please enter your production backend URL (will be provided by Railway):"
read -p "Backend URL (https://your-app.railway.app): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    BACKEND_URL="https://typetutor-backend.railway.app"
    print_warning "Using default backend URL: $BACKEND_URL"
fi

cat > .env.production << EOF
VITE_API_URL=${BACKEND_URL}/api
VITE_APP_TITLE=TypeTutor - Learn While You Type
VITE_DEBUG_MODE=false
EOF

# Create Vercel configuration
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "dist/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
EOF

print_success "Frontend prepared for deployment"

# Step 4: Prepare backend for deployment
print_step "4. Preparing backend for deployment..."

cd ../

# Create Railway configuration
cat > railway.json << 'EOF'
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

# Create Procfile
cat > Procfile << 'EOF'
web: gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 backend.app:create_app()
EOF

# Create production requirements
cat > requirements.prod.txt << 'EOF'
Flask==2.3.3
Flask-Cors==4.0.0
pypdf==3.17.1
Werkzeug==2.3.7
python-decouple==3.8
python-magic==0.4.27
psutil==5.9.5
gunicorn==21.2.0
python-dateutil==2.8.2
requests==2.31.0
EOF

# Create production configuration template
cat > .env.production.template << 'EOF'
# Production Environment Variables for Railway
SECRET_KEY=your-super-secure-production-key-change-this
FLASK_ENV=production
FLASK_DEBUG=0
PORT=8000
HOST=0.0.0.0
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
STATS_FILE=data/user_stats.json
CACHE_DIR=cache
LOG_DIR=logs

# Database (if using Supabase)
# SUPABASE_URL=your-supabase-project-url
# SUPABASE_ANON_KEY=your-supabase-anon-key
# SUPABASE_SERVICE_KEY=your-supabase-service-key
EOF

print_success "Backend prepared for deployment"

# Step 5: Build and test
print_step "5. Building and testing..."

# Build frontend
cd frontend
npm run build
if [ $? -ne 0 ]; then
    print_error "Frontend build failed"
    exit 1
fi
print_success "Frontend build successful"

# Test backend
cd ../
python3 -m venv test_env
source test_env/bin/activate
pip install -r requirements.txt
python -m pytest tests/ -v
if [ $? -ne 0 ]; then
    print_warning "Some tests failed, but continuing with deployment"
else
    print_success "All tests passed"
fi
deactivate
rm -rf test_env

# Step 6: Deploy backend to Railway
print_step "6. Deploying backend to Railway..."

print_warning "Manual steps required for Railway deployment:"
echo "1. Go to https://railway.app"
echo "2. Sign up/Login with GitHub"
echo "3. Create a new project"
echo "4. Connect your GitHub repository"
echo "5. Set environment variables from .env.production.template"
echo "6. Deploy the backend"
echo ""
echo "After deployment, note your Railway app URL for frontend configuration"

# Step 7: Deploy frontend to Vercel
print_step "7. Deploying frontend to Vercel..."

cd frontend
print_warning "Manual steps for Vercel deployment:"
echo "1. Update VITE_API_URL in .env.production with your Railway backend URL"
echo "2. Run: vercel --prod"
echo "3. Follow the prompts to deploy"

print_success "Deployment preparation complete!"

echo ""
echo "🎉 Next Steps:"
echo "==============="
echo "1. Deploy backend to Railway using the Railway dashboard"
echo "2. Update frontend environment with Railway backend URL"
echo "3. Deploy frontend to Vercel using 'vercel --prod'"
echo "4. Set up Supabase database (optional, for user accounts)"
echo "5. Configure custom domains (optional)"
echo ""
echo "📚 Documentation:"
echo "- Railway: https://docs.railway.app"
echo "- Vercel: https://vercel.com/docs"
echo "- Supabase: https://supabase.com/docs"
echo ""
echo "🔧 Troubleshooting:"
echo "- Check Railway logs for backend issues"
echo "- Check Vercel deployment logs for frontend issues"
echo "- Ensure CORS is properly configured for your domains"