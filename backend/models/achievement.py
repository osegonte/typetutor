from datetime import datetime
from typing import Dict, Optional
import uuid

class Achievement:
    """Simple achievement model for TypeTutor"""
    
    def __init__(self, data: Dict = None):
        if data is None:
            data = {}
        
        # Achievement identification
        self.id = data.get('id', str(uuid.uuid4()))
        self.title = data.get('title', '')
        self.description = data.get('description', '')
        self.category = data.get('category', 'general')  # speed, accuracy, streak, milestone
        
        # Achievement criteria
        self.criteria = data.get('criteria', {})
        self.target_value = data.get('targetValue', 0)
        self.unit = data.get('unit', '')
        
        # Status and progress
        self.status = data.get('status', 'available')  # available, earned, locked
        self.progress_value = data.get('progressValue', 0)
        self.progress_percentage = data.get('progressPercentage', 0)
        
        # Metadata
        self.icon = data.get('icon', '🏆')
        self.points = data.get('points', 10)
        self.rarity = data.get('rarity', 'common')  # common, rare, epic, legendary
        
        # Timestamps
        self.earned_at = data.get('earnedAt')
        self.created_at = data.get('createdAt', datetime.now().isoformat())
    
    def update_progress(self, current_value: float) -> bool:
        """Update achievement progress and check if earned"""
        self.progress_value = current_value
        
        if self.target_value > 0:
            self.progress_percentage = min(100, (current_value / self.target_value) * 100)
        
        # Check if achievement is earned
        if current_value >= self.target_value and self.status != 'earned':
            self.status = 'earned'
            self.earned_at = datetime.now().isoformat()
            return True
        
        return False
    
    def to_dict(self) -> Dict:
        """Convert achievement to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'criteria': self.criteria,
            'targetValue': self.target_value,
            'unit': self.unit,
            'status': self.status,
            'progressValue': self.progress_value,
            'progressPercentage': self.progress_percentage,
            'icon': self.icon,
            'points': self.points,
            'rarity': self.rarity,
            'earnedAt': self.earned_at,
            'createdAt': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Achievement':
        """Create achievement from dictionary"""
        return cls(data)
    
    @staticmethod
    def get_default_achievements() -> list:
        """Get list of default achievements"""
        return [
            # Speed achievements
            Achievement({
                'id': 'speed_20',
                'title': 'Speed Novice',
                'description': 'Reach 20 WPM',
                'category': 'speed',
                'targetValue': 20,
                'unit': 'WPM',
                'icon': '🐢',
                'points': 10,
                'rarity': 'common'
            }),
            Achievement({
                'id': 'speed_40',
                'title': 'Speed Apprentice',
                'description': 'Reach 40 WPM',
                'category': 'speed',
                'targetValue': 40,
                'unit': 'WPM',
                'icon': '🏃',
                'points': 20,
                'rarity': 'common'
            }),
            Achievement({
                'id': 'speed_60',
                'title': 'Speed Expert',
                'description': 'Reach 60 WPM',
                'category': 'speed',
                'targetValue': 60,
                'unit': 'WPM',
                'icon': '⚡',
                'points': 50,
                'rarity': 'rare'
            }),
            Achievement({
                'id': 'speed_80',
                'title': 'Speed Demon',
                'description': 'Reach 80 WPM',
                'category': 'speed',
                'targetValue': 80,
                'unit': 'WPM',
                'icon': '🔥',
                'points': 100,
                'rarity': 'epic'
            }),
            
            # Accuracy achievements
            Achievement({
                'id': 'accuracy_90',
                'title': 'Precision Rookie',
                'description': 'Achieve 90% accuracy',
                'category': 'accuracy',
                'targetValue': 90,
                'unit': '%',
                'icon': '🎯',
                'points': 15,
                'rarity': 'common'
            }),
            Achievement({
                'id': 'accuracy_95',
                'title': 'Accuracy Expert',
                'description': 'Achieve 95% accuracy',
                'category': 'accuracy',
                'targetValue': 95,
                'unit': '%',
                'icon': '💎',
                'points': 30,
                'rarity': 'rare'
            }),
            Achievement({
                'id': 'accuracy_99',
                'title': 'Near Perfect',
                'description': 'Achieve 99% accuracy',
                'category': 'accuracy',
                'targetValue': 99,
                'unit': '%',
                'icon': '🌟',
                'points': 75,
                'rarity': 'epic'
            }),
            
            # Streak achievements
            Achievement({
                'id': 'streak_3',
                'title': 'Getting Started',
                'description': 'Practice 3 days in a row',
                'category': 'streak',
                'targetValue': 3,
                'unit': 'days',
                'icon': '📅',
                'points': 20,
                'rarity': 'common'
            }),
            Achievement({
                'id': 'streak_7',
                'title': 'Week Warrior',
                'description': 'Practice 7 days in a row',
                'category': 'streak',
                'targetValue': 7,
                'unit': 'days',
                'icon': '🗓️',
                'points': 50,
                'rarity': 'rare'
            }),
            
            # Milestone achievements
            Achievement({
                'id': 'milestone_1',
                'title': 'First Steps',
                'description': 'Complete your first session',
                'category': 'milestone',
                'targetValue': 1,
                'unit': 'sessions',
                'icon': '🎉',
                'points': 5,
                'rarity': 'common'
            }),
            Achievement({
                'id': 'milestone_10',
                'title': 'Dedicated Learner',
                'description': 'Complete 10 sessions',
                'category': 'milestone',
                'targetValue': 10,
                'unit': 'sessions',
                'icon': '📚',
                'points': 25,
                'rarity': 'common'
            }),
            Achievement({
                'id': 'milestone_50',
                'title': 'Typing Enthusiast',
                'description': 'Complete 50 sessions',
                'category': 'milestone',
                'targetValue': 50,
                'unit': 'sessions',
                'icon': '🏅',
                'points': 100,
                'rarity': 'rare'
            })
        ]