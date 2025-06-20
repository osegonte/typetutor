from datetime import datetime, timedelta
from typing import Dict, Optional
import uuid

class Goal:
    """Simple goal model for TypeTutor"""
    
    def __init__(self, data: Dict = None):
        if data is None:
            data = {}
        
        # Goal identification
        self.id = data.get('id', str(uuid.uuid4()))
        self.title = data.get('title', '')
        self.description = data.get('description', '')
        self.type = data.get('type', 'speed')  # speed, accuracy, streak, time
        
        # Goal targets
        self.target_value = data.get('targetValue', 0)
        self.current_value = data.get('currentValue', 0)
        self.unit = data.get('unit', '')
        
        # Timeline
        self.deadline = data.get('deadline')
        self.duration_days = data.get('durationDays', 30)
        
        # Status
        self.status = data.get('status', 'active')  # active, completed, expired, paused
        self.progress_percentage = data.get('progressPercentage', 0)
        
        # Metadata
        self.priority = data.get('priority', 'medium')  # low, medium, high
        self.category = data.get('category', 'general')
        self.reward_points = data.get('rewardPoints', 50)
        
        # Timestamps
        self.created_at = data.get('createdAt', datetime.now().isoformat())
        self.updated_at = data.get('updatedAt', datetime.now().isoformat())
        self.completed_at = data.get('completedAt')
        
        # Auto-calculate deadline if not provided
        if not self.deadline and self.duration_days:
            deadline_date = datetime.now() + timedelta(days=self.duration_days)
            self.deadline = deadline_date.isoformat()
    
    def update_progress(self, new_value: float) -> bool:
        """Update goal progress and check completion"""
        self.current_value = max(self.current_value, new_value)  # Goals usually track maximums
        self.updated_at = datetime.now().isoformat()
        
        # Calculate progress percentage
        if self.target_value > 0:
            self.progress_percentage = min(100, (self.current_value / self.target_value) * 100)
        
        # Check if goal is completed
        if self.current_value >= self.target_value and self.status == 'active':
            self.status = 'completed'
            self.completed_at = datetime.now().isoformat()
            return True
        
        # Check if goal is expired
        if self.deadline and datetime.now() > datetime.fromisoformat(self.deadline) and self.status == 'active':
            self.status = 'expired'
        
        return False
    
    def get_time_remaining(self) -> Optional[str]:
        """Get human-readable time remaining"""
        if not self.deadline or self.status != 'active':
            return None
        
        deadline_dt = datetime.fromisoformat(self.deadline)
        now = datetime.now()
        
        if now > deadline_dt:
            return "Expired"
        
        delta = deadline_dt - now
        days = delta.days
        hours = delta.seconds // 3600
        
        if days > 0:
            return f"{days} day{'s' if days != 1 else ''}"
        elif hours > 0:
            return f"{hours} hour{'s' if hours != 1 else ''}"
        else:
            return "Less than 1 hour"
    
    def is_achievable(self) -> bool:
        """Check if goal is still achievable within deadline"""
        if self.status != 'active' or not self.deadline:
            return True
        
        deadline_dt = datetime.fromisoformat(self.deadline)
        if datetime.now() > deadline_dt:
            return False
        
        # Simple achievability check - could be enhanced with more sophisticated logic
        progress_needed = self.target_value - self.current_value
        return progress_needed >= 0
    
    def to_dict(self) -> Dict:
        """Convert goal to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'type': self.type,
            'targetValue': self.target_value,
            'currentValue': self.current_value,
            'unit': self.unit,
            'deadline': self.deadline,
            'durationDays': self.duration_days,
            'status': self.status,
            'progressPercentage': self.progress_percentage,
            'priority': self.priority,
            'category': self.category,
            'rewardPoints': self.reward_points,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at,
            'completedAt': self.completed_at,
            'timeRemaining': self.get_time_remaining(),
            'isAchievable': self.is_achievable()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Goal':
        """Create goal from dictionary"""
        return cls(data)
    
    @staticmethod
    def create_speed_goal(target_wpm: int, days: int = 30) -> 'Goal':
        """Create a speed improvement goal"""
        return Goal({
            'title': f'Reach {target_wpm} WPM',
            'description': f'Improve your typing speed to {target_wpm} words per minute',
            'type': 'speed',
            'targetValue': target_wpm,
            'unit': 'WPM',
            'durationDays': days,
            'category': 'speed',
            'priority': 'medium'
        })
    
    @staticmethod
    def create_accuracy_goal(target_accuracy: int, days: int = 30) -> 'Goal':
        """Create an accuracy improvement goal"""
        return Goal({
            'title': f'Achieve {target_accuracy}% Accuracy',
            'description': f'Improve your typing accuracy to {target_accuracy}%',
            'type': 'accuracy',
            'targetValue': target_accuracy,
            'unit': '%',
            'durationDays': days,
            'category': 'accuracy',
            'priority': 'medium'
        })
    
    @staticmethod
    def create_streak_goal(target_days: int) -> 'Goal':
        """Create a practice streak goal"""
        return Goal({
            'title': f'{target_days}-Day Practice Streak',
            'description': f'Practice typing for {target_days} consecutive days',
            'type': 'streak',
            'targetValue': target_days,
            'unit': 'days',
            'durationDays': target_days + 7,  # Add buffer time
            'category': 'consistency',
            'priority': 'high'
        })
    
    @staticmethod
    def get_suggested_goals(current_stats: Dict) -> list:
        """Get suggested goals based on current performance"""
        suggestions = []
        
        current_wpm = current_stats.get('averageWpm', 0)
        current_accuracy = current_stats.get('accuracy', 0)
        current_streak = current_stats.get('currentStreak', 0)
        
        # Speed goals
        if current_wpm < 30:
            suggestions.append(Goal.create_speed_goal(30, 30))
        elif current_wpm < 50:
            suggestions.append(Goal.create_speed_goal(50, 45))
        elif current_wpm < 70:
            suggestions.append(Goal.create_speed_goal(70, 60))
        
        # Accuracy goals
        if current_accuracy < 90:
            suggestions.append(Goal.create_accuracy_goal(90, 30))
        elif current_accuracy < 95:
            suggestions.append(Goal.create_accuracy_goal(95, 45))
        
        # Streak goals
        if current_streak < 7:
            suggestions.append(Goal.create_streak_goal(7))
        elif current_streak < 30:
            suggestions.append(Goal.create_streak_goal(30))
        
        return suggestions