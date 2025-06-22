#!/usr/bin/env python3
"""
TypeTutor Migration Script: JSON to Supabase
Migrates existing JSON data to Supabase database
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def print_status(message):
    print(f"🔄 {message}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

async def test_environment():
    """Test that all required components are available"""
    print_status("Testing environment setup...")
    
    errors = []
    
    # Test 1: Check Python modules
    try:
        import supabase
        print_success(f"Supabase module found: v{supabase.__version__}")
    except ImportError as e:
        errors.append(f"Supabase module not found: {e}")
    
    # Test 2: Check environment variables
    required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
    for var in required_vars:
        if not os.getenv(var):
            errors.append(f"Environment variable {var} is not set")
        else:
            value = os.getenv(var)
            print_success(f"{var}: {value[:30]}...")
    
    # Test 3: Check project structure
    required_files = [
        'backend/database/supabase_client.py',
        'data/user_stats.json'
    ]
    for file_path in required_files:
        if not os.path.exists(file_path):
            errors.append(f"Required file not found: {file_path}")
        else:
            print_success(f"Found: {file_path}")
    
    if errors:
        print_error("Environment test failed:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    print_success("Environment test passed")
    return True

async def test_supabase_connection():
    """Test Supabase database connection"""
    print_status("Testing Supabase connection...")
    
    try:
        from database.supabase_client import get_supabase, test_supabase_connection
        
        # Test connection
        result = test_supabase_connection()
        
        if result['success']:
            print_success("Supabase connection successful")
            return True
        else:
            print_error(f"Supabase connection failed: {result['message']}")
            return False
            
    except Exception as e:
        print_error(f"Failed to test Supabase connection: {e}")
        return False

async def check_database_schema():
    """Check if database schema exists"""
    print_status("Checking database schema...")
    
    try:
        from database.supabase_client import get_supabase
        client = get_supabase()
        
        # Check for key tables
        tables_to_check = ['users', 'typing_sessions', 'user_statistics', 'achievements']
        existing_tables = []
        missing_tables = []
        
        for table in tables_to_check:
            try:
                # Try to query the table
                result = client.table(table).select('count').limit(1).execute()
                existing_tables.append(table)
                print_success(f"Table '{table}' exists")
            except Exception:
                missing_tables.append(table)
                print_warning(f"Table '{table}' not found")
        
        if missing_tables:
            print_warning(f"Missing tables: {', '.join(missing_tables)}")
            print_warning("You may need to run the database schema setup first")
            return False, missing_tables
        
        print_success("All required tables found")
        return True, []
        
    except Exception as e:
        print_error(f"Failed to check database schema: {e}")
        return False, []

async def load_existing_data():
    """Load existing JSON data files"""
    print_status("Loading existing data files...")
    
    data = {
        'user_stats': None,
        'sessions': [],
        'achievements': []
    }
    
    # Load user stats
    stats_file = 'data/user_stats.json'
    if os.path.exists(stats_file):
        try:
            with open(stats_file, 'r') as f:
                data['user_stats'] = json.load(f)
            print_success(f"Loaded user stats: {data['user_stats'].get('totalSessions', 0)} sessions")
        except Exception as e:
            print_warning(f"Failed to load user stats: {e}")
    else:
        print_warning(f"User stats file not found: {stats_file}")
    
    # Load sessions (if they exist in separate file)
    sessions_file = 'data/typing_sessions.json'
    if os.path.exists(sessions_file):
        try:
            with open(sessions_file, 'r') as f:
                data['sessions'] = json.load(f)
            print_success(f"Loaded {len(data['sessions'])} typing sessions")
        except Exception as e:
            print_warning(f"Failed to load sessions: {e}")
    
    return data

async def migrate_user_data(data: Dict):
    """Migrate user data to Supabase"""
    print_status("Migrating user data...")
    
    try:
        from database.supabase_client import get_supabase
        client = get_supabase()
        
        # Create anonymous user
        user_data = {
            'username': 'anonymous',
            'email': None,
            'is_anonymous': True,
            'preferences': {}
        }
        
        # Check if user already exists
        existing_user = client.table('users').select('*').eq('username', 'anonymous').execute()
        
        if existing_user.data:
            user_id = existing_user.data[0]['id']
            print_success(f"Found existing anonymous user: {user_id}")
        else:
            # Create new user
            result = client.table('users').insert(user_data).execute()
            if result.data:
                user_id = result.data[0]['id']
                print_success(f"Created new anonymous user: {user_id}")
            else:
                raise Exception("Failed to create user")
        
        # Migrate user statistics
        if data['user_stats']:
            stats_data = {
                'user_id': user_id,
                'total_sessions': data['user_stats'].get('totalSessions', 0),
                'total_practice_time_minutes': data['user_stats'].get('practiceMinutes', 0),
                'average_wpm': float(data['user_stats'].get('averageWpm', 0)),
                'best_wpm': data['user_stats'].get('personalBest', {}).get('wpm', 0),
                'average_accuracy': float(data['user_stats'].get('accuracy', 0)),
                'best_accuracy': data['user_stats'].get('personalBest', {}).get('accuracy', 0),
                'current_streak': data['user_stats'].get('currentStreak', 0),
                'longest_streak': data['user_stats'].get('currentStreak', 0),
                'last_practice_date': data['user_stats'].get('lastSessionDate')
            }
            
            # Check if stats already exist
            existing_stats = client.table('user_statistics').select('*').eq('user_id', user_id).execute()
            
            if existing_stats.data:
                # Update existing stats
                result = client.table('user_statistics').update(stats_data).eq('user_id', user_id).execute()
                print_success("Updated existing user statistics")
            else:
                # Insert new stats
                result = client.table('user_statistics').insert(stats_data).execute()
                print_success("Inserted new user statistics")
        
        # Migrate recent sessions
        if data['user_stats'] and 'recentSessions' in data['user_stats']:
            sessions = data['user_stats']['recentSessions']
            for i, session in enumerate(sessions[:10]):  # Limit to last 10 sessions
                session_data = {
                    'user_id': user_id,
                    'session_type': 'practice',
                    'content_type': session.get('mode', 'custom').lower(),
                    'content_preview': f"Migrated session {i+1}",
                    'wpm': int(session.get('wpm', 0)),
                    'accuracy': int(session.get('accuracy', 0)),
                    'duration_seconds': float(session.get('raw_duration', 60)),
                    'characters_typed': session.get('word_count', 0) * 5,  # Estimate
                    'session_data': {
                        'migrated': True,
                        'original_duration': session.get('duration', ''),
                        'timestamp': session.get('timestamp', session.get('date'))
                    }
                }
                
                try:
                    result = client.table('typing_sessions').insert(session_data).execute()
                    print_success(f"Migrated session {i+1}: {session.get('wpm')} WPM")
                except Exception as e:
                    print_warning(f"Failed to migrate session {i+1}: {e}")
        
        return user_id
        
    except Exception as e:
        print_error(f"Failed to migrate user data: {e}")
        raise

async def verify_migration(user_id: str):
    """Verify that migration was successful"""
    print_status("Verifying migration...")
    
    try:
        from database.supabase_client import get_supabase
        client = get_supabase()
        
        # Check user
        user_result = client.table('users').select('*').eq('id', user_id).execute()
        if user_result.data:
            print_success(f"✓ User verified: {user_result.data[0]['username']}")
        else:
            print_error("✗ User not found")
            return False
        
        # Check statistics
        stats_result = client.table('user_statistics').select('*').eq('user_id', user_id).execute()
        if stats_result.data:
            stats = stats_result.data[0]
            print_success(f"✓ Statistics verified: {stats['total_sessions']} sessions, {stats['average_wpm']} avg WPM")
        else:
            print_warning("⚠ Statistics not found")
        
        # Check sessions
        sessions_result = client.table('typing_sessions').select('*').eq('user_id', user_id).execute()
        if sessions_result.data:
            print_success(f"✓ Sessions verified: {len(sessions_result.data)} sessions migrated")
        else:
            print_warning("⚠ No sessions found")
        
        print_success("Migration verification completed")
        return True
        
    except Exception as e:
        print_error(f"Failed to verify migration: {e}")
        return False

async def main():
    """Main migration function"""
    print("🚀 TypeTutor: JSON to Supabase Migration")
    print("=" * 50)
    
    try:
        # Step 1: Test environment
        if not await test_environment():
            return False
        
        # Step 2: Test Supabase connection
        if not await test_supabase_connection():
            return False
        
        # Step 3: Check database schema
        schema_ok, missing_tables = await check_database_schema()
        if not schema_ok:
            print_error("Database schema is not ready for migration")
            print_warning("Please set up the database schema first:")
            print_warning("1. Go to your Supabase dashboard")
            print_warning("2. Run the SQL from scripts/database_schema.sql")
            print_warning("3. Or use the Supabase migration tools")
            return False
        
        # Step 4: Load existing data
        data = await load_existing_data()
        
        if not data['user_stats']:
            print_warning("No user stats found to migrate")
            print_warning("This might be a fresh installation")
            return True
        
        # Step 5: Migrate data
        print_status("Starting data migration...")
        user_id = await migrate_user_data(data)
        
        # Step 6: Verify migration
        if await verify_migration(user_id):
            print_success("\n🎉 Migration completed successfully!")
            print(f"   User ID: {user_id}")
            print(f"   Sessions: {data['user_stats'].get('totalSessions', 0)}")
            print(f"   Avg WPM: {data['user_stats'].get('averageWpm', 0)}")
            print("\nNext steps:")
            print("1. Update your app configuration to use USE_DATABASE=true")
            print("2. Test the backend with database integration")
            print("3. Deploy to Railway")
            return True
        else:
            print_error("Migration verification failed")
            return False
        
    except Exception as e:
        print_error(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Ensure we can import required modules
    try:
        import supabase
    except ImportError:
        print_error("Supabase module not found!")
        print_warning("Please run: pip install supabase")
        print_warning("Or run the fix_dependencies.sh script first")
        sys.exit(1)
    
    # Run migration
    success = asyncio.run(main())
    sys.exit(0 if success else 1)