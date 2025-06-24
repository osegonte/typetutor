# backend/services/simple_database_service.py
import os
import requests
import json
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
    
    async def get_user_statistics(self, user_id: str) -> Dict:
        try:
            # Get user stats
            response = requests.get(
                f"{self.url}/rest/v1/user_statistics?user_id=eq.{user_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    stats = data[0]
                    
                    # Get recent sessions
                    sessions_response = requests.get(
                        f"{self.url}/rest/v1/typing_sessions?user_id=eq.{user_id}&order=created_at.desc&limit=5",
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
                                'wpm': session['wmp'],
                                'accuracy': session['accuracy'],
                                'mode': session['session_type'].title()
                            })
                    
                    return {
                        'averageWmp': int(stats.get('avg_wmp', 0)),
                        'accuracy': int(stats.get('avg_accuracy', 0)),
                        'practiceMinutes': stats.get('total_time_minutes', 0),
                        'currentStreak': stats.get('current_streak', 0),
                        'totalSessions': stats.get('total_sessions', 0),
                        'recentSessions': recent_sessions,
                        'personalBest': {
                            'wmp': stats.get('best_wmp', 0),
                            'accuracy': stats.get('best_accuracy', 0),
                            'date': stats.get('last_practice_date')
                        }
                    }
            
            # Return default stats if no data found
            return {
                'averageWmp': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                'personalBest': {'wmp': 0, 'accuracy': 0, 'date': None}
            }
            
        except Exception as e:
            print(f"Error getting stats: {e}")
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
                'wpm': float(session_data['wpm']),
                'accuracy': float(session_data['accuracy']),
                'duration_seconds': int(session_data['duration_seconds']),
                'characters_typed': session_data.get('characters_typed', 0),
                'errors_count': session_data.get('errors_count', 0)
            }
            
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
                    'new_achievements': [],
                    'message': 'Session saved via REST API'
                }
            else:
                raise Exception(f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"Error saving session: {e}")
            raise

def get_simple_supabase_service():
    return SimpleSupabaseService()
