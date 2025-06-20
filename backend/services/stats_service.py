import json
import os
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from utils.logging_config import get_logger

class StatsService:
    """Service for handling user statistics with robust data validation"""
    
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
        """Save a typing session and update statistics with enhanced validation"""
        try:
            # DEBUG: Log raw session data
            self.logger.info(f"Raw session data received: {session_data}")
            
            stats = self._read_stats()
            
            # Validate and extract session data with enhanced checks
            wpm = self._validate_wpm(session_data.get('wpm', 0))
            accuracy = self._validate_accuracy(session_data.get('accuracy', 0))
            duration = self._validate_duration(session_data.get('duration', 0))
            
            # DEBUG: Log parsed values
            self.logger.info(f"Parsed values - WPM: {wpm}, Accuracy: {accuracy}, Duration: {duration}")
            
            # Handle edge case where duration is 0
            if duration <= 0:
                self.logger.warning(f"Invalid duration received: {duration}. Using minimum of 1 second.")
                duration = 1.0  # Set minimum duration to avoid "0m 0s"
            
            # Validate minimum session requirements
            if wpm <= 0 and accuracy <= 0:
                self.logger.warning("Invalid session: both WPM and accuracy are 0")
                return {
                    'success': False,
                    'error': 'Invalid session data: no meaningful typing detected',
                    'message': 'Please ensure you complete some typing before saving the session.'
                }
            
            # Get actual timestamp or use current time
            session_timestamp = session_data.get('timestamp')
            if not session_timestamp:
                session_timestamp = datetime.now().isoformat()
            
            # Create session record with formatted duration
            session_record = {
                'date': self._format_date(session_timestamp),
                'duration': self._format_duration(duration),
                'wpm': wpm,
                'accuracy': accuracy,
                'mode': self._clean_mode(session_data.get('itemType', 'Practice')),
                'difficulty': session_data.get('difficulty', 'medium'),
                'word_count': max(0, int(session_data.get('totalCharacters', 0) / 5)),  # Estimate words
                'raw_duration': duration,  # Keep raw duration for calculations
                'timestamp': session_timestamp
            }
            
            # DEBUG: Log session record
            self.logger.info(f"Created session record: {session_record}")
            
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
            
            # Update practice time (use actual duration, not formatted)
            minutes_practiced = max(1, math.ceil(duration / 60))
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
            self._update_streak(stats, session_timestamp)
            
            # Update weekly stats
            self._update_weekly_stats(stats, session_record)
            
            # Save updated stats
            self._write_stats(stats)
            
            self.logger.info(f"Session saved successfully: {wpm} WPM, {accuracy}% accuracy, {self._format_duration(duration)}")
            
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
            # Return error response instead of raising
            return {
                'success': False,
                'error': 'Failed to save session',
                'message': str(e)
            }
    
    def _validate_wpm(self, wpm_value) -> int:
        """Validate and clean WPM value"""
        try:
            wpm = int(float(wpm_value))
            if wpm < 0:
                self.logger.warning(f"Negative WPM value: {wpm}, setting to 0")
                return 0
            if wpm > 300:
                self.logger.warning(f"Extremely high WPM value: {wpm}, capping at 300")
                return 300
            return wpm
        except (ValueError, TypeError):
            self.logger.warning(f"Invalid WPM value: {wpm_value}, defaulting to 0")
            return 0
    
    def _validate_accuracy(self, accuracy_value) -> int:
        """Validate and clean accuracy value"""
        try:
            accuracy = int(float(accuracy_value))
            if accuracy < 0:
                self.logger.warning(f"Negative accuracy value: {accuracy}, setting to 0")
                return 0
            if accuracy > 100:
                self.logger.warning(f"Accuracy over 100%: {accuracy}, capping at 100")
                return 100
            return accuracy
        except (ValueError, TypeError):
            self.logger.warning(f"Invalid accuracy value: {accuracy_value}, defaulting to 0")
            return 0
    
    def _validate_duration(self, duration_value) -> float:
        """Validate and clean duration value"""
        try:
            duration = float(duration_value)
            if duration < 0:
                self.logger.warning(f"Negative duration: {duration}, setting to 0")
                return 0.0
            if duration > 7200:  # 2 hours max
                self.logger.warning(f"Very long duration: {duration}s, capping at 2 hours")
                return 7200.0
            return duration
        except (ValueError, TypeError):
            self.logger.warning(f"Invalid duration value: {duration_value}, defaulting to 0")
            return 0.0
    
    def _clean_mode(self, mode_value) -> str:
        """Clean and standardize mode/itemType value"""
        if not mode_value or not isinstance(mode_value, str):
            return 'Practice'
        
        # Map common variations to standard names
        mode_map = {
            'custom': 'Custom Text',
            'custom text': 'Custom Text', 
            'pdf': 'PDF Practice',
            'pdf practice': 'PDF Practice',
            'paragraph': 'Paragraph',
            'test': 'Typing Test',
            'practice': 'Practice'
        }
        
        cleaned_mode = mode_value.lower().strip()
        return mode_map.get(cleaned_mode, mode_value.title())
    
    def _format_date(self, timestamp_str: str) -> str:
        """Format timestamp to user-friendly date"""
        try:
            if 'T' in timestamp_str:
                dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            else:
                dt = datetime.fromisoformat(timestamp_str)
            return dt.strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            return datetime.now().strftime('%Y-%m-%d')
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration in a human-readable way"""
        if seconds <= 0:
            return "0m 1s"  # Show minimum of 1 second instead of 0m 0s
        
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        
        if minutes == 0 and secs == 0:
            return "0m 1s"  # Handle edge case
        
        return f"{minutes}m {secs}s"
    
    def _update_streak(self, stats: Dict, session_timestamp: str):
        """Update the user's typing streak"""
        try:
            # Extract date from timestamp
            if 'T' in session_timestamp:
                today = datetime.fromisoformat(session_timestamp.replace('Z', '+00:00')).date()
            else:
                today = datetime.fromisoformat(session_timestamp).date()
            
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
            stats['currentStreak'] = max(1, stats.get('currentStreak', 0))
            stats['lastSessionDate'] = datetime.now().date().isoformat()
    
    def _update_weekly_stats(self, stats: Dict, session: Dict):
        """Update weekly statistics"""
        try:
            # Get current week from session date
            session_date = datetime.fromisoformat(session['timestamp'][:10])
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
            
            # Update week stats using raw duration
            week_stats['sessions'] += 1
            week_stats['total_time'] += session.get('raw_duration', 0)
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
        comparison_sessions = recent_sessions[1:4]
        if not comparison_sessions:
            return {'wpm_change': 0, 'accuracy_change': 0, 'trend': 'stable'}
        
        recent_wpm = sum(s['wpm'] for s in comparison_sessions) / len(comparison_sessions)
        recent_accuracy = sum(s['accuracy'] for s in comparison_sessions) / len(comparison_sessions)
        
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
        """Get debug information about stats file and recent sessions"""
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
                
                # Add sample recent sessions for debugging
                try:
                    stats = self._read_stats()
                    info['recent_sessions_count'] = len(stats.get('recentSessions', []))
                    info['sample_recent_sessions'] = stats.get('recentSessions', [])[:3]
                    info['total_sessions'] = stats.get('totalSessions', 0)
                except Exception as e:
                    info['stats_read_error'] = str(e)
                    
            except OSError as e:
                info['error'] = str(e)
        
        backup_file = f"{self.stats_file}.backup"
        info['backup_exists'] = os.path.exists(backup_file)
        
        return info