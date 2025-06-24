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
            # Create client with minimal options to avoid version conflicts
            self.client = create_client(self.url, self.key)
            self._test_connection()
        except ImportError:
            raise ImportError("Run: pip install supabase")
        except Exception as e:
            # If there's a client creation error, log it but don't crash
            logger.error(f"Supabase client creation failed: {e}")
            raise
    
    def _test_connection(self):
        try:
            # Simple connection test
            result = self.client.table('achievements').select('id').limit(1).execute()
            logger.info("✅ Supabase connection established")
            return True
        except Exception as e:
            logger.error(f"❌ Supabase connection test failed: {e}")
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
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            # Return default stats on error
            return {
                'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None}
            }
    
    async def save_typing_session(self, session_data: Dict) -> Dict:
        try:
            db_session = {
                'user_id': session_data['user_id'],
                'session_type': session_data.get('session_type', 'practice'),
                'content_source': session_data.get('content_source', 'custom'),
                'wpm': float(session_data['wpm']),
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
                    'new_achievements': [],
                    'message': 'Session saved to database'
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

# Test function
def test_connection():
    try:
        service = get_supabase_service()
        return True
    except Exception as e:
        print(f"Connection test failed: {e}")
        return False
