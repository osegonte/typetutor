#!/bin/bash
# deploy_to_railway.sh - Deploy TypeTutor with Authentication to Railway

set -e

echo "🚀 TypeTutor Backend Deployment to Railway"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found. Installing..."
    npm install -g @railway/cli
    print_success "Railway CLI installed"
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    print_warning "Not logged in to Railway. Please log in:"
    railway login
fi

print_status "Checking project structure..."

# Verify required files exist
required_files=("app.py" "requirements.txt" "Procfile" "backend/services/auth_service.py" "backend/routes/auth_routes.py")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files present"

# Update requirements.txt with JWT dependencies
print_status "Updating requirements.txt with JWT dependencies..."
if ! grep -q "PyJWT" requirements.txt; then
    echo "" >> requirements.txt
    echo "# JWT Authentication" >> requirements.txt
    echo "PyJWT==2.8.0" >> requirements.txt
    echo "bcrypt==4.1.2" >> requirements.txt
    print_success "Added JWT dependencies to requirements.txt"
fi

# Update Procfile for Railway
print_status "Updating Procfile..."
cat > Procfile << 'EOF'
web: gunicorn --bind 0.0.0.0:$PORT app:app --timeout 120 --worker-class sync --workers 2
EOF

print_success "Procfile updated"

# Create or update railway.json
print_status "Creating railway.json configuration..."
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "gunicorn --bind 0.0.0.0:$PORT app:app --timeout 120 --worker-class sync --workers 2",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

print_success "railway.json created"

# Check Supabase configuration
print_status "Checking Supabase configuration..."
if [ -f ".env" ]; then
    if grep -q "SUPABASE_URL" .env && grep -q "SUPABASE_ANON_KEY" .env; then
        print_success "Supabase configuration found in .env"
    else
        print_warning "Supabase configuration incomplete in .env"
    fi
else
    print_warning ".env file not found"
fi

# Test local application
print_status "Testing application locally..."
python3 -c "
import sys
sys.path.insert(0, '.')
sys.path.insert(0, 'backend')

try:
    from app import app
    print('✅ App imports successfully')
    
    # Test JWT dependencies
    import jwt
    import bcrypt
    print('✅ JWT dependencies available')
    
    # Test auth service
    from backend.services.auth_service import AuthService
    print('✅ Auth service imports successfully')
    
    print('✅ All components working')
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
"

if [ $? -eq 0 ]; then
    print_success "Local application test passed"
else
    print_error "Local application test failed"
    exit 1
fi

# Initialize Railway project if needed
if [ ! -f "railway.toml" ]; then
    print_status "Initializing Railway project..."
    railway init
fi

# Set environment variables
print_status "Setting Railway environment variables..."

# Check if variables are already set
existing_vars=$(railway variables --json 2>/dev/null || echo "[]")

set_var_if_missing() {
    local var_name="$1"
    local var_value="$2"
    local is_secret="$3"
    
    if echo "$existing_vars" | grep -q "\"$var_name\""; then
        print_warning "Variable $var_name already exists, skipping"
    else
        if [ "$is_secret" = "true" ]; then
            echo "$var_value" | railway variables set "$var_name" --stdin
        else
            railway variables set "$var_name=$var_value"
        fi
        print_success "Set $var_name"
    fi
}

# Set production environment variables
set_var_if_missing "FLASK_ENV" "production" false
set_var_if_missing "FLASK_DEBUG" "0" false
set_var_if_missing "USE_DATABASE" "true" false

# Set secret key if not already set
if ! echo "$existing_vars" | grep -q "\"SECRET_KEY\""; then
    print_status "Generating production SECRET_KEY..."
    secret_key=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    echo "$secret_key" | railway variables set SECRET_KEY --stdin
    print_success "Generated and set production SECRET_KEY"
fi

# Set Supabase credentials if available
if [ -f ".env" ]; then
    supabase_url=$(grep "SUPABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')
    supabase_key=$(grep "SUPABASE_ANON_KEY=" .env | cut -d'=' -f2- | tr -d '"')
    
    if [ ! -z "$supabase_url" ] && [ ! -z "$supabase_key" ]; then
        set_var_if_missing "SUPABASE_URL" "$supabase_url" false
        echo "$supabase_key" | railway variables set SUPABASE_ANON_KEY --stdin
        print_success "Set Supabase credentials"
    else
        print_warning "Supabase credentials not found in .env"
        print_warning "You'll need to set them manually in Railway dashboard"
    fi
fi

# Commit and deploy
print_status "Preparing for deployment..."

# Add .railwayignore if it doesn't exist
if [ ! -f ".railwayignore" ]; then
    cat > .railwayignore << 'EOF'
node_modules/
frontend/
*.log
.git/
.env
.env.local
.env.development
__pycache__/
*.pyc
tests/
.pytest_cache/
.coverage
htmlcov/
venv/
cache/
logs/
*.backup
.DS_Store
*.md
docs/
EOF
    print_success "Created .railwayignore"
fi

# Create deployment commit
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_status "Committing changes for deployment..."
    git add .
    git commit -m "Deploy TypeTutor with JWT authentication - $(date)" || true
    print_success "Changes committed"
else
    print_status "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - TypeTutor with JWT authentication"
    print_success "Git repository initialized"
fi

# Deploy to Railway
print_status "Deploying to Railway..."
echo ""
echo "🚀 Starting Railway deployment..."
echo "This may take a few minutes..."
echo ""

railway up --detach

# Get deployment status
print_status "Checking deployment status..."
sleep 10

# Get the deployed URL
deployed_url=$(railway domain 2>/dev/null || echo "")

if [ ! -z "$deployed_url" ]; then
    print_success "Deployment completed!"
    echo ""
    echo "🎉 TypeTutor deployed successfully!"
    echo ""
    echo "📋 Deployment Information:"
    echo "   🌐 URL: https://$deployed_url"
    echo "   🔐 Authentication: Enabled"
    echo "   💾 Database: Supabase"
    echo "   ⚡ Features: JWT, PDF Processing, Statistics"
    echo ""
    echo "🧪 Test Endpoints:"
    echo "   Health Check: https://$deployed_url/api/health"
    echo "   Auth Health:  https://$deployed_url/api/auth/health"
    echo ""
    echo "🔐 Authentication Endpoints:"
    echo "   Register: POST https://$deployed_url/api/auth/register"
    echo "   Login:    POST https://$deployed_url/api/auth/login"
    echo "   Profile:  GET  https://$deployed_url/api/auth/profile"
    echo ""
    echo "📊 API Endpoints:"
    echo "   Stats:        GET  https://$deployed_url/api/stats"
    echo "   Save Stats:   POST https://$deployed_url/api/save-stats"
    echo "   Process Text: POST https://$deployed_url/api/process-text"
    echo "   Upload PDF:   POST https://$deployed_url/api/upload-pdf"
    echo ""
    
    # Test the deployment
    print_status "Testing deployment..."
    
    if curl -f -s "https://$deployed_url/api/health" > /dev/null; then
        print_success "✅ Health check passed"
    else
        print_warning "⚠️  Health check failed - deployment may still be starting"
    fi
    
    if curl -f -s "https://$deployed_url/api/auth/health" > /dev/null; then
        print_success "✅ Authentication system working"
    else
        print_warning "⚠️  Authentication health check failed"
    fi
    
    echo ""
    echo "📝 Next Steps:"
    echo "1. Update your frontend VITE_API_URL to: https://$deployed_url/api"
    echo "2. Test user registration and login"
    echo "3. Verify statistics saving works with authentication"
    echo "4. Set up your custom domain (optional)"
    echo ""
    echo "🔧 Environment Variables Set:"
    echo "   ✅ FLASK_ENV=production"
    echo "   ✅ USE_DATABASE=true"
    echo "   ✅ SECRET_KEY (generated)"
    if [ ! -z "$supabase_url" ]; then
        echo "   ✅ SUPABASE_URL"
        echo "   ✅ SUPABASE_ANON_KEY"
    else
        echo "   ⚠️  SUPABASE_URL (needs manual setup)"
        echo "   ⚠️  SUPABASE_ANON_KEY (needs manual setup)"
    fi
    
else
    print_warning "Deployment status unclear. Check Railway dashboard:"
    echo "   https://railway.app/dashboard"
fi

echo ""
print_success "Deployment script completed!"

# Show logs command
echo ""
echo "💡 Useful Commands:"
echo "   View logs:       railway logs"
echo "   Check status:    railway status"
echo "   Open dashboard:  railway open"
echo "   Set variables:   railway variables set KEY=value"
echo ""
echo "🐛 Troubleshooting:"
echo "   If deployment fails, check logs with: railway logs"
echo "   Ensure Supabase credentials are set correctly"
echo "   Verify the database schema is applied in Supabase"