#!/bin/bash
# fix_user_id_uuid.sh - Fix UUID user_id issue

echo "🔧 Fixing User ID UUID Issue"
echo "============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

print_status "Backing up database service..."
cp backend/services/simple_database_service.py backend/services/simple_database_service.py.uuid-backup

print_status "Creating user management system with UUID support..."

cat > backend/services/simple_database_service.py << 'EOF'
# backend/services/simple_database_service.py (WITH UUID USER MANAGEMENT)
import os
import requests
import json
import uuid
from typing import Dict

class SimpleSupabaseService:
    def __init__(self):
        self.url = os.environ.get('SUPABASE_URL')
        self.key = os.environ.get('SUPABASE_ANON_KEY')
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY required")
        
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json'
        }
        
        # Test connection
        self._test_connection()
    
    def _test_connection(self):
        try:
            response = requests.get(
                f"{self.url}/rest/v1/achievements?select=id&limit=1",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                print("✅ Simple Supabase connection works!")
                return True
            else:
                raise Exception(f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ Simple Supabase connection failed: {e}")
            raise
    
    def _get_or_create_user(self, user_identifier: str) -> str:
        """Get existing user UUID or create new user, returns UUID"""
        try:
            # First, try to find existing user by username
            response = requests.get(
                f"{self.url}/rest/v1/users_profile?username=eq.{user_identifier}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    print(f"Found existing user: {data[0]['id']}")
                    return data[0]['id']
            
            # Create new user if not found
            new_user_id = str(uuid.uuid4())
            user_data = {
                'id': new_user_id,
                'username': user_identifier,
                'display_name': user_identifier,
                'is_anonymous': True
            }
            
            create_response = requests.post(
                f"{self.url}/rest/v1/users_profile",
                headers=self.headers,
                json=user_data,
                timeout=10
            )
            
            if create_response.status_code in [200, 201]:
                print(f"Created new user: {new_user_id}")
                return new_user_id
            else:
                print(f"Failed to create user: {create_response.text}")
                # Fallback: generate UUID for this session
                fallback_uuid = str(uuid.uuid4())
                print(f"Using fallback UUID: {fallback_uuid}")
                return fallback_uuid
                
        except Exception as e:
            print(f"Error in user management: {e}")
            # Fallback: generate UUID for this session
            fallback_uuid = str(uuid.uuid4())
            print(f"Using fallback UUID: {fallback_uuid}")
            return fallback_uuid
    
    async def get_user_statistics(self, user_id: str) -> Dict:
        try:
            # Convert user_id to UUID if needed
            actual_user_id = self._get_or_create_user(user_id)
            
            # Get user stats
            response = requests.get(
                f"{self.url}/rest/v1/user_statistics?user_id=eq.{actual_user_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    stats = data[0]
                    
                    # Get recent sessions
                    sessions_response = requests.get(
                        f"{self.url}/rest/v1/typing_sessions?user_id=eq.{actual_user_id}&order=created_at.desc&limit=5",
                        headers=self.headers,
                        timeout=10
                    )
                    
                    recent_sessions = []
                    if sessions_response.status_code == 200:
                        sessions_data = sessions_response.json()
                        for session in sessions_data:
                            duration = session['duration_seconds']
                            minutes = int(duration // 60)
                            seconds = int(duration % 60)
                            recent_sessions.append({
                                'date': session['created_at'][:10],
                                'duration': f"{minutes}m {seconds}s",
                                'wpm': session['wpm'],
                                'accuracy': session['accuracy'],
                                'mode': session['session_type'].title()
                            })
                    
                    return {
                        'averageWpm': int(stats.get('avg_wpm', 0)),
                        'accuracy': int(stats.get('avg_accuracy', 0)),
                        'practiceMinutes': stats.get('total_time_minutes', 0),
                        'currentStreak': stats.get('current_streak', 0),
                        'totalSessions': stats.get('total_sessions', 0),
                        'recentSessions': recent_sessions,
                        'personalBest': {
                            'wpm': stats.get('best_wpm', 0),
                            'accuracy': stats.get('best_accuracy', 0),
                            'date': stats.get('last_practice_date')
                        }
                    }
            
            # Return default stats if no data found
            return {
                'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None}
            }
            
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {
                'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': []
            }
    
    async def save_typing_session(self, session_data: Dict) -> Dict:
        try:
            # Convert user_id to UUID if needed
            actual_user_id = self._get_or_create_user(session_data['user_id'])
            
            # Prepare session data with proper types and UUID
            db_session = {
                'user_id': actual_user_id,  # Now using proper UUID
                'session_type': session_data.get('session_type', 'practice'),
                'content_type': session_data.get('content_source', 'custom'),
                'wpm': int(round(float(session_data['wpm']))),
                'accuracy': int(round(float(session_data['accuracy']))),
                'duration_seconds': int(float(session_data['duration_seconds'])),
                'characters_typed': int(session_data.get('characters_typed', 0)),
                'errors_count': int(session_data.get('errors_count', 0))
            }
            
            print(f"Sending to database with UUID: {db_session}")
            
            response = requests.post(
                f"{self.url}/rest/v1/typing_sessions",
                headers=self.headers,
                json=db_session,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                return {
                    'success': True,
                    'session_id': result[0]['id'] if result else 'saved',
                    'user_uuid': actual_user_id,
                    'new_achievements': [],
                    'message': 'Session saved to Supabase database!'
                }
            else:
                raise Exception(f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"Error saving session: {e}")
            raise

def get_simple_supabase_service():
    return SimpleSupabaseService()
EOF

print_success "Database service updated with UUID user management"

echo ""
print_success "✅ UUID User Management Fix Applied!"
echo ""
echo "Changes made:"
echo "• Added _get_or_create_user() method"
echo "• Automatically creates users with proper UUIDs"
echo "• Looks up existing users by username"
echo "• Fallback UUID generation for errors"
echo "• Enhanced logging and error handling"
echo ""
echo "Now restart your backend and test:"
echo "1. Press Ctrl+C in the backend terminal"
echo "2. Run: python app.py"
echo "3. Test with the same curl command - it should now work!"