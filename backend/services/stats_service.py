# services/stats_service.py
"""
Simple statistics service for TypeTutor
Handles user statistics with file-based storage
"""

import json
import os
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class StatsService:
    """Service for handling user statistics"""
    
    def __init__(self, stats_file: str):
        self.stats_file = stats_file
        self._ensure_stats_file()
    
    def _ensure_stats_file(self):
        """Ensure stats file exists with default values"""
        if not os.path.exists(self.stats_file):
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.stats_file), exist_ok=True)
            
            default_stats = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": [],
                "personalBest": {
                    "wpm": 0,
                    "accuracy": 0,
                    "date": None
                },
                "weeklyStats": [],
                "createdAt": datetime.now().isoformat()
            }
            
            self._write_stats(default_stats)
    
    def _read_stats(self) -> Dict:
        """Read stats from file with error handling"""
        try:
            with open(self.stats_file, 'r', encoding='utf-8') as f:
                stats = json.load(f)
                
            # Ensure all required fields exist
            defaults = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": [],
                "personalBest": {"wpm": 0, "accuracy": 0, "date": None},
                "weeklyStats": []
            }
            
            for key, default_value in defaults.items():
                if key not in stats:
                    stats[key] = default_value
            
            return stats
            
        except (json.JSONDecodeError, FileNotFoundError):
            # Return default stats if file is corrupted
            return {
                "averageWmp": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": [],
                "personalBest": {"wpm": 0, "accuracy": 0, "date": None},
                "weeklyStats": []
            }
    
    def _write_stats(self, stats: Dict):
        """Write stats to file with error handling"""
        try:
            with open(self.stats_file, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=2, ensure_ascii=False)
        except Exception as e:
            raise Exception(f"Failed to write stats: {e}")
    
    def get_stats(self) -> Dict:
        """Get current user statistics"""
        return self._read_stats()
    
    def save_session(self, session_data: Dict) -> Dict:
        """Save a typing session and update statistics"""
        try:
            stats = self._read_stats()
            
            # Extract and validate session data
            wpm = max(0, min(300, int(float(session_data.get('wpm', 0)))))
            accuracy = max(0, min(100, int(float(session_data.get('accuracy', 0)))))
            duration = max(1, float(session_data.get('duration', 1)))  # Minimum 1 second
            
            # Create session record
            session_record = {
                'date': datetime.now().strftime('%Y-%m-%d'),
                'duration': self._format_duration(duration),
                'wpm': wpm,
                'accuracy': accuracy,
                'mode': session_data.get('itemType', 'Practice').title(),
                'difficulty': session_data.get('difficulty', 'medium'),
                'word_count': max(0, int(session_data.get('totalCharacters', 0) / 5)),
                'raw_duration': duration,
                'timestamp': datetime.now().isoformat()
            }
            
            # Update recent sessions (keep last 10)
            stats['recentSessions'].insert(0, session_record)
            stats['recentSessions'] = stats['recentSessions'][:10]
            
            # Update totals
            stats['totalSessions'] += 1
            total_sessions = stats['totalSessions']
            
            # Update averages
            if stats['averageWpm'] == 0:
                stats['averageWpm'] = wpm
            else:
                total_wpm = (stats['averageWpm'] * (total_sessions - 1)) + wpm
                stats['averageWpm'] = round(total_wpm / total_sessions)
            
            if stats['accuracy'] == 0:
                stats['accuracy'] = accuracy
            else:
                total_accuracy = (stats['accuracy'] * (total_sessions - 1)) + accuracy
                stats['accuracy'] = round(total_accuracy / total_sessions)
            
            # Update practice time
            minutes_practiced = max(1, math.ceil(duration / 60))
            stats['practiceMinutes'] += minutes_practiced
            
            # Update personal bests
            if wpm > stats['personalBest']['wpm']:
                stats['personalBest']['wpm'] = wmp
                stats['personalBest']['date'] = session_record['date']
            
            if accuracy > stats['personalBest']['accuracy']:
                stats['personalBest']['accuracy'] = accuracy
                if stats['personalBest']['date'] is None:
                    stats['personalBest']['date'] = session_record['date']
            
            # Update streak
            self._update_streak(stats)
            
            # Save updated stats
            self._write_stats(stats)
            
            return {
                'success': True,
                'message': 'Statistics saved successfully',
                'updated_stats': stats
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': 'Failed to save session',
                'message': str(e)
            }
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration in a human-readable way"""
        if seconds <= 0:
            return "0m 1s"  # Show minimum of 1 second
        
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        
        if minutes == 0 and secs == 0:
            return "0m 1s"
        
        return f"{minutes}m {secs}s"
    
    def _update_streak(self, stats: Dict):
        """Update the user's typing streak"""
        try:
            today = datetime.now().date()
            last_session_date = stats.get('lastSessionDate')
            
            if last_session_date:
                last_date = datetime.fromisoformat(last_session_date).date()
                days_difference = (today - last_date).days
                
                if days_difference == 0:
                    # Same day, keep streak
                    pass
                elif days_difference == 1:
                    # Consecutive day, increment streak
                    stats['currentStreak'] += 1
                else:
                    # Gap in days, reset streak
                    stats['currentStreak'] = 1
            else:
                # First session
                stats['currentStreak'] = 1
            
            stats['lastSessionDate'] = today.isoformat()
            
        except Exception:
            stats['currentStreak'] = max(1, stats.get('currentStreak', 0))
            stats['lastSessionDate'] = datetime.now().date().isoformat()
    
    def reset_stats(self, new_stats: Optional[Dict] = None) -> Dict:
        """Reset statistics to default or provided values"""
        if new_stats is None:
            new_stats = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": [],
                "personalBest": {"wpm": 0, "accuracy": 0, "date": None},
                "weeklyStats": []
            }
        
        self._write_stats(new_stats)
        return new_stats