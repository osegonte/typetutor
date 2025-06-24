# backend/services/enhanced_database_service.py
"""
Enhanced Database Service for TypeTutor with Supabase
Handles all database operations with proper authentication support
"""

import os
import logging
import json
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date, timedelta
import uuid
from supabase import create_client, Client
from postgrest.exceptions import APIError

logger = logging.getLogger(__name__)

class SupabaseService:
    """Enhanced Supabase service with comprehensive TypeTutor functionality"""
    
    def __init__(self):
        """Initialize Supabase client"""
        self.url = os.environ.get('SUPABASE_URL')
        self.key = os.environ.get('SUPABASE_ANON_KEY')
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
        
        self.client: Client = create_client(self.url, self.key)
        self._test_connection()
    
    def _test_connection(self):
        """Test database connection"""
        try:
            # Simple test query
            result = self.client.table('achievements').select('count').limit(1).execute()
            logger.info("✅ Supabase connection established successfully")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Supabase: {e}")
            raise
    
    # User Management
    async def create_user_profile(self, user_data: Dict) -> Dict:
        """Create user profile after authentication"""
        try:
            profile_data = {
                'id': user_data['id'],
                'username': user_data.get('username', f"user_{user_data['id'][:8]}"),
                'display_name': user_data.get('display_name', user_data.get('email', 'Anonymous')),
                'avatar_url': user_data.get('avatar_url'),
                'email_verified': user_data.get('email_verified', False),
                'preferences': user_data.get('preferences', {
                    'theme': 'light',
                    'typing_sound': False,
                    'show_wpm_real_time': True,
                    'difficulty_preference': 'medium'
                })
            }
            
            # Insert user profile
            result = self.client.table('users_profile').insert(profile_data).execute()
            
            if result.data:
                # Initialize user statistics
                await self._initialize_user_statistics(user_data['id'])
                logger.info(f"✅ User profile created: {user_data['id']}")
                return result.data[0]
            else:
                raise Exception("Failed to create user profile")
                
        except Exception as e:
            logger.error(f"❌ Error creating user profile: {e}")
            raise
    
    async def _initialize_user_statistics(self, user_id: str):
        """Initialize user statistics for new user"""
        try:
            stats_data = {
                'user_id': user_id,
                'period_type': 'all_time',
                'total_sessions': 0,
                'total_time_minutes': 0,
                'avg_wpm': 0.0,
                'avg_accuracy': 0.0,
                'best_wpm': 0.0,
                'best_accuracy': 0.0,
                'current_streak': 0,
                'longest_streak': 0
            }
            
            result = self.client.table('user_statistics').insert(stats_data).execute()
            logger.info(f"✅ User statistics initialized: {user_id}")
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"❌ Error initializing user statistics: {e}")
            raise
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get user profile by ID"""
        try:
            result = self.client.table('users_profile').select('*').eq('id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"❌ Error getting user profile: {e}")
            return None
    
    async def update_user_profile(self, user_id: str, updates: Dict) -> Optional[Dict]:
        """Update user profile"""
        try:
            # Filter out non-updatable fields
            allowed_fields = {
                'username', 'display_name', 'avatar_url', 'preferences', 
                'subscription_status', 'last_login'
            }
            filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
            
            if not filtered_updates:
                return await self.get_user_profile(user_id)
            
            result = self.client.table('users_profile').update(filtered_updates).eq('id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"❌ Error updating user profile: {e}")
            return None
    
    # Session Management
    async def save_typing_session(self, session_data: Dict) -> Dict:
        """Save typing session with comprehensive data"""
        try:
            # Validate required fields
            required_fields = ['user_id', 'wpm', 'accuracy', 'duration_seconds']
            for field in required_fields:
                if field not in session_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Prepare session data
            db_session = {
                'user_id': session_data['user_id'],
                'session_type': session_data.get('session_type', 'practice'),
                'content_source': session_data.get('content_source', 'custom'),
                'content_id': session_data.get('content_id'),
                'total_words': session_data.get('total_words', 0),
                'correct_words': session_data.get('correct_words', 0),
                'incorrect_words': session_data.get('incorrect_words', 0),
                'wpm': float(session_data['wpm']),
                'accuracy': float(session_data['accuracy']),
                'consistency_score': session_data.get('consistency_score', 85.0),
                'duration_seconds': int(session_data['duration_seconds']),
                'characters_typed': session_data.get('characters_typed', 0),
                'errors_count': session_data.get('errors_count', 0),
                'corrections_count': session_data.get('corrections_count', 0),
                'session_data': session_data.get('session_data', {}),
                'start_time': session_data.get('start_time', datetime.now().isoformat()),
                'end_time': session_data.get('end_time', datetime.now().isoformat())
            }
            
            # Save session
            result = self.client.table('typing_sessions').insert(db_session).execute()
            
            if result.data:
                session_id = result.data[0]['id']
                
                # Update user statistics
                await self._update_user_statistics(session_data['user_id'], session_data)
                
                # Check for achievements
                new_achievements = await self._check_achievements(session_data['user_id'], session_data)
                
                logger.info(f"✅ Session saved: {session_id}")
                return {
                    'success': True,
                    'session_id': session_id,
                    'new_achievements': new_achievements
                }
            else:
                raise Exception("Failed to save session")
                
        except Exception as e:
            logger.error(f"❌ Error saving session: {e}")
            raise
    
    async def _update_user_statistics(self, user_id: str, session_data: Dict):
        """Update user statistics after session"""
        try:
            # Get current statistics
            stats_result = self.client.table('user_statistics').select('*').eq('user_id', user_id).execute()
            
            if not stats_result.data:
                await self._initialize_user_statistics(user_id)
                stats_result = self.client.table('user_statistics').select('*').eq('user_id', user_id).execute()
            
            current_stats = stats_result.data[0]
            
            # Calculate new statistics
            total_sessions = current_stats['total_sessions'] + 1
            session_minutes = max(1, int(session_data['duration_seconds'] / 60))
            total_time = current_stats['total_time_minutes'] + session_minutes
            
            # Update averages (weighted)
            old_avg_wpm = current_stats['avg_wpm']
            old_avg_accuracy = current_stats['avg_accuracy']
            
            new_avg_wpm = ((old_avg_wmp * (total_sessions - 1)) + session_data['wpm']) / total_sessions
            new_avg_accuracy = ((old_avg_accuracy * (total_sessions - 1)) + session_data['accuracy']) / total_sessions
            
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
                    # Same day, keep streak
                    pass
                elif days_diff == 1:
                    # Consecutive day
                    current_streak += 1
                else:
                    # Streak broken
                    current_streak = 1
            else:
                current_streak = 1
            
            # Prepare update data
            update_data = {
                'total_sessions': total_sessions,
                'total_time_minutes': total_time,
                'avg_wpm': round(new_avg_wpm, 2),
                'avg_accuracy': round(new_avg_accuracy, 2),
                'best_wpm': max(current_stats['best_wpm'], session_data['wpm']),
                'best_accuracy': max(current_stats['best_accuracy'], session_data['accuracy']),
                'current_streak': current_streak,
                'longest_streak': max(current_stats['longest_streak'], current_streak),
                'last_practice_date': today.isoformat(),
                'favorite_practice_type': session_data.get('session_type', 'practice')
            }
            
            # Update statistics
            result = self.client.table('user_statistics').update(update_data).eq('user_id', user_id).execute()
            logger.info(f"✅ User statistics updated: {user_id}")
            
        except Exception as e:
            logger.error(f"❌ Error updating user statistics: {e}")
            raise
    
    async def _check_achievements(self, user_id: str, session_data: Dict) -> List[Dict]:
        """Check for new achievements"""
        try:
            # Get current user statistics
            stats_result = self.client.table('user_statistics').select('*').eq('user_id', user_id).execute()
            if not stats_result.data:
                return []
            
            user_stats = stats_result.data[0]
            
            # Call the database function to update achievements
            result = self.client.rpc('update_achievement_progress', {
                'p_user_id': user_id,
                'p_session_wpm': session_data['wmp'],
                'p_session_accuracy': session_data['accuracy'],
                'p_current_streak': user_stats['current_streak'],
                'p_total_sessions': user_stats['total_sessions'],
                'p_total_practice_minutes': user_stats['total_time_minutes']
            }).execute()
            
            new_achievements = result.data if result.data else []
            
            if new_achievements:
                logger.info(f"🏆 New achievements earned: {len(new_achievements)} for user {user_id}")
            
            return new_achievements
            
        except Exception as e:
            logger.error(f"❌ Error checking achievements: {e}")
            return []
    
    # Statistics Retrieval
    async def get_user_statistics(self, user_id: str) -> Dict:
        """Get comprehensive user statistics"""
        try:
            # Get main statistics
            stats_result = self.client.table('user_statistics').select('*').eq('user_id', user_id).execute()
            
            if not stats_result.data:
                await self._initialize_user_statistics(user_id)
                stats_result = self.client.table('user_statistics').select('*').eq('user_id', user_id).execute()
            
            stats = stats_result.data[0]
            
            # Get recent sessions
            sessions_result = self.client.table('typing_sessions')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(10)\
                .execute()
            
            # Format recent sessions
            recent_sessions = []
            for session in sessions_result.data:
                duration = session['duration_seconds']
                minutes = int(duration // 60)
                seconds = int(duration % 60)
                
                recent_sessions.append({
                    'id': session['id'],
                    'date': session['created_at'][:10],
                    'duration': f"{minutes}m {seconds}s",
                    'wmp': session['wpm'],
                    'accuracy': session['accuracy'],
                    'mode': session['session_type'].title(),
                    'content_source': session['content_source']
                })
            
            # Get achievements summary
            achievements_result = self.client.table('user_achievement_summary')\
                .select('*')\
                .eq('user_id', user_id)\
                .execute()
            
            achievement_summary = achievements_result.data[0] if achievements_result.data else {
                'earned_count': 0,
                'available_count': 0,
                'total_points': 0,
                'earned_achievements': []
            }
            
            return {
                'user_id': user_id,
                'averageWpm': int(stats['avg_wpm']),
                'accuracy': int(stats['avg_accuracy']),
                'practiceMinutes': stats['total_time_minutes'],
                'currentStreak': stats['current_streak'],
                'longestStreak': stats['longest_streak'],
                'totalSessions': stats['total_sessions'],
                'bestWpm': stats['best_wpm'],
                'bestAccuracy': stats['best_accuracy'],
                'recentSessions': recent_sessions,
                'personalBest': {
                    'wmp': stats['best_wpm'],
                    'accuracy': stats['best_accuracy'],
                    'date': stats['last_practice_date']
                },
                'achievements': achievement_summary,
                'lastUpdated': stats['updated_at']
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting user statistics: {e}")
            raise
    
    # Achievement Management
    async def get_user_achievements(self, user_id: str, status: str = None) -> List[Dict]:
        """Get user achievements"""
        try:
            query = self.client.table('user_achievements')\
                .select('*, achievements(*)')\
                .eq('user_id', user_id)
            
            if status:
                query = query.eq('status', status)
            
            result = query.order('created_at', desc=True).execute()
            
            achievements = []
            for item in result.data:
                achievement = item['achievements']
                achievements.append({
                    'id': achievement['id'],
                    'title': achievement['title'],
                    'description': achievement['description'],
                    'category': achievement['category'],
                    'icon': achievement['icon'],
                    'points': achievement['points'],
                    'rarity': achievement['rarity'],
                    'progress_value': item['progress_value'],
                    'progress_percentage': item['progress_percentage'],
                    'status': item['status'],
                    'earned_at': item['earned_at'],
                    'target_value': achievement['target_value'],
                    'unit': achievement['unit']
                })
            
            return achievements
            
        except Exception as e:
            logger.error(f"❌ Error getting user achievements: {e}")
            return []
    
    async def get_available_achievements(self) -> List[Dict]:
        """Get all available achievements"""
        try:
            result = self.client.table('achievements')\
                .select('*')\
                .eq('is_active', True)\
                .order('sort_order')\
                .execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"❌ Error getting available achievements: {e}")
            return []
    
    # Goal Management
    async def create_goal(self, user_id: str, goal_data: Dict) -> Dict:
        """Create a new goal for user"""
        try:
            goal = {
                'user_id': user_id,
                'title': goal_data['title'],
                'description': goal_data.get('description', ''),
                'goal_type': goal_data['goal_type'],
                'target_value': float(goal_data['target_value']),
                'unit': goal_data.get('unit', ''),
                'deadline': goal_data.get('deadline'),
                'priority': goal_data.get('priority', 'medium'),
                'reward_points': goal_data.get('reward_points', 50)
            }
            
            result = self.client.table('goals').insert(goal).execute()
            
            if result.data:
                logger.info(f"✅ Goal created: {result.data[0]['id']}")
                return result.data[0]
            else:
                raise Exception("Failed to create goal")
                
        except Exception as e:
            logger.error(f"❌ Error creating goal: {e}")
            raise
    
    async def get_user_goals(self, user_id: str, status: str = None) -> List[Dict]:
        """Get user goals"""
        try:
            query = self.client.table('goals').select('*').eq('user_id', user_id)
            
            if status:
                query = query.eq('status', status)
            
            result = query.order('created_at', desc=True).execute()
            
            goals = []
            for goal in result.data:
                # Calculate time remaining
                time_remaining = None
                if goal['deadline'] and goal['status'] == 'active':
                    deadline = datetime.fromisoformat(goal['deadline'])
                    now = datetime.now()
                    if now < deadline:
                        delta = deadline - now
                        days = delta.days
                        hours = delta.seconds // 3600
                        if days > 0:
                            time_remaining = f"{days} day{'s' if days != 1 else ''}"
                        elif hours > 0:
                            time_remaining = f"{hours} hour{'s' if hours != 1 else ''}"
                        else:
                            time_remaining = "Less than 1 hour"
                    else:
                        time_remaining = "Expired"
                
                goals.append({
                    **goal,
                    'time_remaining': time_remaining,
                    'is_achievable': goal['status'] == 'active' and (
                        not goal['deadline'] or 
                        datetime.now() < datetime.fromisoformat(goal['deadline'])
                    )
                })
            
            return goals
            
        except Exception as e:
            logger.error(f"❌ Error getting user goals: {e}")
            return []
    
    async def update_goal_progress(self, goal_id: str, current_value: float) -> Optional[Dict]:
        """Update goal progress"""
        try:
            # Get goal details
            goal_result = self.client.table('goals').select('*').eq('id', goal_id).execute()
            if not goal_result.data:
                return None
            
            goal = goal_result.data[0]
            
            # Calculate progress
            progress_percentage = min(100, (current_value / goal['target_value']) * 100)
            
            update_data = {
                'current_value': current_value,
                'progress_percentage': progress_percentage
            }
            
            # Check if goal is completed
            if current_value >= goal['target_value'] and goal['status'] == 'active':
                update_data['status'] = 'completed'
            
            result = self.client.table('goals').update(update_data).eq('id', goal_id).execute()
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"❌ Error updating goal progress: {e}")
            return None
    
    # Document Management
    async def save_document(self, user_id: str, file_data: Dict) -> Dict:
        """Save uploaded document metadata"""
        try:
            doc_data = {
                'user_id': user_id,
                'filename': file_data['filename'],
                'original_name': file_data['original_name'],
                'file_size': file_data['file_size'],
                'file_type': file_data.get('file_type', 'application/pdf'),
                'storage_path': file_data['storage_path'],
                'processed_content': file_data.get('processed_content'),
                'content_preview': file_data.get('content_preview', '')[:500],  # Limit preview
                'processing_status': file_data.get('processing_status', 'completed'),
                'metadata': file_data.get('metadata', {})
            }
            
            result = self.client.table('uploaded_documents').insert(doc_data).execute()
            
            if result.data:
                logger.info(f"✅ Document saved: {result.data[0]['id']}")
                return result.data[0]
            else:
                raise Exception("Failed to save document")
                
        except Exception as e:
            logger.error(f"❌ Error saving document: {e}")
            raise
    
    async def get_user_documents(self, user_id: str) -> List[Dict]:
        """Get user's uploaded documents"""
        try:
            result = self.client.table('uploaded_documents')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('upload_date', desc=True)\
                .execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"❌ Error getting user documents: {e}")
            return []
    
    # Analytics and Insights
    async def get_performance_analytics(self, user_id: str, days: int = 30) -> Dict:
        """Get detailed performance analytics"""
        try:
            # Get sessions from last N days
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            sessions_result = self.client.table('typing_sessions')\
                .select('*')\
                .eq('user_id', user_id)\
                .gte('created_at', start_date)\
                .order('created_at')\
                .execute()
            
            sessions = sessions_result.data
            
            if not sessions:
                return {'sessions': [], 'trends': {}, 'insights': []}
            
            # Calculate trends
            trends = {
                'wmp_trend': self._calculate_trend([s['wpm'] for s in sessions]),
                'accuracy_trend': self._calculate_trend([s['accuracy'] for s in sessions]),
                'consistency_improvement': self._calculate_consistency_trend(sessions)
            }
            
            # Generate insights
            insights = self._generate_insights(sessions, trends)
            
            return {
                'sessions': sessions,
                'trends': trends,
                'insights': insights,
                'period_days': days,
                'total_sessions': len(sessions)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting performance analytics: {e}")
            return {'sessions': [], 'trends': {}, 'insights': []}
    
    def _calculate_trend(self, values: List[float]) -> Dict:
        """Calculate trend for a series of values"""
        if len(values) < 2:
            return {'direction': 'stable', 'change': 0}
        
        # Simple linear regression slope
        n = len(values)
        x_mean = (n - 1) / 2
        y_mean = sum(values) / n
        
        numerator = sum((i - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator
        
        return {
            'direction': 'improving' if slope > 0.1 else 'declining' if slope < -0.1 else 'stable',
            'change': slope,
            'change_percentage': (slope / y_mean * 100) if y_mean > 0 else 0
        }
    
    def _calculate_consistency_trend(self, sessions: List[Dict]) -> Dict:
        """Calculate consistency trend"""
        if len(sessions) < 5:
            return {'direction': 'stable', 'score': 0}
        
        # Calculate WPM variance for sliding windows
        window_size = 5
        variances = []
        
        for i in range(len(sessions) - window_size + 1):
            window_wpm = [sessions[j]['wpm'] for j in range(i, i + window_size)]
            variance = sum((x - sum(window_wpm)/len(window_wpm))**2 for x in window_wmp) / len(window_wmp)
            variances.append(variance)
        
        if len(variances) < 2:
            return {'direction': 'stable', 'score': 0}
        
        # Lower variance = better consistency
        trend = self._calculate_trend([-v for v in variances])  # Negative because lower is better
        
        return {
            'direction': trend['direction'],
            'score': 100 - (variances[-1] if variances else 0)  # Convert to consistency score
        }
    
    def _generate_insights(self, sessions: List[Dict], trends: Dict) -> List[str]:
        """Generate performance insights"""
        insights = []
        
        if not sessions:
            return insights
        
        avg_wpm = sum(s['wpm'] for s in sessions) / len(sessions)
        avg_accuracy = sum(s['accuracy'] for s in sessions) / len(sessions)
        
        # Speed insights
        if trends['wpm_trend']['direction'] == 'improving':
            insights.append(f"🚀 Your typing speed is improving! Up {trends['wpm_trend']['change_percentage']:.1f}% recently.")
        elif trends['wmp_trend']['direction'] == 'declining':
            insights.append(f"📈 Focus on speed: Your WPM has declined {abs(trends['wpm_trend']['change_percentage']):.1f}% recently.")
        
        # Accuracy insights
        if avg_accuracy < 90:
            insights.append("🎯 Focus on accuracy: Slow down to build muscle memory and improve precision.")
        elif avg_accuracy > 95:
            insights.append("💎 Excellent accuracy! You can now focus on increasing speed while maintaining precision.")
        
        # Session frequency insights
        if len(sessions) >= 20:  # For 30-day period
            insights.append("🔥 Great consistency! Regular practice is key to improvement.")
        elif len(sessions) < 10:
            insights.append("⏰ Try to practice more regularly for faster improvement.")
        
        # Performance level insights
        if avg_wpm >= 60:
            insights.append("⚡ You're typing at an advanced level! Consider challenging yourself with complex texts.")
        elif avg_wpm >= 40:
            insights.append("👍 Good typing speed! You're above average and improving steadily.")
        elif avg_wpm < 30:
            insights.append("🌱 Keep practicing! Focus on proper finger placement and rhythm.")
        
        return insights[:4]  # Limit to 4 insights
    
    # Health and Utilities
    async def health_check(self) -> Dict:
        """Perform comprehensive health check"""
        try:
            checks = {
                'database_connected': False,
                'tables_accessible': False,
                'auth_working': False,
                'functions_working': False
            }
            
            # Test basic connection
            result = self.client.table('achievements').select('count').limit(1).execute()
            checks['database_connected'] = True
            checks['tables_accessible'] = True
            
            # Test RPC function
            try:
                self.client.rpc('update_achievement_progress', {
                    'p_user_id': '00000000-0000-0000-0000-000000000000',
                    'p_session_wpm': 0,
                    'p_session_accuracy': 0,
                    'p_current_streak': 0,
                    'p_total_sessions': 0,
                    'p_total_practice_minutes': 0
                }).execute()
                checks['functions_working'] = True
            except:
                pass  # Function test failed, but that's okay
            
            return {
                'status': 'healthy' if all(checks.values()) else 'degraded',
                'checks': checks,
                'timestamp': datetime.now().isoformat(),
                'supabase_url': self.url[:50] + '...' if len(self.url) > 50 else self.url
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

# Global service instance
_supabase_service = None

def get_supabase_service() -> SupabaseService:
    """Get global Supabase service instance"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service