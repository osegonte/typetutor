#!/bin/bash
# simple_setup.sh - Quick setup for TypeTutor authentication testing

set -e

echo "🔧 TypeTutor Authentication Quick Setup"
echo "======================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Step 1: Install JWT dependencies
print_status "Installing JWT dependencies..."
pip install PyJWT==2.8.0 bcrypt==4.1.2

# Step 2: Create the backend services directory
print_status "Creating backend directory structure..."
mkdir -p backend/services
mkdir -p backend/routes
touch backend/__init__.py
touch backend/services/__init__.py
touch backend/routes/__init__.py

print_success "Directory structure created"

# Step 3: Test the imports
print_status "Testing JWT imports..."
python3 -c "
import jwt
import bcrypt
print('✅ JWT and bcrypt imported successfully')
"

# Step 4: Test the application
print_status "Testing application startup..."
python3 -c "
import sys
sys.path.insert(0, '.')
sys.path.insert(0, 'backend')

try:
    from app import app
    print('✅ App imports successfully')
    
    # Check if auth routes are registered
    with app.app_context():
        rules = [str(rule) for rule in app.url_map.iter_rules()]
        auth_routes = [rule for rule in rules if '/auth/' in rule]
        if auth_routes:
            print('✅ Authentication routes registered:')
            for route in auth_routes:
                print(f'   {route}')
        else:
            print('⚠️  Authentication routes not found')
except Exception as e:
    print(f'❌ Error: {e}')
"

print_success "Setup completed!"

echo ""
echo "📋 Next Steps:"
echo "1. Apply the database schema in Supabase SQL editor"
echo "2. Set your environment variables:"
echo "   export SECRET_KEY='your-secret-key'"
echo "   export SUPABASE_URL='your-supabase-url'"
echo "   export SUPABASE_ANON_KEY='your-supabase-key'"
echo "3. Run: python app.py"
echo ""
echo "🧪 Test Authentication:"
echo "curl -X POST http://localhost:5001/api/auth/register \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"test@example.com\",\"password\":\"Password123!\"}'"