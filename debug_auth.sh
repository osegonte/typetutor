#!/bin/bash
# debug_auth.sh - Debug TypeTutor authentication issues

echo "🔍 TypeTutor Authentication Debug"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Test 1: Check environment variables
print_status "Checking environment variables..."
if [ -z "$SUPABASE_URL" ]; then
    print_error "SUPABASE_URL not set"
else
    print_success "SUPABASE_URL is set: ${SUPABASE_URL:0:30}..."
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    print_error "SUPABASE_ANON_KEY not set"
else
    print_success "SUPABASE_ANON_KEY is set: ${SUPABASE_ANON_KEY:0:30}..."
fi

# Test 2: Test direct Supabase connection
print_status "Testing direct Supabase connection..."
python3 -c "
import os
import requests

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_ANON_KEY')

if not url or not key:
    print('❌ Environment variables not set')
    exit(1)

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json'
}

try:
    # Test connection to users table
    response = requests.get(f'{url}/rest/v1/users?select=email&limit=1', headers=headers, timeout=10)
    print(f'Users table access: {response.status_code}')
    
    if response.status_code == 200:
        print('✅ Can read from users table')
    else:
        print(f'❌ Cannot read from users table: {response.text}')
        
    # Test INSERT permissions
    test_user = {
        'email': 'test-permissions@example.com',
        'password_hash': 'test-hash',
        'display_name': 'Test User'
    }
    
    response = requests.post(f'{url}/rest/v1/users', headers=headers, json=test_user, timeout=10)
    print(f'Insert test: {response.status_code}')
    
    if response.status_code in [200, 201]:
        print('✅ Can insert into users table')
        # Clean up test user
        requests.delete(f'{url}/rest/v1/users?email=eq.test-permissions@example.com', headers=headers)
    elif response.status_code == 409:
        print('⚠️  Insert works but user exists (cleanup test user)')
    else:
        print(f'❌ Cannot insert into users table: {response.text}')

except Exception as e:
    print(f'❌ Connection error: {e}')
"

# Test 3: Test authentication endpoints
print_status "Testing authentication endpoints..."

echo "Testing health endpoint..."
curl -s http://localhost:5001/api/health | python3 -m json.tool 2>/dev/null || echo "Health endpoint failed"

echo ""
echo "Testing auth health endpoint..."
curl -s http://localhost:5001/api/auth/health | python3 -m json.tool 2>/dev/null || echo "Auth health endpoint failed"

# Test 4: Manual registration test with debugging
print_status "Testing registration with detailed error output..."
curl -v -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"debug-test@example.com","password":"Password123!","display_name":"Debug User"}' \
  2>&1 | head -20

echo ""
print_status "Suggested fixes:"
echo "1. Check Supabase RLS (Row Level Security) settings"
echo "2. Verify table permissions for 'anon' role"
echo "3. Check if tables were created correctly"
echo "4. Test with Supabase dashboard directly"