from datetime import datetime
from typing import List, Dict, Optional
import uuid

class TypingSession:
    """Enhanced typing session model with detailed analytics"""
    
    def __init__(self, data: Dict):
        # Session identification
        self.session_id = data.get('sessionId', str(uuid.uuid4()))
        self.user_id = data.get('userId', 'anonymous')
        
        # Session metadata
        self.session_type = data.get('sessionType', 'practice')  # practice, test, custom, paragraph
        self.content_type = data.get('contentType', 'custom')  # technical, literature, news, custom
        self.content_preview = data.get('contentPreview', '')[:100]
        self.content_length = data.get('contentLength', 0)
        
        # Performance metrics
        self.wpm = data['wpm']
        self.accuracy = data['accuracy']
        self.consistency_score = data.get('consistencyScore', 85)
        self.duration = data['duration']  # seconds
        self.characters_typed = data.get('charactersTyped', 0)
        self.errors_count = data.get('errorsCount', 0)
        self.corrections_count = data.get('correctionsCount', 0)
        
        # Advanced metrics
        self.peak_wpm = data.get('peakWpm', self.wpm)
        self.average_keystroke_time = data.get('averageKeystrokeTime', 0)
        self.total_keystrokes = data.get('totalKeystrokes', 0)
        self.backspaces_used = data.get('backspacesUsed', 0)
        
        # Session context
        self.device_info = data.get('deviceInfo', {})
        self.practice_mode = data.get('practiceMode', 'paragraph')
        
        # Detailed keystroke data
        self.keystrokes = data.get('keystrokes', [])
        
        # Timestamps
        self.started_at = data.get('startedAt', datetime.now())
        self.completed_at = data.get('completedAt', datetime.now())
        self.created_at = datetime.now()
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for storage"""
        return {
            'sessionId': self.session_id,
            'userId': self.user_id,
            'sessionType': self.session_type,
            'contentType': self.content_type,
            'contentPreview': self.content_preview,
            'contentLength': self.content_length,
            'wpm': self.wpm,
            'accuracy': self.accuracy,
            'consistencyScore': self.consistency_score,
            'duration': self.duration,
            'charactersTyped': self.characters_typed,
            'errorsCount': self.errors_count,
            'correctionsCount': self.corrections_count,
            'peakWpm': self.peak_wpm,
            'averageKeystrokeTime': self.average_keystroke_time,
            'totalKeystrokes': self.total_keystrokes,
            'backspacesUsed': self.backspaces_used,
            'deviceInfo': self.device_info,
            'practiceMode': self.practice_mode,
            'keystrokes': self.keystrokes,
            'startedAt': self.started_at,
            'completedAt': self.completed_at,
            'createdAt': self.created_at
        }
