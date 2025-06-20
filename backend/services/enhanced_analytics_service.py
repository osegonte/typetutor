import json
import os
import uuid
import sys
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple
import math
from collections import defaultdict

# Add the backend directory to the path if not already there
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from utils.logging_config import get_logger
except ImportError:
    import logging
    def get_logger(name):
        return logging.getLogger(name)

try:
    from models.typing_session import TypingSession
    from models.user_stats import UserStats
    from models.achievement import Achievement
    from models.goal import Goal
    MODELS_AVAILABLE = True
except ImportError:
    # Fallback mode - use simple dictionaries
    MODELS_AVAILABLE = False
    print("Warning: Advanced models not available, using basic mode")

class EnhancedAnalyticsService:
    """Enhanced analytics service with fallback for missing dependencies"""
    
    def __init__(self, storage_path: str = 'data'):
        self.storage_path = storage_path
        self.logger = get_logger(__name__)
        self.sessions_file = os.path.join(storage_path, 'typing_sessions.json')
        self.users_file = os.path.join(storage_path, 'user_stats.json')
        self.achievements_file = os.path.join(storage_path, 'achievements.json')
        self.goals_file = os.path.join(storage_path, 'goals.json')
        
        # Ensure storage directory exists
        os.makedirs(storage_path, exist_ok=True)
        
        # Initialize storage files
        self._initialize_storage()
    
    def _initialize_storage(self):
        """Initialize storage files if they don't exist"""
        if not os.path.exists(self.sessions_file):
            with open(self.sessions_file, 'w') as f:
                json.dump([], f)
        
        if not os.path.exists(self.users_file):
            with open(self.users_file, 'w') as f:
                json.dump({}, f)
        
        if not os.path.exists(self.achievements_file):
            with open(self.achievements_file, 'w') as f:
                json.dump(self._get_default_achievements(), f, indent=2)
        
        if not os.path.exists(self.goals_file):
            with open(self.goals_file, 'w') as f:
                json.dump({}, f)
    
    def _load_sessions(self) -> List[Dict]:
        """Load all typing sessions"""
        try:
            with open(self.sessions_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _save_sessions(self, sessions: List[Dict]):
        """Save typing sessions"""
        with open(self.sessions_file, 'w') as f:
            json.dump(sessions, f, indent=2, default=str)
    
    def _load_user_stats(self) -> Dict:
        """Load all user stats"""
        try:
            with open(self.users_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    def _save_user_stats(self, users: Dict):
        """Save user stats"""
        with open(self.users_file, 'w') as f:
            json.dump(users, f, indent=2, default=str)
    
    def _load_achievements(self) -> List[Dict]:
        """Load achievements"""
        try:
            with open(self.achievements_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return self._get_default_achievements()
    
    def _load_goals(self) -> Dict:
        """Load user goals"""
        try:
            with open(self.goals_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    def _save_goals(self, goals: Dict):
        """Save user goals"""
        with open(self.goals_file, 'w') as f:
            json.dump(goals, f, indent=2, default=str)
    
    async def save_typing_session(self, session_data: Dict) -> Dict:
        """Save typing session with enhanced analytics"""
        try:
            # Create session object or dict based on availability
            if MODELS_AVAILABLE:
                session = TypingSession(session_data)
                session_dict = session.to_dict()
            else:
                session_dict = self._create_session_dict(session_data)
            
            # Load existing sessions
            sessions = self._load_sessions()
            sessions.append(session_dict)
            
            # Keep only last 1000 sessions per user to manage file size
            user_id = session_dict.get('userId', 'anonymous')
            user_sessions = [s for s in sessions if s.get('userId') == user_id]
            if len(user_sessions) > 1000:
                sessions = [s for s in sessions if s.get('userId') != user_id]
                sessions.extend(sorted(user_sessions, key=lambda x: x.get('completedAt', ''))[-1000:])
            
            # Save sessions
            self._save_sessions(sessions)
            
            # Update user statistics
            await self.update_user_stats(user_id, session_data)
            
            # Check for achievements
            new_achievements = await self.check_achievements(user_id, session_data)
            
            self.logger.info(f"Session saved: {session_dict.get('sessionId', 'unknown')}")
            
            return {
                'success': True,
                'sessionId': session_dict.get('sessionId'),
                'message': 'Session saved successfully',
                'newAchievements': new_achievements
            }
            
        except Exception as e:
            self.logger.error(f"Error saving session: {e}")
            raise
    
    def _create_session_dict(self, session_data: Dict) -> Dict:
        """Create session dictionary when models are not available"""
        return {
            'sessionId': str(uuid.uuid4()),
            'userId': session_data.get('userId', 'anonymous'),
            'wpm': session_data['wpm'],
            'accuracy': session_data['accuracy'],
            'duration': session_data['duration'],
            'sessionType': session_data.get('sessionType', 'practice'),
            'contentType': session_data.get('contentType', 'custom'),
            'completedAt': datetime.now().isoformat(),
            'createdAt': datetime.now().isoformat()
        }
    
    async def update_user_stats(self, user_id: str, session_data: Dict):
        """Update comprehensive user statistics"""
        try:
            users = self._load_user_stats()
            
            if user_id not in users:
                if MODELS_AVAILABLE:
                    user_stats = UserStats(user_id)
                    user_dict = user_stats.to_dict()
                else:
                    user_dict = self._create_user_stats_dict(user_id)
            else:
                user_dict = users[user_id]
            
            # Update session count and time
            user_dict['totalSessions'] = user_dict.get('totalSessions', 0) + 1
            user_dict['totalPracticeTime'] = user_dict.get('totalPracticeTime', 0) + math.ceil(session_data['duration'] / 60)
            
            # Update averages
            total_sessions = user_dict['totalSessions']
            old_avg_wpm = user_dict.get('averageWpm', 0)
            old_avg_accuracy = user_dict.get('averageAccuracy', 0)
            
            user_dict['averageWpm'] = round(
                ((old_avg_wpm * (total_sessions - 1)) + session_data['wpm']) / total_sessions
            )
            user_dict['averageAccuracy'] = round(
                ((old_avg_accuracy * (total_sessions - 1)) + session_data['accuracy']) / total_sessions
            )
            
            # Update personal bests
            user_dict['bestWpm'] = max(user_dict.get('bestWpm', 0), session_data['wpm'])
            user_dict['bestAccuracy'] = max(user_dict.get('bestAccuracy', 0), session_data['accuracy'])
            
            # Update streak
            self._update_streak(user_dict)
            
            # Update goals progress
            await self._update_goals_progress(user_id, user_dict, session_data)
            
            # Save updated stats
            users[user_id] = user_dict
            self._save_user_stats(users)
            
            return user_dict
            
        except Exception as e:
            self.logger.error(f"Error updating user stats: {e}")
            raise
    
    def _create_user_stats_dict(self, user_id: str) -> Dict:
        """Create user stats dictionary when models are not available"""
        return {
            'userId': user_id,
            'totalSessions': 0,
            'totalPracticeTime': 0,
            'averageWpm': 0,
            'bestWpm': 0,
            'averageAccuracy': 0,
            'bestAccuracy': 0,
            'currentStreak': 0,
            'longestStreak': 0,
            'lastPracticeDate': None,
            'achievements': [],
            'goals': [],
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
    
    def _update_streak(self, user_dict: Dict):
        """Update user's typing streak"""
        today = date.today()
        last_practice = user_dict.get('lastPracticeDate')
        
        if last_practice:
            if isinstance(last_practice, str):
                last_practice = datetime.fromisoformat(last_practice).date()
            elif isinstance(last_practice, datetime):
                last_practice = last_practice.date()
            
            days_diff = (today - last_practice).days
            
            if days_diff == 0:
                # Same day, keep streak
                pass
            elif days_diff == 1:
                # Consecutive day
                user_dict['currentStreak'] = user_dict.get('currentStreak', 0) + 1
                user_dict['longestStreak'] = max(user_dict.get('longestStreak', 0), user_dict['currentStreak'])
            else:
                # Streak broken
                user_dict['currentStreak'] = 1
        else:
            # First session
            user_dict['currentStreak'] = 1
            user_dict['longestStreak'] = 1
        
        user_dict['lastPracticeDate'] = today.isoformat()
    
    async def _update_goals_progress(self, user_id: str, user_dict: Dict, session_data: Dict):
        """Update goals progress"""
        try:
            goals_data = self._load_goals()
            user_goals = goals_data.get(user_id, [])
            
            for goal in user_goals:
                if goal.get('status') != 'active':
                    continue
                
                current_value = goal.get('currentValue', 0)
                goal_type = goal.get('type', '')
                
                if goal_type == 'speed':
                    new_value = max(current_value, session_data['wpm'])
                elif goal_type == 'accuracy':
                    new_value = max(current_value, session_data['accuracy'])
                elif goal_type == 'streak':
                    new_value = user_dict.get('currentStreak', 0)
                else:
                    continue
                
                goal['currentValue'] = new_value
                goal['updatedAt'] = datetime.now().isoformat()
                
                # Calculate progress
                target_value = goal.get('targetValue', 1)
                if target_value > 0:
                    goal['progressPercentage'] = min(100, (new_value / target_value) * 100)
                
                # Check completion
                if new_value >= target_value and goal.get('status') == 'active':
                    goal['status'] = 'completed'
                    goal['completedAt'] = datetime.now().isoformat()
                
                # Check expiration
                deadline = goal.get('deadline')
                if deadline:
                    deadline_dt = datetime.fromisoformat(deadline)
                    if datetime.now() > deadline_dt and goal.get('status') == 'active':
                        goal['status'] = 'expired'
            
            goals_data[user_id] = user_goals
            self._save_goals(goals_data)
            
        except Exception as e:
            self.logger.error(f"Error updating goals: {e}")
    
    async def check_achievements(self, user_id: str, session_data: Dict) -> List[Dict]:
        """Check for new achievements"""
        try:
            users = self._load_user_stats()
            if user_id not in users:
                return []
            
            user_dict = users[user_id]
            earned_ids = {ach.get('id') for ach in user_dict.get('achievements', [])}
            
            new_achievements = []
            available_achievements = self._get_available_achievements()
            
            for achievement in available_achievements:
                if achievement['id'] in earned_ids:
                    continue
                
                earned = False
                category = achievement.get('category', '')
                criteria = achievement.get('criteria', {})
                
                if category == 'speed':
                    earned = session_data['wpm'] >= criteria.get('minWpm', 0)
                elif category == 'accuracy':
                    earned = session_data['accuracy'] >= criteria.get('minAccuracy', 0)
                elif category == 'streak':
                    earned = user_dict.get('currentStreak', 0) >= criteria.get('days', 0)
                elif category == 'milestone':
                    earned = user_dict.get('totalSessions', 0) >= criteria.get('sessionCount', 0)
                
                if earned:
                    new_achievement = {
                        'id': achievement['id'],
                        'title': achievement['title'],
                        'description': achievement['description'],
                        'category': achievement['category'],
                        'earnedAt': datetime.now().isoformat(),
                        'progressValue': session_data.get('wpm', session_data.get('accuracy', user_dict.get('currentStreak', 0)))
                    }
                    new_achievements.append(new_achievement)
                    user_dict.setdefault('achievements', []).append(new_achievement)
            
            if new_achievements:
                users[user_id] = user_dict
                self._save_user_stats(users)
            
            return new_achievements
            
        except Exception as e:
            self.logger.error(f"Error checking achievements: {e}")
            return []
    
    def _get_available_achievements(self) -> List[Dict]:
        """Get list of available achievements"""
        if MODELS_AVAILABLE:
            try:
                return [ach.to_dict() for ach in Achievement.get_default_achievements()]
            except:
                pass
        
        return self._get_default_achievements()
    
    def _get_default_achievements(self) -> List[Dict]:
        """Get default achievements as dictionaries"""
        return [
            # Speed achievements
            {
                'id': 'speed_20',
                'title': 'Speed Novice',
                'description': 'Reach 20 WPM',
                'category': 'speed',
                'criteria': {'minWpm': 20},
                'icon': '🐢',
                'points': 10
            },
            {
                'id': 'speed_40',
                'title': 'Speed Apprentice',
                'description': 'Reach 40 WPM',
                'category': 'speed',
                'criteria': {'minWpm': 40},
                'icon': '🏃',
                'points': 20
            },
            {
                'id': 'speed_60',
                'title': 'Speed Expert',
                'description': 'Reach 60 WPM',
                'category': 'speed',
                'criteria': {'minWpm': 60},
                'icon': '⚡',
                'points': 50
            },
            {
                'id': 'speed_80',
                'title': 'Speed Demon',
                'description': 'Reach 80 WPM',
                'category': 'speed',
                'criteria': {'minWpm': 80},
                'icon': '🔥',
                'points': 100
            },
            
            # Accuracy achievements
            {
                'id': 'accuracy_90',
                'title': 'Precision Rookie',
                'description': 'Achieve 90% accuracy',
                'category': 'accuracy',
                'criteria': {'minAccuracy': 90},
                'icon': '🎯',
                'points': 15
            },
            {
                'id': 'accuracy_95',
                'title': 'Accuracy Expert',
                'description': 'Achieve 95% accuracy',
                'category': 'accuracy',
                'criteria': {'minAccuracy': 95},
                'icon': '💎',
                'points': 30
            },
            {
                'id': 'accuracy_99',
                'title': 'Near Perfect',
                'description': 'Achieve 99% accuracy',
                'category': 'accuracy',
                'criteria': {'minAccuracy': 99},
                'icon': '🌟',
                'points': 75
            },
            
            # Streak achievements
            {
                'id': 'streak_3',
                'title': 'Getting Started',
                'description': 'Practice 3 days in a row',
                'category': 'streak',
                'criteria': {'days': 3},
                'icon': '📅',
                'points': 20
            },
            {
                'id': 'streak_7',
                'title': 'Week Warrior',
                'description': 'Practice 7 days in a row',
                'category': 'streak',
                'criteria': {'days': 7},
                'icon': '🗓️',
                'points': 50
            },
            
            # Milestone achievements
            {
                'id': 'milestone_1',
                'title': 'First Steps',
                'description': 'Complete your first session',
                'category': 'milestone',
                'criteria': {'sessionCount': 1},
                'icon': '🎉',
                'points': 5
            },
            {
                'id': 'milestone_10',
                'title': 'Dedicated Learner',
                'description': 'Complete 10 sessions',
                'category': 'milestone',
                'criteria': {'sessionCount': 10},
                'icon': '📚',
                'points': 25
            },
            {
                'id': 'milestone_50',
                'title': 'Typing Enthusiast',
                'description': 'Complete 50 sessions',
                'category': 'milestone',
                'criteria': {'sessionCount': 50},
                'icon': '🏅',
                'points': 100
            }
        ]
    
    async def generate_recommendations(self, user_id: str) -> List[Dict]:
        """Generate personalized recommendations"""
        try:
            users = self._load_user_stats()
            if user_id not in users:
                return []
            
            user_dict = users[user_id]
            recommendations = []
            
            # Speed recommendations
            avg_wpm = user_dict.get('averageWpm', 0)
            total_sessions = user_dict.get('totalSessions', 0)
            
            if total_sessions > 5 and avg_wpm < 40:
                recommendations.append({
                    'type': 'speed_building',
                    'title': 'Focus on Speed Building',
                    'description': f'Your average speed is {avg_wpm} WPM. Regular practice can help you reach 50+ WPM.',
                    'priority': 'medium',
                    'estimatedTime': '15 minutes',
                    'actionData': {'targetWpm': 50}
                })
            
            # Consistency recommendations
            current_streak = user_dict.get('currentStreak', 0)
            if current_streak < 3:
                recommendations.append({
                    'type': 'consistency',
                    'title': 'Build a Practice Streak',
                    'description': 'Regular daily practice is key to improvement. Try to practice for at least 10 minutes each day.',
                    'priority': 'high',
                    'estimatedTime': '10 minutes',
                    'actionData': {'targetStreak': 7}
                })
            
            # Accuracy recommendations
            avg_accuracy = user_dict.get('averageAccuracy', 0)
            if avg_accuracy < 90 and total_sessions > 3:
                recommendations.append({
                    'type': 'accuracy_improvement',
                    'title': 'Focus on Accuracy',
                    'description': f'Your accuracy is {avg_accuracy}%. Slow down and focus on precision to build muscle memory.',
                    'priority': 'high',
                    'estimatedTime': '10 minutes',
                    'actionData': {'targetAccuracy': 90}
                })
            
            return recommendations[:5]
            
        except Exception as e:
            self.logger.error(f"Error generating recommendations: {e}")
            return []
    
    async def get_detailed_analytics(self, user_id: str, time_range: str = 'week') -> Dict:
        """Get comprehensive analytics data"""
        try:
            users = self._load_user_stats()
            sessions = self._load_sessions()
            
            user_dict = users.get(user_id, self._create_user_stats_dict(user_id))
            
            # Filter sessions by time range
            cutoff_date = self._get_cutoff_date(time_range)
            user_sessions = [
                s for s in sessions 
                if s.get('userId') == user_id and 
                datetime.fromisoformat(s.get('completedAt', '2020-01-01')) >= cutoff_date
            ]
            
            # Generate analytics
            recommendations = await self.generate_recommendations(user_id)
            performance_trends = self._calculate_performance_trends(user_sessions)
            
            return {
                'success': True,
                'data': {
                    'userStats': user_dict,
                    'sessions': user_sessions[-10:],  # Last 10 sessions
                    'recommendations': recommendations,
                    'performanceTrends': performance_trends,
                    'timeRange': time_range
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting detailed analytics: {e}")
            raise
    
    def _get_cutoff_date(self, time_range: str) -> datetime:
        """Get cutoff date for time range"""
        now = datetime.now()
        if time_range == 'week':
            return now - timedelta(days=7)
        elif time_range == 'month':
            return now - timedelta(days=30)
        elif time_range == 'quarter':
            return now - timedelta(days=90)
        else:
            return datetime(2020, 1, 1)
    
    def _calculate_performance_trends(self, sessions: List[Dict]) -> List[Dict]:
        """Calculate performance trends"""
        return [{
            'date': session.get('completedAt', ''),
            'wpm': session.get('wpm', 0),
            'accuracy': session.get('accuracy', 0),
            'practiceTime': session.get('duration', 0) / 60
        } for session in sessions]