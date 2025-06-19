import json
import os
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from utils.logging_config import get_logger

class StatsService:
    """Service for handling user statistics"""
    
    def __init__(self, stats_file: str):
        self.stats_file = stats_file
        self.logger = get_logger(__name__)
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
            self.logger.info("Created new stats file with defaults")
    
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
            
        except (json.JSONDecodeError, FileNotFoundError) as e:
            self.logger.error(f"Error reading stats file: {e}")
            # Return default stats if file is corrupted
            return {
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
    
    def _write_stats(self, stats: Dict):
        """Write stats to file with error handling"""
        try:
            # Create backup
            if os.path.exists(self.stats_file):
                backup_file = f"{self.stats_file}.backup"
                with open(self.stats_file, 'r') as original:
                    with open(backup_file, 'w') as backup:
                        backup.write(original.read())
            
            # Write new stats
            with open(self.stats_file, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            self.logger.error(f"Error writing stats: {e}")
            raise
    
    def get_stats(self) -> Dict:
        """Get current user statistics"""
        return self._read_stats()
    
    def save_session(self, session_data: Dict) -> Dict:
        """Save a typing session and update statistics"""
        try:
            stats = self._read_stats()
            
            # Validate session data
            wpm = int(session_data['wpm'])
            accuracy = int(session_data['accuracy'])
            duration = float(session_data['duration'])
            
            # Create session record
            session_record = {
                'date': session_data.get('timestamp', datetime.now().isoformat()),
                'duration': self._format_duration(duration),
                'wpm': wpm,
                'accuracy': accuracy,
                'mode': session_data.get('itemType', 'Practice'),
                'difficulty': session_data.get('difficulty', 'medium'),
                'word_count': session_data.get('word_count', 0)
            }
            
            # Update recent sessions (keep last 10)
            stats['recentSessions'].insert(0, session_record)
            stats['recentSessions'] = stats['recentSessions'][:10]
            
            # Update totals
            stats['totalSessions'] += 1
            total_sessions = stats['totalSessions']
            
            # Update averages using proper weighted calculation
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
            minutes_practiced = math.ceil(duration / 60)
            stats['practiceMinutes'] += minutes_practiced
            
            # Update personal bests
            if wpm > stats['personalBest']['wpm']:
                stats['personalBest']['wpm'] = wpm
                stats['personalBest']['date'] = session_record['date']
            
            if accuracy > stats['personalBest']['accuracy']:
                stats['personalBest']['accuracy'] = accuracy
                if stats['personalBest']['date'] is None:
                    stats['personalBest']['date'] = session_record['date']
            
            # Update streak
            self._update_streak(stats, session_record['date'])
            
            # Update weekly stats
            self._update_weekly_stats(stats, session_record)
            
            # Save updated stats
            self._write_stats(stats)
            
            self.logger.info(f"Session saved: {wpm} WPM, {accuracy}% accuracy")
            
            return {
                'success': True,
                'message': 'Statistics saved successfully',
                'updated_stats': stats,
                'session_summary': {
                    'improvement': self._calculate_improvement(stats, wpm, accuracy),
                    'personal_best': wpm >= stats['personalBest']['wpm'],
                    'streak_updated': True
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error saving session: {e}")
            raise
    
    def _update_streak(self, stats: Dict, session_date: str):
        """Update the user's typing streak"""
        try:
            today = datetime.fromisoformat(session_date[:10]).date()
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
            
        except Exception as e:
            self.logger.error(f"Error updating streak: {e}")
            stats['currentStreak'] = 1
            stats['lastSessionDate'] = datetime.now().date().isoformat()
    
    def _update_weekly_stats(self, stats: Dict, session: Dict):
        """Update weekly statistics"""
        try:
            # Get current week
            session_date = datetime.fromisoformat(session['date'][:10])
            week_start = session_date - timedelta(days=session_date.weekday())
            week_key = week_start.strftime('%Y-%m-%d')
            
            # Find or create week entry
            week_stats = None
            for week in stats['weeklyStats']:
                if week['week_start'] == week_key:
                    week_stats = week
                    break
            
            if not week_stats:
                week_stats = {
                    'week_start': week_key,
                    'sessions': 0,
                    'total_time': 0,
                    'best_wpm': 0,
                    'best_accuracy': 0,
                    'total_words': 0
                }
                stats['weeklyStats'].append(week_stats)
            
            # Update week stats
            week_stats['sessions'] += 1
            week_stats['total_time'] += session.get('word_count', 0) / max(session['wpm'], 1) * 60
            week_stats['best_wpm'] = max(week_stats['best_wpm'], session['wpm'])
            week_stats['best_accuracy'] = max(week_stats['best_accuracy'], session['accuracy'])
            week_stats['total_words'] += session.get('word_count', 0)
            
            # Keep only last 12 weeks
            stats['weeklyStats'] = sorted(stats['weeklyStats'], 
                                        key=lambda x: x['week_start'])[-12:]
            
        except Exception as e:
            self.logger.error(f"Error updating weekly stats: {e}")
    
    def _calculate_improvement(self, stats: Dict, current_wpm: int, current_accuracy: int) -> Dict:
        """Calculate improvement metrics"""
        recent_sessions = stats['recentSessions']
        
        if len(recent_sessions) < 2:
            return {'wpm_change': 0, 'accuracy_change': 0, 'trend': 'stable'}
        
        # Compare with average of last 3 sessions (excluding current)
        recent_wpm = sum(s['wpm'] for s in recent_sessions[1:4]) / min(3, len(recent_sessions) - 1)
        recent_accuracy = sum(s['accuracy'] for s in recent_sessions[1:4]) / min(3, len(recent_sessions) - 1)
        
        wpm_change = current_wpm - recent_wpm
        accuracy_change = current_accuracy - recent_accuracy
        
        if wpm_change > 2 or accuracy_change > 2:
            trend = 'improving'
        elif wpm_change < -2 or accuracy_change < -2:
            trend = 'declining'
        else:
            trend = 'stable'
        
        return {
            'wpm_change': round(wpm_change, 1),
            'accuracy_change': round(accuracy_change, 1),
            'trend': trend
        }
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration in a human-readable way"""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    
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
        self.logger.info("Statistics reset successfully")
        return new_stats
    
    def get_debug_info(self) -> Dict:
        """Get debug information about stats file"""
        info = {
            'stats_file_path': self.stats_file,
            'stats_file_exists': os.path.exists(self.stats_file),
            'stats_file_size': 0,
            'stats_file_readable': False,
            'stats_file_writable': False,
            'backup_exists': False
        }
        
        if os.path.exists(self.stats_file):
            try:
                stat = os.stat(self.stats_file)
                info['stats_file_size'] = stat.st_size
                info['stats_file_readable'] = os.access(self.stats_file, os.R_OK)
                info['stats_file_writable'] = os.access(self.stats_file, os.W_OK)
                info['last_modified'] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            except OSError as e:
                info['error'] = str(e)
        
        backup_file = f"{self.stats_file}.backup"
        info['backup_exists'] = os.path.exists(backup_file)
        
        return info
