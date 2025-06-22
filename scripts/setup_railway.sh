# scripts/setup_railway.sh
#!/bin/bash

echo "🚂 TypeTutor Railway Deployment Setup"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI not found. Installing..."
    
    # Install Railway CLI
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl -fsSL https://railway.app/install.sh | sh
    else
        # Linux
        curl -fsSL https://railway.app/install.sh | sh
    fi
    
    if ! command -v railway &> /dev/null; then
        print_error "Failed to install Railway CLI"
        exit 1
    fi
    
    print_success "Railway CLI installed"
fi

print_status "Setting up Railway project..."

# Login to Railway (if not already logged in)
if ! railway whoami &> /dev/null; then
    print_status "Please log in to Railway:"
    railway login
fi

# Initialize Railway project
if [ ! -f "railway.toml" ]; then
    print_status "Initializing Railway project..."
    railway init
else
    print_success "Railway project already initialized"
fi

# Check for required files
print_status "Checking deployment files..."

files_to_check=(
    "requirements.txt"
    "railway.json"
    "backend/app.py"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file missing"
        exit 1
    fi
done

# Set environment variables
print_status "Setting up environment variables..."

print_warning "Please set the following environment variables in Railway dashboard:"
echo ""
echo "Required variables:"
echo "- SUPABASE_URL=https://your-project.supabase.co"
echo "- SUPABASE_ANON_KEY=your-anon-key"
echo "- SECRET_KEY=your-production-secret-key"
echo "- FLASK_ENV=production"
echo "- USE_DATABASE=true"
echo ""
echo "Optional variables:"
echo "- PORT=5001 (Railway will set this automatically)"
echo "- MAX_CONTENT_LENGTH=16777216"
echo ""

read -p "Have you set these environment variables in Railway dashboard? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Please set environment variables and run this script again"
    exit 1
fi

# Deploy to Railway
print_status "Deploying to Railway..."
railway up

if [ $? -eq 0 ]; then
    print_success "Deployment initiated successfully!"
    
    # Get the deployment URL
    print_status "Getting deployment URL..."
    DOMAIN=$(railway domain)
    
    if [ ! -z "$DOMAIN" ]; then
        print_success "Your app will be available at: https://$DOMAIN"
        print_success "Health check: https://$DOMAIN/api/health"
        print_success "API stats: https://$DOMAIN/api/stats"
    fi
    
    echo ""
    print_success "Next steps:"
    echo "1. Wait for deployment to complete (check Railway dashboard)"
    echo "2. Test your API endpoints"
    echo "3. Update your frontend to use the new Railway URL"
    echo "4. Deploy your frontend (Vercel/Netlify)"
    
else
    print_error "Deployment failed. Check Railway dashboard for details."
    exit 1
fi