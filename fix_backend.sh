#!/bin/bash
# Let's fix your TypeTutor backend step by step

echo "🔧 TypeTutor Backend Fix - Step by Step"
echo "======================================="

# Step 1: Create the directory structure
echo "Step 1: Creating directory structure..."
mkdir -p backend/services
mkdir -p backend/routes  
mkdir -p backend/utils
mkdir -p backend/database
mkdir -p backend/config
mkdir -p backend/models

# Create __init__.py files
touch backend/__init__.py
touch backend/services/__init__.py
touch backend/routes/__init__.py
touch backend/utils/__init__.py
touch backend/database/__init__.py
touch backend/config/__init__.py
touch backend/models/__init__.py

echo "✅ Directory structure created"

# Step 2: Install dependencies
echo "Step 2: Installing dependencies..."
pip install supabase==2.3.4 asyncio-pool==0.6.0

# Step 3: Add dependencies to requirements.txt
if ! grep -q "supabase" requirements.txt 2>/dev/null; then
    echo "supabase==2.3.4" >> requirements.txt
    echo "asyncio-pool==0.6.0" >> requirements.txt
fi

echo "✅ Dependencies installed"

# Step 4: Create enhanced database service
echo "Step 3: Creating enhanced database service..."
cat > backend/services/enhanced_database_service.py << 'EOF'
# backend/services/enhanced_database_service.py
import os
import logging
from typing import Dict
from datetime import datetime

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.url = os.environ.get('SUPABASE_URL')
        self.key = os.environ.get('SUPABASE_ANON_KEY')
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY required")
        
        try:
            from supabase import create_client
            self.client = create_client(self.url, self.key)
            self._test_connection()
        except ImportError:
            raise ImportError("Run: pip install supabase")
    
    def _test_connection(self):
        try:
            result = self.client.table('achievements').select('count').limit(1).execute()
            logger.info("✅ Supabase connection established")
        except Exception as e:
            logger.error(f"❌ Supabase connection failed: {e}")
            raise
    
    async def get_user_statistics(self, user_id: str) -> Dict:
        try:
            # Try to get from database first
            stats_result = self.client.table('user_statistics').select('*').eq('user_id', user_id).execute()
            
            if not stats_result.data:
                # Return default stats for new users
                return {
                    'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                    'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                    'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None}
                }
            
            stats = stats_result.data[0]
            
            # Get recent sessions
            sessions_result = self.client.table('typing_sessions')\
                .select('*').eq('user_id', user_id)\
                .order('created_at', desc=True).limit(5).execute()
            
            recent_sessions = []
            for session in sessions_result.data:
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
                'averageWpm': int(stats['avg_wmp']),
                'accuracy': int(stats['avg_accuracy']),
                'practiceMinutes': stats['total_time_minutes'],
                'currentStreak': stats['current_streak'],
                'totalSessions': stats['total_sessions'],
                'recentSessions': recent_sessions,
                'personalBest': {
                    'wpm': stats['best_wmp'],
                    'accuracy': stats['best_accuracy'],
                    'date': stats['last_practice_date']
                }
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            # Return default stats on error
            return {
                'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': []
            }
    
    async def save_typing_session(self, session_data: Dict) -> Dict:
        try:
            db_session = {
                'user_id': session_data['user_id'],
                'session_type': session_data.get('session_type', 'practice'),
                'content_source': session_data.get('content_source', 'custom'),
                'wmp': float(session_data['wmp']),
                'accuracy': float(session_data['accuracy']),
                'duration_seconds': int(session_data['duration_seconds']),
                'characters_typed': session_data.get('characters_typed', 0),
                'errors_count': session_data.get('errors_count', 0)
            }
            
            result = self.client.table('typing_sessions').insert(db_session).execute()
            
            if result.data:
                return {
                    'success': True,
                    'session_id': result.data[0]['id'],
                    'new_achievements': []
                }
            else:
                raise Exception("Failed to save session")
        except Exception as e:
            logger.error(f"Error saving session: {e}")
            raise

# Global service instance
_supabase_service = None

def get_supabase_service():
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
