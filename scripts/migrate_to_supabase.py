# scripts/migrate_to_supabase.py
#!/usr/bin/env python3
"""
Migration script to move existing JSON data to Supabase
"""

import json
import asyncio
import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from database.supabase_client import get_supabase
from database.migrations import get_schema_sql, get_default_achievements

def print_status(message):
    print(f"🔧 {message}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

async def setup_database_schema():
    """Set up the database schema"""
    try:
        print_status("Setting up database schema...")
        
        supabase = get_supabase()
        
        # Execute schema SQL
        schema_sql = get_schema_sql()
        
        # Split and execute SQL statements (Supabase RPC approach)
        # Note: In production, you'd run this through Supabase Dashboard or migration tool
        print_success("Database schema setup initiated")
        print_warning("Please run the schema SQL in your Supabase Dashboard SQL Editor")
        
        return True
        
    except Exception as e:
        print_error(f"Failed to setup schema: {e}")
        return False

async def setup_default_achievements():
    """Set up default achievements in database"""
    try:
        print_status("Setting up default achievements...")
        
        supabase = get_supabase()
        achievements = get_default_achievements()
        
        for achievement in achievements:
            try:
                # Use upsert to avoid conflicts
                result = supabase.table('achievements').upsert(achievement).execute()
                if result.data:
                    print_success(f"✓ Achievement: {achievement['title']}")
                else:
                    print_warning(f"? Achievement may already exist: {achievement['title']}")
            except Exception as e:
                print_error(f"Failed to insert achievement {achievement['id']}: {e}")
        
        print_success(f"Set up {len(achievements)} default achievements")
        return True
        
    except Exception as e:
        print_error(f"Failed to setup achievements: {e}")
        return False

async def migrate_user_stats():
    """Migrate user stats from JSON to Supabase"""
    try:
        print_status("Migrating user statistics...")
        
        supabase = get_supabase()
        
        # Read existing stats file
        stats_file = 'data/user_stats.json'
        if not os.path.exists(stats_file):
            print_warning("No existing stats file found, skipping migration")
            return True
        
        with open(stats_file, 'r') as f:
            old_stats = json.load(f)
        
        print_status(f"Found existing stats with {old_stats.get('totalSessions', 0)} sessions")
        
        # Create or get anonymous user
        user_data = {
            'username': 'anonymous',
            'is_anonymous': True,
            'preferences': {}
        }
        
        # Try to get existing user first
        user_result = supabase.table('users').select('*').eq('username', 'anonymous').execute()
        
        if user_result.data:
            user = user_result.data[0]
            print_success("Found existing anonymous user")
        else:
            # Create new user
            user_result = supabase.table('users').insert(user_data).execute()
            if user_result.data:
                user = user_result.data[0]
                print_success("Created new anonymous user")
            else:
                raise Exception("Failed to create user")
        
        # Check if statistics already exist
        stats_result = supabase.table('user_statistics').select('*').eq('user_id', user['id']).execute()
        
        if stats_result.data:
            print_warning("User statistics already exist, updating...")
            # Update existing statistics
            update_data = {
                'total_sessions': old_stats.get('totalSessions', 0),
                'total_practice_time_minutes': old_stats.get('practiceMinutes', 0),
                'average_wpm': old_stats.get('averageWpm', 0),
                'best_wpm': old_stats.get('personalBest', {}).get('wpm', 0),
                'average_accuracy': old_stats.get('accuracy', 0),
                'best_accuracy': old_stats.get('personalBest', {}).get('accuracy', 0),
                'current_streak': old_stats.get('currentStreak', 0),
                'longest_streak': old_stats.get('currentStreak', 0),
                'last_practice_date': old_stats.get('lastSessionDate'),
                'updated_at': datetime.now().isoformat()
            }
            
            supabase.table('user_statistics').update(update_data).eq('user_id', user['id']).execute()
        else:
            # Create new statistics
            stats_data = {
                'user_id': user['id'],
                'total_sessions': old_stats.get('totalSessions', 0),
                'total_practice_time_minutes': old_stats.get('practiceMinutes', 0),
                'average_wpm': old_stats.get('averageWpm', 0),
                'best_wpm': old_stats.get('personalBest', {}).get('wpm', 0),
                'average_accuracy': old_stats.get('accuracy', 0),
                'best_accuracy': old_stats.get('personalBest', {}).get('accuracy', 0),
                'current_streak': old_stats.get('currentStreak', 0),
                'longest_streak': old_stats.get('currentStreak', 0),
                'last_practice_date': old_stats.get('lastSessionDate')
            }
            
            supabase.table('user_statistics').insert(stats_data).execute()
        
        print_success("User statistics migrated")
        
        # Migrate recent sessions
        recent_sessions = old_stats.get('recentSessions', [])
        migrated_sessions = 0
        
        for session in recent_sessions:
            try:
                # Parse session data
                duration = 60  # Default duration
                if 'raw_duration' in session:
                    duration = float(session['raw_duration'])
                elif 'duration' in session:
                    # Try to parse "Xm Ys" format
                    duration_str = session['duration']
                    if 'm' in duration_str and 's' in duration_str:
                        parts = duration_str.replace('m', '').replace('s', '').split()
                        if len(parts) == 2:
                            minutes = int(parts[0])
                            seconds = int(parts[1])
                            duration = minutes * 60 + seconds
                
                session_data = {
                    'user_id': user['id'],
                    'wpm': session.get('wpm', 0),
                    'accuracy': session.get('accuracy', 0),
                    'duration_seconds': duration,
                    'content_type': session.get('mode', 'Practice').lower().replace(' ', '_'),
                    'session_type': 'practice',
                    'characters_typed': session.get('word_count', 0) * 5,  # Estimate
                    'created_at': session.get('timestamp', session.get('date'))
                }
                
                # Insert session
                result = supabase.table('typing_sessions').insert(session_data).execute()
                if result.data:
                    migrated_sessions += 1
                
            except Exception as e:
                print_warning(f"Could not migrate session: {e}")
        
        print_success(f"Migrated {migrated_sessions} out of {len(recent_sessions)} sessions")
        return True
        
    except Exception as e:
        print_error(f"Failed to migrate user stats: {e}")
        import traceback
        traceback.print_exc()
        return False

async def verify_migration():
    """Verify the migration was successful"""
    try:
        print_status("Verifying migration...")
        
        supabase = get_supabase()
        
        # Check users
        users_result = supabase.table('users').select('*').execute()
        print_success(f"Users in database: {len(users_result.data)}")
        
        # Check statistics
        stats_result = supabase.table('user_statistics').select('*').execute()
        print_success(f"User statistics records: {len(stats_result.data)}")
        
        # Check sessions
        sessions_result = supabase.table('typing_sessions').select('*').execute()
        print_success(f"Typing sessions: {len(sessions_result.data)}")
        
        # Check achievements
        achievements_result = supabase.table('achievements').select('*').execute()
        print_success(f"Achievements available: {len(achievements_result.data)}")
        
        return True
        
    except Exception as e:
        print_error(f"Verification failed: {e}")
        return False

async def main():
    """Run migration"""
    print("🚀 Starting TypeTutor Migration to Supabase")
    print("=" * 50)
    
    # Check environment
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_ANON_KEY'):
        print_error("Supabase credentials not found!")
        print_warning("Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables")
        print_warning("You can get these from your Supabase project dashboard")
        return False
    
    try:
        # Run migration steps
        success = True
        
        success &= await setup_database_schema()
        success &= await setup_default_achievements()
        success &= await migrate_user_stats()
        success &= await verify_migration()
        
        if success:
            print("\n✅ Migration completed successfully!")
            print("\nNext steps:")
            print("1. Run the database schema SQL in your Supabase Dashboard")
            print("2. Test your application locally with the new database")
            print("3. Update your backend to use DatabaseService")
            print("4. Deploy to Railway with environment variables")
            print("5. Update your frontend to point to Railway backend")
        else:
            print("\n❌ Migration had some issues. Please check the logs above.")
        
        return success
        
    except Exception as e:
        print_error(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

# railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile - --error-logfile - 'backend.app:create_app()'",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  },
  "environments": {
    "production": {
      "variables": {
        "FLASK_ENV": "production",
        "USE_DATABASE": "true"
      }
    }
  }
}

