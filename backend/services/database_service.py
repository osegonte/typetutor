from typing import Dict, List, Optional, Any
from datetime import datetime, date
import uuid
import json
import logging
from database.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.supabase = get_supabase()
        self.logger = logger
    
    # User Management
    async def get_or_create_user(self, user_identifier: str = "anonymous") -> Dict:
        """Get existing user or create anonymous user"""
        try:
            # Try to find existing user
            result = self.supabase.table('users').select('*').eq('username', user_identifier).execute()
            
            if result.data:
                return result.data[0]
            
            # Create new anonymous user
            user_data = {
                'username': user_identifier,
                'is_anonymous': True,
                'preferences': {}
            }
            
            result = self.supabase.table('users').insert(user_data).execute()
            
            if result.data:
                # Initialize user statistics
                await self.init_user_statistics(result.data[0]['id'])
                return result.data[0]
            
            raise Exception("Failed to create user")
            
        except Exception as e:
            self.logger.error(f"Error in get_or_create_user: {e}")
            raise
    
    async def init_user_statistics(self, user_id: str):
        """Initialize user statistics"""
        stats_data = {
            'user_id': user_id,
            'total_sessions': 0,
            'total_practice_time_minutes': 0,
            'average_wpm': 0,
            'best_wpm': 0,
            'average_accuracy': 0,
            'best_accuracy': 0,
            'current_streak': 0,
            'longest_streak': 0
        }
        
        self.supabase.table('user_statistics').insert(stats_data).execute()
    
    # Session Management
    async def save_typing_session(self, session_data: Dict) -> Dict:
        """Save typing session to database"""
        try:
            # Get or create user
            user = await self.get_or_create_user(session_data.get('userId', 'anonymous'))
            
            # Prepare session data
            db_session = {
                'user_id': user['id'],
                'session_type': session_data.get('sessionType', 'practice'),
                'content_type': session_data.get('contentType', 'custom'),
                'content_preview': str(session_data.get('contentPreview', ''))[:100],
                'wpm': int(session_data['wpm']),
                'accuracy': int(session_data['accuracy']),
                'duration_seconds': float(session_data['duration']),
                'characters_typed': session_data.get('charactersTyped', 0),
                'errors_count': session_data.get('errorsCount', 0),
                'corrections_count': session_data.get('correctionsCount', 0),
                'keystrokes': session_data.get('keystrokes', []),
                'session_data': {
                    'device_info': session_data.get('deviceInfo', {}),
                    'practice_mode': session_data.get('practiceMode', 'paragraph')
                }
            }
            
            # Save session
            result = self.supabase.table('typing_sessions').insert(db_session).execute()
            
            if result.data:
                # Update user statistics
                await self.update_user_statistics(user['id'], session_data)
                # Check for achievements
                new_achievements = await self.check_achievements(user['id'], session_data)
                return {
                    'success': True, 
                    'session_id': result.data[0]['id'],
                    'new_achievements': new_achievements
                }
            
            raise Exception("Failed to save session")
            
        except Exception as e:
            self.logger.error(f"Error saving session: {e}")
            raise
    
    async def update_user_statistics(self, user_id: str, session_data: Dict):
        """Update user statistics after session"""
        try:
            # Get current stats
            stats_result = self.supabase.table('user_statistics').select('*').eq('user_id', user_id).execute()
            
            if not stats_result.data:
                await self.init_user_statistics(user_id)
                stats_result = self.supabase.table('user_statistics').select('*').eq('user_id', user_id).execute()
            
            current_stats = stats_result.data[0]
            
            # Calculate new statistics
            total_sessions = current_stats['total_sessions'] + 1
            
            # Update averages
            old_avg_wpm = current_stats['average_wpm']
            old_avg_accuracy = current_stats['average_accuracy']
            
            new_avg_wpm = ((old_avg_wpm * (total_sessions - 1)) + session_data['wpm']) / total_sessions
            new_avg_accuracy = ((old_avg_accuracy * (total_sessions - 1)) + session_data['accuracy']) / total_sessions
            
            # Update practice time
            practice_minutes = current_stats['total_practice_time_minutes'] + max(1, int(session_data['duration'] / 60))
            
            # Update streak
            today = date.today()
            last_practice = current_stats.get('last_practice_date')
            current_streak = current_stats['current_streak']
            
            if last_practice:
                if isinstance(last_practice, str):
                    last_date = datetime.fromisoformat(last_practice).date()
                else:
                    last_date = last_practice
                
                days_diff = (today - last_date).days
                if days_diff == 0:
                    pass  # Same day
                elif days_diff == 1:
                    current_streak += 1
                else:
                    current_streak = 1
            else:
                current_streak = 1
            
            # Prepare update data
            update_data = {
                'total_sessions': total_sessions,
                'total_practice_time_minutes': practice_minutes,
                'average_wpm': round(new_avg_wpm, 2),
                'average_accuracy': round(new_avg_accuracy, 2),
                'best_wpm': max(current_stats['best_wpm'], session_data['wpm']),
                'best_accuracy': max(current_stats['best_accuracy'], session_data['accuracy']),
                'current_streak': current_streak,
                'longest_streak': max(current_stats['longest_streak'], current_streak),
                'last_practice_date': today.isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            # Update statistics
            self.supabase.table('user_statistics').update(update_data).eq('user_id', user_id).execute()
            
        except Exception as e:
            self.logger.error(f"Error updating statistics: {e}")
            raise
    
    # Statistics Retrieval
    async def get_user_statistics(self, user_id: str = "anonymous") -> Dict:
        """Get user statistics"""
        try:
            user = await self.get_or_create_user(user_id)
            
            # Get statistics
            stats_result = self.supabase.table('user_statistics').select('*').eq('user_id', user['id']).execute()
            
            if not stats_result.data:
                await self.init_user_statistics(user['id'])
                stats_result = self.supabase.table('user_statistics').select('*').eq('user_id', user['id']).execute()
            
            stats = stats_result.data[0]
            
            # Get recent sessions
            sessions_result = self.supabase.table('typing_sessions')\
                .select('*')\
                .eq('user_id', user['id'])\
                .order('created_at', desc=True)\
                .limit(5)\
                .execute()
            
            # Format recent sessions
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
                    'mode': session['content_type'].title()
                })
            
            return {
                'averageWpm': int(stats['average_wpm']),
                'accuracy': int(stats['average_accuracy']),
                'practiceMinutes': stats['total_practice_time_minutes'],
                'currentStreak': stats['current_streak'],
                'totalSessions': stats['total_sessions'],
                'bestWpm': stats['best_wpm'],
                'longestStreak': stats['longest_streak'],
                'recentSessions': recent_sessions,
                'personalBest': {
                    'wpm': stats['best_wpm'],
                    'accuracy': stats['best_accuracy'],
                    'date': stats['last_practice_date']
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting statistics: {e}")
            raise
    
    # Achievement System
    async def check_achievements(self, user_id: str, session_data: Dict) -> List[Dict]:
        """Check for new achievements after a session"""
        try:
            # Get user's current achievements
            user_achievements_result = self.supabase.table('user_achievements')\
                .select('achievement_id')\
                .eq('user_id', user_id)\
                .eq('status', 'earned')\
                .execute()
            
            earned_achievement_ids = {ach['achievement_id'] for ach in user_achievements_result.data}
            
            # Get all available achievements
            achievements_result = self.supabase.table('achievements')\
                .select('*')\
                .eq('is_active', True)\
                .execute()
            
            # Get current user stats for checking
            stats_result = self.supabase.table('user_statistics').select('*').eq('user_id', user_id).execute()
            user_stats = stats_result.data[0] if stats_result.data else {}
            
            new_achievements = []
            
            for achievement in achievements_result.data:
                if achievement['id'] in earned_achievement_ids:
                    continue
                
                earned = False
                category = achievement['category']
                criteria = achievement['criteria']
                
                if category == 'speed':
                    earned = session_data['wpm'] >= criteria.get('min_wpm', 0)
                elif category == 'accuracy':
                    earned = session_data['accuracy'] >= criteria.get('min_accuracy', 0)
                elif category == 'streak':
                    earned = user_stats.get('current_streak', 0) >= criteria.get('days', 0)
                elif category == 'milestone':
                    earned = user_stats.get('total_sessions', 0) >= criteria.get('session_count', 0)
                
                if earned:
                    # Award achievement
                    achievement_data = {
                        'user_id': user_id,
                        'achievement_id': achievement['id'],
                        'progress_value': achievement['target_value'],
                        'progress_percentage': 100,
                        'status': 'earned',
                        'earned_at': datetime.now().isoformat()
                    }
                    
                    self.supabase.table('user_achievements').insert(achievement_data).execute()
                    
                    new_achievements.append({
                        'id': achievement['id'],
                        'title': achievement['title'],
                        'description': achievement['description'],
                        'icon': achievement['icon'],
                        'points': achievement['points'],
                        'rarity': achievement['rarity']
                    })
            
            return new_achievements
            
        except Exception as e:
            self.logger.error(f"Error checking achievements: {e}")
            return []
    
    async def get_user_achievements(self, user_id: str) -> List[Dict]:
        """Get user's earned achievements"""
        try:
            user = await self.get_or_create_user(user_id)
            
            result = self.supabase.table('user_achievements')\
                .select('*, achievements(*)')\
                .eq('user_id', user['id'])\
                .eq('status', 'earned')\
                .order('earned_at', desc=True)\
                .execute()
            
            achievements = []
            for item in result.data:
                achievement = item['achievements']
                achievements.append({
                    'id': achievement['id'],
                    'title': achievement['title'],
                    'description': achievement['description'],
                    'icon': achievement['icon'],
                    'points': achievement['points'],
                    'rarity': achievement['rarity'],
                    'earned_at': item['earned_at']
                })
            
            return achievements
            
        except Exception as e:
            self.logger.error(f"Error getting user achievements: {e}")
            return []