from datetime import datetime, date
from typing import List, Dict, Optional
import uuid

class UserStats:
    """Enhanced user statistics model"""
    
    def __init__(self, user_id: str, data: Dict = None):
        self.user_id = user_id
        
        if data is None:
            data = {}
        
        # Overall performance
        self.total_sessions = data.get('totalSessions', 0)
        self.total_practice_time = data.get('totalPracticeTime', 0)  # minutes
        self.average_wpm = data.get('averageWpm', 0)
        self.best_wpm = data.get('bestWpm', 0)
        self.average_accuracy = data.get('averageAccuracy', 0)
        self.best_accuracy = data.get('bestAccuracy', 0)
        
        # Streak tracking
        self.current_streak = data.get('currentStreak', 0)
        self.longest_streak = data.get('longestStreak', 0)
        self.last_practice_date = data.get('lastPracticeDate')
        
        # Character-level analytics
        self.character_stats = data.get('characterStats', [])
        
        # Daily statistics
        self.daily_stats = data.get('dailyStats', [])
        
        # Goals and achievements
        self.goals = data.get('goals', [])
        self.achievements = data.get('achievements', [])
        
        # Timestamps
        self.created_at = data.get('createdAt', datetime.now())
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for storage"""
        return {
            'userId': self.user_id,
            'totalSessions': self.total_sessions,
            'totalPracticeTime': self.total_practice_time,
            'averageWpm': self.average_wpm,
            'bestWpm': self.best_wpm,
            'averageAccuracy': self.average_accuracy,
            'bestAccuracy': self.best_accuracy,
            'currentStreak': self.current_streak,
            'longestStreak': self.longest_streak,
            'lastPracticeDate': self.last_practice_date,
            'characterStats': self.character_stats,
            'dailyStats': self.daily_stats,
            'goals': self.goals,
            'achievements': self.achievements,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at
        }
