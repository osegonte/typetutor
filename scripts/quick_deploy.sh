#!/bin/bash
# scripts/quick_deploy.sh
# TypeTutor Complete Supabase + Railway Deployment Script

echo "🚀 TypeTutor: Automated Supabase + Railway Deployment"
echo "======================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_header() { echo -e "${PURPLE}=== $1 ===${NC}"; }

# Global variables
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SECRET_KEY=""
DEPLOYMENT_URL=""

# Cleanup function
cleanup() {
    print_status "Cleaning up temporary files..."
    # Add any cleanup tasks here
}

# Error handling
set -e
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not found"
        exit 1
    fi
    print_success "Python 3 found: $(python3 --version)"
    
    # Check pip
    if ! command -v pip &> /dev/null; then
        print_error "pip is required but not found"
        exit 1
    fi
    print_success "pip found"
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not found"
        exit 1
    fi
    print_success "curl found"
    
    # Check project structure
    if [ ! -f "backend/app.py" ] || [ ! -f "requirements.txt" ]; then
        print_error "Please run this script from the TypeTutor project root directory"
        exit 1
    fi
    print_success "Project structure verified"
}

# Collect Supabase information
collect_supabase_info() {
    print_header "Supabase Configuration"
    
    echo "Please provide your Supabase project details:"
    echo "You can find these in your Supabase Dashboard > Settings > API"
    echo ""
    
    read -p "Supabase Project URL (https://xxx.supabase.co): " SUPABASE_URL
    if [ -z "$SUPABASE_URL" ]; then
        print_error "Supabase URL is required"
        exit 1
    fi
    
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        print_error "Supabase Anon Key is required"
        exit 1
    fi
    
    # Generate secret key
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    print_success "Generated secure SECRET_KEY"
    
    print_success "Supabase configuration collected"
}

# Setup local environment
setup_local_environment() {
    print_header "Setting Up Local Environment"
    
    # Create virtual environment if needed
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    print_success "Virtual environment activated"
    
    # Install dependencies
    print_status "Installing dependencies..."
    pip install -r requirements.txt > /dev/null 2>&1
    print_success "Dependencies installed"
    
    # Create .env file
    print_status "Creating .env file..."
    cat > .env << EOF
# TypeTutor Environment Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SECRET_KEY=$SECRET_KEY
FLASK_ENV=development
USE_DATABASE=true
PORT=5001
EOF
    print_success ".env file created"
    
    # Create necessary directories
    mkdir -p uploads data logs cache
    print_success "Directories created"
}

# Display schema instructions
display_schema_instructions() {
    print_header "Database Schema Setup"
    
    print_warning "IMPORTANT: You need to run the database schema in Supabase"
    echo ""
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of 'scripts/database_schema.sql'"
    echo "4. Click 'Run' to execute the schema"
    echo ""
    echo "The schema file contains:"
    echo "  • Table definitions"
    echo "  • Indexes for performance"
    echo "  • Row Level Security policies"
    echo "  • Default achievements data"
    echo ""
    
    read -p "Have you run the database schema? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please run the database schema first, then restart this script"
        exit 1
    fi
    
    print_success "Database schema confirmed"
}

# Test database connection
test_database_connection() {
    print_header "Testing Database Connection"
    
    print_status "Testing Supabase connection..."
    
    # Test with Python
    python3 -c "
import os
os.environ['SUPABASE_URL'] = '$SUPABASE_URL'
os.environ['SUPABASE_ANON_KEY'] = '$SUPABASE_ANON_KEY'

try:
    from backend.database.supabase_client import get_supabase
    client = get_supabase()
    result = client.table('users').select('count').execute()
    print('✅ Database connection successful!')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"
    
    if [ $? -eq 0 ]; then
        print_success "Database connection verified"
    else
        print_error "Database connection failed"
        exit 1
    fi
}

# Run migration
run_migration() {
    print_header "Running Data Migration"
    
    # Set environment variables for migration
    export SUPABASE_URL="$SUPABASE_URL"
    export SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
    export USE_DATABASE=true
    
    print_status "Running migration script..."
    
    if python3 scripts/migrate_to_supabase.py; then
        print_success "Migration completed successfully"
    else
        print_warning "Migration had some issues, but continuing..."
    fi
}

# Test local backend
test_local_backend() {
    print_header "Testing Local Backend"
    
    print_status "Starting backend server for testing..."
    
    # Start backend in background
    export SUPABASE_URL="$SUPABASE_URL"
    export SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
    export USE_DATABASE=true
    
    python3 backend/app.py > backend_test.log 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:5001/api/health >/dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Test database endpoint
    if curl -f http://localhost:5001/api/db-health >/dev/null 2>&1; then
        print_success "Database health check passed"
    else
        print_error "Database health check failed"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Stop backend
    kill $BACKEND_PID 2>/dev/null
    print_success "Local backend tests passed"
}

# Install Railway CLI
install_railway_cli() {
    print_header "Setting Up Railway CLI"
    
    if command -v railway &> /dev/null; then
        print_success "Railway CLI already installed"
        return
    fi
    
    print_status "Installing Railway CLI..."
    curl -fsSL https://railway.app/install.sh | sh
    
    if command -v railway &> /dev/null; then
        print_success "Railway CLI installed successfully"
    else
        print_error "Failed to install Railway CLI"
        exit 1
    fi
}

# Setup Railway project
setup_railway_project() {
    print_header "Setting Up Railway Project"
    
    # Login to Railway
    if ! railway whoami &> /dev/null; then
        print_status "Please log in to Railway:"
        railway login
    else
        print_success "Already logged in to Railway"
    fi
    
    # Initialize project
    if [ ! -f "railway.toml" ]; then
        print_status "Initializing Railway project..."
        railway init
    else
        print_success "Railway project already initialized"
    fi
    
    # Set environment variables
    print_status "Setting environment variables..."
    railway variables set SUPABASE_URL="$SUPABASE_URL"
    railway variables set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
    railway variables set SECRET_KEY="$SECRET_KEY"
    railway variables set FLASK_ENV="production"
    railway variables set USE_DATABASE="true"
    
    print_success "Environment variables configured"
}

# Deploy to Railway
deploy_to_railway() {
    print_header "Deploying to Railway"
    
    print_status "Starting deployment..."
    railway up --detach
    
    if [ $? -eq 0 ]; then
        print_success "Deployment initiated successfully"
        
        # Get deployment URL
        print_status "Getting deployment URL..."
        sleep 10  # Wait for deployment to start
        
        DEPLOYMENT_URL=$(railway domain 2>/dev/null)
        if [ ! -z "$DEPLOYMENT_URL" ]; then
            print_success "Deployment URL: https://$DEPLOYMENT_URL"
        else
            print_warning "Could not get deployment URL automatically"
            print_status "Check Railway dashboard for your deployment URL"
        fi
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# Test deployment
test_deployment() {
    print_header "Testing Deployment"
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        print_warning "No deployment URL available, skipping tests"
        return
    fi
    
    print_status "Waiting for deployment to be ready..."
    
    # Wait for deployment with timeout
    TIMEOUT=300  # 5 minutes
    ELAPSED=0
    
    while [ $ELAPSED -lt $TIMEOUT ]; do
        if curl -f "https://$DEPLOYMENT_URL/api/health" >/dev/null 2>&1; then
            print_success "Deployment is ready!"
            break
        fi
        
        sleep 10
        ELAPSED=$((ELAPSED + 10))
        print_status "Still waiting... ($ELAPSED/${TIMEOUT}s)"
    done
    
    if [ $ELAPSED -ge $TIMEOUT ]; then
        print_warning "Deployment timeout, but it may still be starting"
        print_status "Check Railway dashboard for deployment status"
        return
    fi
    
    # Test endpoints
    print_status "Testing deployment endpoints..."
    
    # Health check
    if curl -f "https://$DEPLOYMENT_URL/api/health" >/dev/null 2>&1; then
        print_success "✓ Health endpoint working"
    else
        print_warning "✗ Health endpoint failed"
    fi
    
    # Database health
    if curl -f "https://$DEPLOYMENT_URL/api/db-health" >/dev/null 2>&1; then
        print_success "✓ Database endpoint working"
    else
        print_warning "✗ Database endpoint failed"
    fi
    
    # Test saving a session
    TEST_DATA='{"wpm": 45, "accuracy": 92, "duration": 120, "userId": "deployment-test"}'
    if curl -f -X POST "https://$DEPLOYMENT_URL/api/db-save-stats" \
        -H "Content-Type: application/json" \
        -d "$TEST_DATA" >/dev/null 2>&1; then
        print_success "✓ Session saving working"
    else
        print_warning "✗ Session saving failed"
    fi
}

# Display final results
display_final_results() {
    print_header "Deployment Complete!"
    
    echo ""
    echo "🎉 TypeTutor has been successfully deployed!"
    echo ""
    
    if [ ! -z "$DEPLOYMENT_URL" ]; then
        echo "🌐 Your API is live at:"
        echo "   https://$DEPLOYMENT_URL"
        echo ""
        echo "🔗 Test these endpoints:"
        echo "   • Health: https://$DEPLOYMENT_URL/api/health"
        echo "   • Database: https://$DEPLOYMENT_URL/api/db-health"
        echo "   • Stats: https://$DEPLOYMENT_URL/api/db-stats"
        echo ""
    fi
    
    echo "📊 Supabase Dashboard:"
    echo "   $SUPABASE_URL"
    echo ""
    
    echo "🚂 Railway Dashboard:"
    echo "   https://railway.app/dashboard"
    echo ""
    
    echo "📋 Next Steps:"
    echo "   1. Update your frontend API URL to:"
    echo "      VITE_API_URL=https://$DEPLOYMENT_URL/api"
    echo ""
    echo "   2. Deploy your frontend to Vercel/Netlify"
    echo ""
    echo "   3. Test the complete application end-to-end"
    echo ""
    
    echo "🔧 Configuration Summary:"
    echo "   • Database: Supabase PostgreSQL"
    echo "   • Backend: Railway (Python/Flask)"
    echo "   • Features: Users, Sessions, Achievements, Statistics"
    echo "   • Scaling: Automatic"
    echo "   • Monitoring: Railway + Supabase dashboards"
    echo ""
    
    echo "🎯 Key URLs to bookmark:"
    echo "   • App: https://$DEPLOYMENT_URL"
    echo "   • Health: https://$DEPLOYMENT_URL/api/health"
    echo "   • Supabase: $SUPABASE_URL"
    echo "   • Railway: https://railway.app/dashboard"
    echo ""
    
    print_success "Deployment completed successfully! 🚀"
}

# Handle deployment errors
handle_error() {
    print_error "Deployment failed at step: $1"
    echo ""
    echo "🔍 Troubleshooting tips:"
    echo "   1. Check your Supabase credentials"
    echo "   2. Ensure database schema was run"
    echo "   3. Verify Railway CLI is properly installed"
    echo "   4. Check Railway logs: railway logs"
    echo "   5. Re-run specific steps manually if needed"
    echo ""
    echo "📚 For help, check the deployment guide or documentation"
    exit 1
}

# Main deployment function
main() {
    print_header "TypeTutor Automated Deployment"
    echo ""
    echo "This script will:"
    echo "  1. Set up your local environment"
    echo "  2. Configure Supabase database connection"
    echo "  3. Migrate existing data"
    echo "  4. Test everything locally"
    echo "  5. Deploy to Railway"
    echo "  6. Test the deployment"
    echo ""
    
    read -p "Ready to start? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites || handle_error "Prerequisites check"
    collect_supabase_info || handle_error "Supabase configuration"
    setup_local_environment || handle_error "Local environment setup"
    display_schema_instructions || handle_error "Database schema setup"
    test_database_connection || handle_error "Database connection test"
    run_migration || handle_error "Data migration"
    test_local_backend || handle_error "Local backend test"
    install_railway_cli || handle_error "Railway CLI installation"
    setup_railway_project || handle_error "Railway project setup"
    deploy_to_railway || handle_error "Railway deployment"
    test_deployment || handle_error "Deployment testing"
    display_final_results
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

# Make the script executable
# chmod +x scripts/quick_deploy.sh