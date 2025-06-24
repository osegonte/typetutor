#!/usr/bin/env python3
"""
Updated debug script for TypeTutor Supabase authentication issues
This version checks your existing table structure first
"""

import os
import sys
import requests
import json
from datetime import datetime

# Colors for output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_status(msg): print(f"{Colors.BLUE}[INFO]{Colors.NC} {msg}")
def print_success(msg): print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {msg}")
def print_warning(msg): print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {msg}")
def print_error(msg): print(f"{Colors.RED}[ERROR]{Colors.NC} {msg}")

def main():
    print("🔍 TypeTutor Supabase Authentication Debug - Updated")
    print("=" * 55)
    
    # Step 1: Check environment variables
    print_status("Checking environment variables...")
    
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_ANON_KEY')
    
    if not supabase_url:
        print_error("SUPABASE_URL not set")
        print("Set it with: export SUPABASE_URL='your-supabase-url'")
        return False
    else:
        print_success(f"SUPABASE_URL: {supabase_url[:30]}...")
    
    if not supabase_key:
        print_error("SUPABASE_ANON_KEY not set")
        print("Set it with: export SUPABASE_ANON_KEY='your-supabase-key'")
        return False
    else:
        print_success(f"SUPABASE_ANON_KEY: {supabase_key[:30]}...")
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    print()
    
    # Step 2: Test basic connection
    print_status("Testing basic Supabase connection...")
    try:
        response = requests.get(f"{supabase_url}/rest/v1/", headers=headers, timeout=10)
        if response.status_code == 200:
            print_success("✅ Basic connection works")
        else:
            print_error(f"❌ Connection failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"❌ Connection error: {e}")
        return False
    
    print()
    
    # Step 3: Check existing users table structure
    print_status("Analyzing your existing 'users' table structure...")
    try:
        # First check if table exists
        response = requests.get(f"{supabase_url}/rest/v1/users?select=*&limit=1", headers=headers, timeout=10)
        if response.status_code == 200:
            print_success("✅ 'users' table exists and is accessible")
            
            # Get a sample record to see the structure
            data = response.json()
            if data:
                print("📋 Current table structure (from sample record):")
                sample_record = data[0]
                for key, value in sample_record.items():
                    print(f"   {key}: {type(value).__name__} = {value}")
            else:
                print("📋 Table exists but is empty")
                
                # Try to get column info via a different method
                print_status("Attempting to get column structure...")
                try:
                    # Try to insert a minimal record to see what fields are required
                    test_data = {'email': 'structure-test@example.com'}
                    response = requests.post(f"{supabase_url}/rest/v1/users", headers=headers, json=test_data, timeout=10)
                    
                    if response.status_code == 400:
                        error_data = response.json()
                        print(f"📋 Required fields error: {error_data}")
                    elif response.status_code in [200, 201]:
                        print_warning("Minimal insert worked - cleaning up...")
                        # Clean up
                        requests.delete(f"{supabase_url}/rest/v1/users?email=eq.structure-test@example.com", headers=headers)
                except:
                    pass
                    
        elif response.status_code == 404:
            print_error("❌ 'users' table doesn't exist")
            return False
        else:
            print_warning(f"⚠️  Unexpected response: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print_error(f"❌ Error checking users table: {e}")
        return False
    
    print()
    
    # Step 4: Test what your auth service is trying to send
    print_status("Testing what your auth service sends...")
    
    # This is what your current auth service tries to send
    test_user_data = {
        'id': 'test-debug-' + datetime.now().strftime('%Y%m%d%H%M%S'),
        'email': f'debug-test-{datetime.now().strftime("%Y%m%d%H%M%S")}@example.com',
        'password_hash': 'dummy-hash-for-testing',
        'display_name': 'Debug Test User',
        'is_active': True,
        'created_at': datetime.utcnow().isoformat(),
        'last_login': None
    }
    
    print("📋 Data your auth service tries to send:")
    for key, value in test_user_data.items():
        print(f"   {key}: {value}")
    
    print()
    print_status("Testing INSERT with auth service data format...")
    
    try:
        response = requests.post(f"{supabase_url}/rest/v1/users", headers=headers, json=test_user_data, timeout=10)
        print_status(f"INSERT response code: {response.status_code}")
        print_status(f"Response content: {response.text}")
        
        if response.status_code in [200, 201]:
            print_success("✅ Your auth service data format works!")
            # Clean up
            try:
                requests.delete(f"{supabase_url}/rest/v1/users?id=eq.{test_user_data['id']}", headers=headers)
                print_success("✅ Test data cleaned up")
            except:
                pass
        else:
            print_error(f"❌ INSERT failed: {response.status_code}")
            
            # Parse the error to understand what's wrong
            try:
                error_data = response.json()
                if 'message' in error_data:
                    print_error(f"Error message: {error_data['message']}")
                    
                    # Common error patterns and solutions
                    error_msg = error_data['message'].lower()
                    if 'column' in error_msg and 'does not exist' in error_msg:
                        print("🔧 SOLUTION: Your table is missing columns that your auth service expects")
                        print("   You need to add the missing columns to your users table")
                    elif 'violates not-null constraint' in error_msg:
                        print("🔧 SOLUTION: Your table has required fields that aren't being provided")
                        print("   Check which fields are marked as NOT NULL in your table")
                    elif 'permission denied' in error_msg:
                        print("🔧 SOLUTION: RLS policy or permissions issue")
                        print("   Check your Row Level Security policies")
                        
            except:
                print(f"Raw error: {response.text}")
                
    except Exception as e:
        print_error(f"❌ INSERT test error: {e}")
    
    print()
    
    # Step 5: Test your backend endpoint
    print_status("Testing your backend registration endpoint...")
    try:
        test_registration_data = {
            'email': f'backend-test-{datetime.now().strftime("%Y%m%d%H%M%S")}@example.com',
            'password': 'TestPassword123!',
            'display_name': 'Backend Test User'
        }
        
        response = requests.post(
            'http://localhost:5001/api/auth/register',
            headers={'Content-Type': 'application/json'},
            json=test_registration_data,
            timeout=10
        )
        
        print_status(f"Backend response code: {response.status_code}")
        
        if response.status_code in [200, 201]:
            print_success("✅ Backend registration works!")
            result = response.json()
            print(f"Registration result: {json.dumps(result, indent=2)}")
        else:
            print_error(f"❌ Backend registration failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw response: {response.text}")
            
    except requests.ConnectionError:
        print_warning("⚠️  Backend not running on localhost:5001")
        print("Start your backend with: python app.py")
    except Exception as e:
        print_error(f"❌ Backend test error: {e}")
    
    print()
    
    # Step 6: Provide specific recommendations
    print_status("Specific Recommendations:")
    print()
    
    print("Based on the analysis above:")
    print()
    print("1. ✅ If the auth service data format test passed:")
    print("   → Your table structure is compatible")
    print("   → The issue is likely in your auth service code")
    print("   → Use the CORRECTED auth service I'll provide")
    print()
    print("2. ❌ If the auth service data format test failed:")
    print("   → Your table structure needs modification")
    print("   → Add missing columns or fix data types")
    print("   → Or modify your auth service to match your table")
    print()
    print("3. 📋 Next steps:")
    print("   → Fix the specific error shown above")
    print("   → Use the corrected auth service")
    print("   → Test registration again")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)