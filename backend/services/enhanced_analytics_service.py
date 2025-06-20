import json
import os
import uuid
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple
import math
import random
from collections import defaultdict

from utils.logging_config import get_logger
from models.typing_session import TypingSession
from models.user_stats import UserStats

class EnhancedAnalyticsService:
    """Enhanced analytics service with comprehensive tracking"""
    
    def __init__(self, storage_path: str = 'data'):
        self.storage_path = storage_path
        self.logger = get_logger(__name__)
        self.sessions_file = os.path.join(storage_path, 'typing_sessions.json')
        self.users_file = os.path.join(storage_path, 'user_stats.json')
        
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
    
    async def save_typing_session(self, session_data: Dict) -> Dict:
        """Save typing session with enhanced analytics"""
        try:
            # Create session object
            session = TypingSession(session_data)
            
            # Load existing sessions
            sessions = self._load_sessions()
            sessions.append(session.to_dict())
            
            # Keep only last 1000 sessions per user to manage file size
            user_sessions = [s for s in sessions if s['userId'] == session.user_id]
            if len(user_sessions) > 1000:
                # Remove oldest sessions for this user
                sessions = [s for s in sessions if s['userId'] != session.user_id]
                sessions.extend(sorted(user_sessions, key=lambda x: x['completedAt'])[-1000:])
            
            # Save sessions
            self._save_sessions(sessions)
            
            # Update user statistics
            await self.update_user_stats(session.user_id, session_data)
            
            # Check for achievements
            new_achievements = await self.check_achievements(session.user_id, session_data)
            
            self.logger.info(f"Session saved: {session.session_id}")
            
            return {
                'success': True,
                'sessionId': session.session_id,
                'message': 'Session saved successfully',
                'newAchievements': new_achievements
            }
            
        except Exception as e:
            self.logger.error(f"Error saving session: {e}")
            raise
    
    async def update_user_stats(self, user_id: str, session_data: Dict):
        """Update comprehensive user statistics"""
        try:
            users = self._load_user_stats()
            
            if user_id not in users:
                user_stats = UserStats(user_id)
            else:
                user_stats = UserStats(user_id, users[user_id])
            
            # Update session count and time
            user_stats.total_sessions += 1
            user_stats.total_practice_time += math.ceil(session_data['duration'] / 60)
            
            # Update averages
            total_sessions = user_stats.total_sessions
            old_avg_wpm = user_stats.average_wpm
            old_avg_accuracy = user_stats.average_accuracy
            
            user_stats.average_wpm = round(
                ((old_avg_wpm * (total_sessions - 1)) + session_data['wpm']) / total_sessions
            )
            user_stats.average_accuracy = round(
                ((old_avg_accuracy * (total_sessions - 1)) + session_data['accuracy']) / total_sessions
            )
            
            # Update personal bests
            user_stats.best_wpm = max(user_stats.best_wpm, session_data['wpm'])
            user_stats.best_accuracy = max(user_stats.best_accuracy, session_data['accuracy'])
            
            # Update streak
            self._update_streak(user_stats)
            
            # Update daily stats
            self._update_daily_stats(user_stats, session_data)
            
            # Update character stats if available
            if 'keystrokes' in session_data and session_data['keystrokes']:
                self._update_character_stats(user_stats, session_data['keystrokes'])
            
            # Update goals progress
            self._update_goals_progress(user_stats, session_data)
            
            # Save updated stats
            users[user_id] = user_stats.to_dict()
            self._save_user_stats(users)
            
            return user_stats
            
        except Exception as e:
            self.logger.error(f"Error updating user stats: {e}")
            raise
    
    def _update_streak(self, user_stats: UserStats):
        """Update user's typing streak"""
        today = date.today()
        last_practice = user_stats.last_practice_date
        
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
                user_stats.current_streak += 1
                user_stats.longest_streak = max(user_stats.longest_streak, user_stats.current_streak)
            else:
                # Streak broken
                user_stats.current_streak = 1
        else:
            # First session
            user_stats.current_streak = 1
            user_stats.longest_streak = 1
        
        user_stats.last_practice_date = today.isoformat()
    
    def _update_daily_stats(self, user_stats: UserStats, session_data: Dict):
        """Update daily statistics"""
        today = date.today().isoformat()
        
        # Find or create today's stats
        daily_stat = None
        for stat in user_stats.daily_stats:
            if stat['date'] == today:
                daily_stat = stat
                break
        
        if not daily_stat:
            daily_stat = {
                'date': today,
                'sessionsCount': 0,
                'practiceTime': 0,
                'averageWpm': 0,
                'averageAccuracy': 0,
                'bestWpm': 0,
                'goalAchieved': False
            }
            user_stats.daily_stats.append(daily_stat)
        
        # Update daily stats
        old_sessions = daily_stat['sessionsCount']
        daily_stat['sessionsCount'] += 1
        daily_stat['practiceTime'] += math.ceil(session_data['duration'] / 60)
        
        # Update averages
        daily_stat['averageWpm'] = round(
            ((daily_stat['averageWpm'] * old_sessions) + session_data['wpm']) / daily_stat['sessionsCount']
        )
        daily_stat['averageAccuracy'] = round(
            ((daily_stat['averageAccuracy'] * old_sessions) + session_data['accuracy']) / daily_stat['sessionsCount']
        )
        daily_stat['bestWpm'] = max(daily_stat['bestWpm'], session_data['wpm'])
        
        # Keep only last 90 days
        user_stats.daily_stats = sorted(user_stats.daily_stats, key=lambda x: x['date'])[-90:]
    
    def _update_character_stats(self, user_stats: UserStats, keystrokes: List[Dict]):
        """Update character-level statistics"""
        char_data = defaultdict(lambda: {'total': 0, 'correct': 0, 'times': []})
        
        for keystroke in keystrokes:
            char = keystroke.get('char', '').lower()
            if not char:
                continue
            
            char_data[char]['total'] += 1
            if keystroke.get('isCorrect', False):
                char_data[char]['correct'] += 1
            
            if 'timeSinceLastKey' in keystroke:
                char_data[char]['times'].append(keystroke['timeSinceLastKey'])
        
        # Update character stats
        for char, data in char_data.items():
            char_stat = None
            for cs in user_stats.character_stats:
                if cs['character'] == char:
                    char_stat = cs
                    break
            
            if not char_stat:
                char_stat = {
                    'character': char,
                    'totalAttempts': 0,
                    'correctAttempts': 0,
                    'accuracy': 0,
                    'averageTime': 0,
                    'lastPracticed': datetime.now().isoformat()
                }
                user_stats.character_stats.append(char_stat)
            
            # Update stats
            char_stat['totalAttempts'] += data['total']
            char_stat['correctAttempts'] += data['correct']
            char_stat['accuracy'] = round((char_stat['correctAttempts'] / char_stat['totalAttempts']) * 100)
            
            if data['times']:
                avg_time = sum(data['times']) / len(data['times'])
                char_stat['averageTime'] = round((char_stat['averageTime'] + avg_time) / 2)
            
            char_stat['lastPracticed'] = datetime.now().isoformat()
    
    def _update_goals_progress(self, user_stats: UserStats, session_data: Dict):
        """Update goals progress"""
        for goal in user_stats.goals:
            if goal['status'] != 'active':
                continue
            
            current_value = goal['currentValue']
            
            if goal['type'] == 'speed':
                new_value = max(current_value, session_data['wpm'])
            elif goal['type'] == 'accuracy':
                new_value = max(current_value, session_data['accuracy'])
            elif goal['type'] == 'streak':
                new_value = user_stats.current_streak
            else:
                continue
            
            goal['currentValue'] = new_value
            
            # Check completion
            if new_value >= goal['targetValue'] and goal['status'] == 'active':
                goal['status'] = 'completed'
                goal['completedAt'] = datetime.now().isoformat()
            
            # Check expiration
            if goal.get('deadline'):
                deadline = datetime.fromisoformat(goal['deadline'])
                if datetime.now() > deadline and goal['status'] == 'active':
                    goal['status'] = 'expired'
    
    async def check_achievements(self, user_id: str, session_data: Dict) -> List[Dict]:
        """Check for new achievements"""
        try:
            users = self._load_user_stats()
            if user_id not in users:
                return []
            
            user_stats = UserStats(user_id, users[user_id])
            earned_ids = {ach['id'] for ach in user_stats.achievements}
            
            new_achievements = []
            achievements = self._get_available_achievements()
            
            for achievement in achievements:
                if achievement['id'] in earned_ids:
                    continue
                
                earned = False
                
                if achievement['category'] == 'speed':
                    earned = session_data['wpm'] >= achievement['criteria']['minWpm']
                elif achievement['category'] == 'accuracy':
                    earned = session_data['accuracy'] >= achievement['criteria']['minAccuracy']
                elif achievement['category'] == 'streak':
                    earned = user_stats.current_streak >= achievement['criteria']['days']
                elif achievement['category'] == 'milestone':
                    earned = user_stats.total_sessions >= achievement['criteria']['sessionCount']
                
                if earned:
                    new_achievement = {
                        'id': achievement['id'],
                        'title': achievement['title'],
                        'description': achievement['description'],
                        'category': achievement['category'],
                        'earnedAt': datetime.now().isoformat(),
                        'progressValue': session_data.get('wpm', session_data.get('accuracy', user_stats.current_streak))
                    }
                    new_achievements.append(new_achievement)
                    user_stats.achievements.append(new_achievement)
            
            if new_achievements:
                users[user_id] = user_stats.to_dict()
                self._save_user_stats(users)
            
            return new_achievements
            
        except Exception as e:
            self.logger.error(f"Error checking achievements: {e}")
            return []
    
    def _get_available_achievements(self) -> List[Dict]:
        """Get list of available achievements"""
        return [
            # Speed achievements
            {'id': 'speed_20', 'title': 'Speed Novice', 'description': 'Reach 20 WPM', 'category': 'speed', 'criteria': {'minWpm': 20}},
            {'id': 'speed_40', 'title': 'Speed Apprentice', 'description': 'Reach 40 WPM', 'category': 'speed', 'criteria': {'minWpm': 40}},
            {'id': 'speed_60', 'title': 'Speed Master', 'description': 'Reach 60 WPM', 'category': 'speed', 'criteria': {'minWpm': 60}},
            {'id': 'speed_80', 'title': 'Speed Demon', 'description': 'Reach 80 WPM', 'category': 'speed', 'criteria': {'minWpm': 80}},
            {'id': 'speed_100', 'title': 'Lightning Fingers', 'description': 'Reach 100 WPM', 'category': 'speed', 'criteria': {'minWpm': 100}},
            
            # Accuracy achievements
            {'id': 'accuracy_90', 'title': 'Precision Rookie', 'description': 'Achieve 90% accuracy', 'category': 'accuracy', 'criteria': {'minAccuracy': 90}},
            {'id': 'accuracy_95', 'title': 'Accuracy Expert', 'description': 'Achieve 95% accuracy', 'category': 'accuracy', 'criteria': {'minAccuracy': 95}},
            {'id': 'accuracy_99', 'title': 'Perfect Shot', 'description': 'Achieve 99% accuracy', 'category': 'accuracy', 'criteria': {'minAccuracy': 99}},
            {'id': 'accuracy_100', 'title': 'Flawless Fingers', 'description': 'Achieve 100% accuracy', 'category': 'accuracy', 'criteria': {'minAccuracy': 100}},
            
            # Streak achievements
            {'id': 'streak_3', 'title': 'Getting Started', 'description': 'Practice 3 days in a row', 'category': 'streak', 'criteria': {'days': 3}},
            {'id': 'streak_7', 'title': 'Week Warrior', 'description': 'Practice 7 days in a row', 'category': 'streak', 'criteria': {'days': 7}},
            {'id': 'streak_30', 'title': 'Month Master', 'description': 'Practice 30 days in a row', 'category': 'streak', 'criteria': {'days': 30}},
            
            # Milestone achievements
            {'id': 'milestone_1', 'title': 'First Steps', 'description': 'Complete your first session', 'category': 'milestone', 'criteria': {'sessionCount': 1}},
            {'id': 'milestone_10', 'title': 'Dedicated Learner', 'description': 'Complete 10 sessions', 'category': 'milestone', 'criteria': {'sessionCount': 10}},
            {'id': 'milestone_50', 'title': 'Typing Enthusiast', 'description': 'Complete 50 sessions', 'category': 'milestone', 'criteria': {'sessionCount': 50}},
            {'id': 'milestone_100', 'title': 'Keyboard Master', 'description': 'Complete 100 sessions', 'category': 'milestone', 'criteria': {'sessionCount': 100}}
        ]
    
    async def generate_recommendations(self, user_id: str) -> List[Dict]:
        """Generate personalized recommendations"""
        try:
            users = self._load_user_stats()
            if user_id not in users:
                return []
            
            user_stats = UserStats(user_id, users[user_id])
            recommendations = []
            
            # Character-based recommendations
            problem_chars = [cs for cs in user_stats.character_stats 
                           if cs['accuracy'] < 85 and cs['totalAttempts'] > 5]
            problem_chars.sort(key=lambda x: x['accuracy'])
            
            for char in problem_chars[:3]:
                recommendations.append({
                    'type': 'character_practice',
                    'title': f'Improve {char["character"].upper()} key accuracy',
                    'description': f'Your accuracy on "{char["character"]}" is {char["accuracy"]}%. Practice this key to improve.',
                    'priority': 'high' if char['accuracy'] < 70 else 'medium',
                    'estimatedTime': '5 minutes',
                    'actionData': {'character': char['character']}
                })
            
            # Speed recommendations
            if user_stats.total_sessions > 5 and user_stats.average_wpm < 40:
                recommendations.append({
                    'type': 'speed_building',
                    'title': 'Focus on Speed Building',
                    'description': f'Your average speed is {user_stats.average_wpm} WPM. Regular practice can help you reach 50+ WPM.',
                    'priority': 'medium',
                    'estimatedTime': '15 minutes',
                    'actionData': {'targetWpm': 50}
                })
            
            # Consistency recommendations
            if user_stats.current_streak < 3:
                recommendations.append({
                    'type': 'consistency',
                    'title': 'Build a Practice Streak',
                    'description': 'Regular daily practice is key to improvement. Try to practice for at least 10 minutes each day.',
                    'priority': 'high',
                    'estimatedTime': '10 minutes',
                    'actionData': {'targetStreak': 7}
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
            
            if user_id not in users:
                user_stats = UserStats(user_id)
            else:
                user_stats = UserStats(user_id, users[user_id])
            
            # Filter sessions by time range
            cutoff_date = self._get_cutoff_date(time_range)
            user_sessions = [
                s for s in sessions 
                if s['userId'] == user_id and 
                datetime.fromisoformat(s['completedAt']) >= cutoff_date
            ]
            
            # Generate analytics
            recommendations = await self.generate_recommendations(user_id)
            performance_trends = self._calculate_performance_trends(user_sessions)
            speed_analysis = self._calculate_speed_analysis(user_sessions, user_stats)
            accuracy_analysis = self._calculate_accuracy_analysis(user_stats, user_sessions)
            learning_analysis = self._calculate_learning_analysis(user_sessions, user_stats)
            
            return {
                'success': True,
                'data': {
                    'userStats': user_stats.to_dict(),
                    'sessions': user_sessions[-10:],  # Last 10 sessions
                    'recommendations': recommendations,
                    'performanceTrends': performance_trends,
                    'speedAnalysis': speed_analysis,
                    'accuracyAnalysis': accuracy_analysis,
                    'learningAnalysis': learning_analysis,
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
            'date': session['completedAt'],
            'wpm': session['wpm'],
            'accuracy': session['accuracy'],
            'practiceTime': session['duration'] / 60,
            'consistency': session.get('consistencyScore', 85)
        } for session in sessions]
    
    def _calculate_speed_analysis(self, sessions: List[Dict], user_stats: UserStats) -> Dict:
        """Calculate speed analysis"""
        if not sessions:
            return {}
        
        speeds = [s['wpm'] for s in sessions]
        peak_speed = max(speeds)
        avg_speed = sum(speeds) / len(speeds)
        
        return {
            'peakSpeed': {
                'value': peak_speed,
                'timestamp': next(s['completedAt'] for s in sessions if s['wpm'] == peak_speed)
            },
            'averageSpeed': {
                'value': round(avg_speed),
                'trend': 'stable'
            },
            'speedByContentType': self._group_by_content_type(sessions),
            'speedByTimeOfDay': self._analyze_time_of_day(sessions)
        }
    
    def _calculate_accuracy_analysis(self, user_stats: UserStats, sessions: List[Dict]) -> Dict:
        """Calculate accuracy analysis"""
        problem_chars = [
            {
                'char': cs['character'],
                'accuracy': cs['accuracy'],
                'frequency': cs['totalAttempts'],
                'avgTime': round(cs.get('averageTime', 0))
            }
            for cs in user_stats.character_stats
            if cs['accuracy'] < 90 and cs['totalAttempts'] > 3
        ]
        problem_chars.sort(key=lambda x: x['accuracy'])
        
        return {
            'problemCharacters': problem_chars[:5],
            'commonMistakes': [],
            'fingerAccuracy': self._calculate_finger_accuracy(user_stats.character_stats)
        }
    
    def _calculate_learning_analysis(self, sessions: List[Dict], user_stats: UserStats) -> Dict:
        """Calculate learning analysis"""
        return {
            'retentionRate': min(95, 75 + (user_stats.current_streak * 2)),
            'comprehensionScore': round(user_stats.average_accuracy or 85),
            'learningVelocity': 'High' if user_stats.total_sessions > 20 else 'Medium' if user_stats.total_sessions > 10 else 'Low',
            'studyEfficiency': min(100, 60 + (user_stats.average_wpm / 2)),
            'contentTypes': self._analyze_content_types(sessions)
        }
    
    def _group_by_content_type(self, sessions: List[Dict]) -> List[Dict]:
        """Group sessions by content type"""
        grouped = defaultdict(list)
        for session in sessions:
            content_type = session.get('contentType', 'Unknown')
            grouped[content_type].append(session['wpm'])
        
        return [{
            'type': content_type,
            'avgWpm': round(sum(speeds) / len(speeds)),
            'sessions': len(speeds)
        } for content_type, speeds in grouped.items()]
    
    def _analyze_time_of_day(self, sessions: List[Dict]) -> List[Dict]:
        """Analyze performance by time of day"""
        hourly_data = defaultdict(list)
        for session in sessions:
            hour = datetime.fromisoformat(session['completedAt']).hour
            hourly_data[hour].append(session['wpm'])
        
        return [{
            'hour': hour,
            'avgWpm': round(sum(speeds) / len(speeds))
        } for hour, speeds in hourly_data.items()]
    
    def _calculate_finger_accuracy(self, character_stats: List[Dict]) -> Dict:
        """Calculate accuracy by finger"""
        finger_map = {
            'leftPinky': ['q', 'a', 'z'],
            'leftRing': ['w', 's', 'x'],
            'leftMiddle': ['e', 'd', 'c'],
            'leftIndex': ['r', 'f', 'v', 't', 'g', 'b'],
            'rightIndex': ['y', 'h', 'n', 'u', 'j', 'm'],
            'rightMiddle': ['i', 'k', ','],
            'rightRing': ['o', 'l', '.'],
            'rightPinky': ['p', ';', '/', '[', ']', "'"]
        }
        
        finger_accuracy = {}
        for finger, chars in finger_map.items():
            finger_chars = [cs for cs in character_stats if cs['character'] in chars]
            if finger_chars:
                total_attempts = sum(fc['totalAttempts'] for fc in finger_chars)
                correct_attempts = sum(fc['correctAttempts'] for fc in finger_chars)
                finger_accuracy[finger] = round((correct_attempts / total_attempts) * 100) if total_attempts > 0 else 100
            else:
                finger_accuracy[finger] = 100
        
        return finger_accuracy
    
    def _analyze_content_types(self, sessions: List[Dict]) -> List[Dict]:
        """Analyze performance by content type"""
        content_types = defaultdict(lambda: {'accuracies': [], 'sessions': 0})
        
        for session in sessions:
            content_type = session.get('contentType', 'Unknown')
            content_types[content_type]['accuracies'].append(session['accuracy'])
            content_types[content_type]['sessions'] += 1
        
        return [{
            'type': content_type,
            'retention': min(95, 70 + random.randint(0, 25)),  # Mock retention
            'comprehension': round(sum(data['accuracies']) / len(data['accuracies'])),
            'sessions': data['sessions']
        } for content_type, data in content_types.items()]
