from flask import Blueprint, request, jsonify, current_app
import asyncio
import sys
import os
import uuid
from datetime import datetime

# Add the backend directory to the path if not already there
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from services.enhanced_analytics_service import EnhancedAnalyticsService
    ANALYTICS_AVAILABLE = True
except ImportError:
    ANALYTICS_AVAILABLE = False
    print("Warning: Enhanced analytics service not available")

try:
    from utils.validators import validate_session_data
except ImportError:
    def validate_session_data(data):
        """Fallback validator"""
        required_fields = ['wpm', 'accuracy', 'duration']
        errors = []
        
        if not data:
            return {'valid': False, 'errors': ['No data provided']}
        
        for field in required_fields:
            if field not in data:
                errors.append(f'Missing required field: {field}')
        
        try:
            if 'wpm' in data:
                wpm = int(data['wpm'])
                if wpm < 0 or wpm > 300:
                    errors.append('WPM must be between 0 and 300')
            
            if 'accuracy' in data:
                accuracy = int(data['accuracy'])
                if accuracy < 0 or accuracy > 100:
                    errors.append('Accuracy must be between 0 and 100')
            
            if 'duration' in data:
                duration = float(data['duration'])
                if duration < 0:
                    errors.append('Duration must be positive')
        
        except (ValueError, TypeError):
            errors.append('Invalid numeric data provided')
        
        return {'valid': len(errors) == 0, 'errors': errors}

try:
    from utils.decorators import handle_errors, rate_limit
except ImportError:
    # Fallback decorators
    def handle_errors(f):
        from functools import wraps
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except Exception as e:
                current_app.logger.error(f'Error in {f.__name__}: {e}')
                return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
        return decorated_function
    
    def rate_limit(max_requests=30, time_window=60):
        def decorator(f):
            return f  # No rate limiting in fallback mode
        return decorator

analytics_bp = Blueprint('analytics', __name__)

def get_analytics_service():
    """Get analytics service instance"""
    if not ANALYTICS_AVAILABLE:
        return None
    
    storage_path = current_app.config.get('DATA_DIR', 'data')
    return EnhancedAnalyticsService(storage_path)

@analytics_bp.route('/sessions', methods=['POST'])
@rate_limit(max_requests=30, time_window=60)
@handle_errors
def save_session():
    """Save typing session with enhanced analytics"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({
            'error': 'Enhanced analytics not available',
            'message': 'Please use the basic /api/save-stats endpoint instead'
        }), 503
    
    data = request.get_json()
    
    # Validate session data
    validation_result = validate_session_data(data)
    if not validation_result['valid']:
        return jsonify({
            'error': 'Validation failed',
            'details': validation_result['errors']
        }), 400
    
    # Prepare session data
    session_data = {
        'userId': data.get('userId', 'anonymous'),
        'wpm': data['wpm'],
        'accuracy': data['accuracy'],
        'duration': data['duration'],
        'errorsCount': data.get('errors', 0),
        'sessionType': data.get('mode', 'practice'),
        'contentType': data.get('itemType', 'custom'),
        'totalCharacters': data.get('totalCharacters', 0),
        'contentPreview': data.get('textPreview', ''),
        'keystrokes': data.get('keystrokes', []),
        'startTime': data.get('startTime'),
        'deviceInfo': {
            'userAgent': request.headers.get('User-Agent'),
            'viewport': data.get('viewport', {}),
            'timezone': data.get('timezone')
        }
    }
    
    analytics_service = get_analytics_service()
    result = asyncio.run(analytics_service.save_typing_session(session_data))
    
    return jsonify(result)

@analytics_bp.route('/sessions/<user_id>', methods=['GET'])
@analytics_bp.route('/sessions', methods=['GET'])
@handle_errors
def get_sessions(user_id='anonymous'):
    """Get user sessions with pagination"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({
            'error': 'Enhanced analytics not available',
            'sessions': [],
            'pagination': {'page': 1, 'limit': 10, 'total': 0, 'pages': 0}
        })
    
    limit = min(int(request.args.get('limit', 10)), 50)  # Max 50
    page = max(int(request.args.get('page', 1)), 1)
    
    analytics_service = get_analytics_service()
    sessions = analytics_service._load_sessions()
    
    # Filter by user
    user_sessions = [s for s in sessions if s.get('userId') == user_id]
    user_sessions.sort(key=lambda x: x.get('completedAt', ''), reverse=True)
    
    # Paginate
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_sessions = user_sessions[start_idx:end_idx]
    
    return jsonify({
        'success': True,
        'sessions': paginated_sessions,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': len(user_sessions),
            'pages': (len(user_sessions) + limit - 1) // limit
        }
    })

@analytics_bp.route('/detailed/<user_id>', methods=['GET'])
@analytics_bp.route('/detailed', methods=['GET'])
@handle_errors
def get_detailed_analytics(user_id='anonymous'):
    """Get detailed analytics for user"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({
            'error': 'Enhanced analytics not available',
            'data': {
                'userStats': {},
                'sessions': [],
                'recommendations': [],
                'performanceTrends': []
            }
        })
    
    time_range = request.args.get('timeRange', 'week')
    
    analytics_service = get_analytics_service()
    result = asyncio.run(analytics_service.get_detailed_analytics(user_id, time_range))
    
    return jsonify(result)

@analytics_bp.route('/stats/<user_id>', methods=['GET'])
@analytics_bp.route('/stats', methods=['GET'])
@handle_errors
def get_user_stats(user_id='anonymous'):
    """Get user statistics summary"""
    if not ANALYTICS_AVAILABLE:
        # Fallback to basic stats file
        try:
            import json
            stats_file = current_app.config.get('STATS_FILE', 'data/user_stats.json')
            with open(stats_file, 'r') as f:
                basic_stats = json.load(f)
            
            return jsonify({
                'success': True,
                'stats': basic_stats
            })
        except:
            return jsonify({
                'success': True,
                'stats': {
                    'averageWpm': 0,
                    'accuracy': 0,
                    'practiceMinutes': 0,
                    'currentStreak': 0,
                    'totalSessions': 0,
                    'bestWpm': 0,
                    'longestStreak': 0,
                    'recentSessions': []
                }
            })
    
    analytics_service = get_analytics_service()
    users = analytics_service._load_user_stats()
    
    if user_id not in users:
        return jsonify({
            'success': True,
            'stats': {
                'averageWpm': 0,
                'accuracy': 0,
                'practiceMinutes': 0,
                'currentStreak': 0,
                'totalSessions': 0,
                'bestWpm': 0,
                'longestStreak': 0,
                'recentSessions': []
            }
        })
    
    user_stats = users[user_id]
    
    # Get recent sessions for display
    sessions = analytics_service._load_sessions()
    recent_sessions = [s for s in sessions if s.get('userId') == user_id]
    recent_sessions.sort(key=lambda x: x.get('completedAt', ''), reverse=True)
    
    formatted_sessions = []
    for session in recent_sessions[:5]:
        duration = session.get('duration', 0)
        formatted_sessions.append({
            'date': session.get('completedAt', '')[:10],
            'duration': f"{int(duration / 60)}m {int(duration % 60)}s",
            'wpm': session.get('wpm', 0),
            'accuracy': session.get('accuracy', 0),
            'mode': session.get('contentType', 'Practice')
        })
    
    return jsonify({
        'success': True,
        'stats': {
            'averageWpm': user_stats.get('averageWpm', 0),
            'accuracy': user_stats.get('averageAccuracy', 0),
            'practiceMinutes': user_stats.get('totalPracticeTime', 0),
            'currentStreak': user_stats.get('currentStreak', 0),
            'totalSessions': user_stats.get('totalSessions', 0),
            'bestWpm': user_stats.get('bestWpm', 0),
            'longestStreak': user_stats.get('longestStreak', 0),
            'recentSessions': formatted_sessions
        }
    })

@analytics_bp.route('/goals/<user_id>', methods=['GET'])
@analytics_bp.route('/goals', methods=['GET'])
@handle_errors
def get_goals(user_id='anonymous'):
    """Get user goals"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({'success': True, 'goals': []})
    
    analytics_service = get_analytics_service()
    goals_data = analytics_service._load_goals()
    
    user_goals = goals_data.get(user_id, [])
    active_goals = [goal for goal in user_goals if goal.get('status') == 'active']
    
    return jsonify({'success': True, 'goals': active_goals})

@analytics_bp.route('/goals', methods=['POST'])
@handle_errors
def create_goal():
    """Create new user goal"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({
            'error': 'Enhanced analytics not available',
            'message': 'Goal creation requires enhanced analytics'
        }), 503
    
    data = request.get_json()
    user_id = data.get('userId', 'anonymous')
    
    analytics_service = get_analytics_service()
    goals_data = analytics_service._load_goals()
    
    if user_id not in goals_data:
        goals_data[user_id] = []
    
    new_goal = {
        'id': str(uuid.uuid4()),
        'title': data['title'],
        'type': data['type'],
        'targetValue': data['targetValue'],
        'unit': data.get('unit', ''),
        'deadline': data.get('deadline'),
        'status': 'active',
        'currentValue': 0,
        'progressPercentage': 0,
        'createdAt': datetime.now().isoformat(),
        'updatedAt': datetime.now().isoformat()
    }
    
    goals_data[user_id].append(new_goal)
    analytics_service._save_goals(goals_data)
    
    return jsonify({
        'success': True,
        'goal': new_goal,
        'message': 'Goal created successfully'
    })

@analytics_bp.route('/achievements/<user_id>', methods=['GET'])
@analytics_bp.route('/achievements', methods=['GET'])
@handle_errors
def get_achievements(user_id='anonymous'):
    """Get user achievements"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({'success': True, 'achievements': []})
    
    analytics_service = get_analytics_service()
    users = analytics_service._load_user_stats()
    
    if user_id not in users:
        return jsonify({'success': True, 'achievements': []})
    
    achievements = users[user_id].get('achievements', [])
    achievements.sort(key=lambda x: x.get('earnedAt', ''), reverse=True)
    
    return jsonify({'success': True, 'achievements': achievements})

@analytics_bp.route('/achievements-list', methods=['GET'])
@handle_errors
def get_available_achievements():
    """Get list of all available achievements"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({'success': True, 'achievements': []})
    
    analytics_service = get_analytics_service()
    achievements = analytics_service._get_available_achievements()
    
    return jsonify({'success': True, 'achievements': achievements})

@analytics_bp.route('/recommendations/<user_id>', methods=['GET'])
@analytics_bp.route('/recommendations', methods=['GET'])
@handle_errors
def get_recommendations(user_id='anonymous'):
    """Get personalized recommendations"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({'success': True, 'recommendations': []})
    
    analytics_service = get_analytics_service()
    recommendations = asyncio.run(analytics_service.generate_recommendations(user_id))
    
    return jsonify({'success': True, 'recommendations': recommendations})

@analytics_bp.route('/reset/<user_id>', methods=['DELETE'])
@analytics_bp.route('/reset', methods=['DELETE'])
@handle_errors
def reset_user_data(user_id='anonymous'):
    """Reset user data (for testing)"""
    if not ANALYTICS_AVAILABLE:
        return jsonify({
            'success': False,
            'message': 'Enhanced analytics not available for reset'
        })
    
    analytics_service = get_analytics_service()
    
    # Remove user from stats
    users = analytics_service._load_user_stats()
    if user_id in users:
        del users[user_id]
        analytics_service._save_user_stats(users)
    
    # Remove user sessions
    sessions = analytics_service._load_sessions()
    sessions = [s for s in sessions if s.get('userId') != user_id]
    analytics_service._save_sessions(sessions)
    
    # Remove user goals
    goals_data = analytics_service._load_goals()
    if user_id in goals_data:
        del goals_data[user_id]
        analytics_service._save_goals(goals_data)
    
    return jsonify({
        'success': True,
        'message': 'User data reset successfully'
    })

# Health check for analytics
@analytics_bp.route('/health', methods=['GET'])
def analytics_health():
    """Check analytics service health"""
    return jsonify({
        'status': 'healthy' if ANALYTICS_AVAILABLE else 'limited',
        'analytics_available': ANALYTICS_AVAILABLE,
        'message': 'Enhanced analytics service is available' if ANALYTICS_AVAILABLE else 'Running in basic mode'
    })