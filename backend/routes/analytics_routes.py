from flask import Blueprint, request, jsonify, current_app
from services.enhanced_analytics_service import EnhancedAnalyticsService
from utils.validators import validate_session_data
from utils.decorators import handle_errors, rate_limit
import asyncio

analytics_bp = Blueprint('analytics', __name__)

def get_analytics_service():
    """Get analytics service instance"""
    storage_path = current_app.config.get('DATA_DIR', 'data')
    return EnhancedAnalyticsService(storage_path)

@analytics_bp.route('/sessions', methods=['POST'])
@rate_limit(max_requests=30, time_window=60)
@handle_errors
def save_session():
    """Save typing session with enhanced analytics"""
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
    limit = min(int(request.args.get('limit', 10)), 50)  # Max 50
    page = max(int(request.args.get('page', 1)), 1)
    
    analytics_service = get_analytics_service()
    sessions = analytics_service._load_sessions()
    
    # Filter by user
    user_sessions = [s for s in sessions if s['userId'] == user_id]
    user_sessions.sort(key=lambda x: x['completedAt'], reverse=True)
    
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
    time_range = request.args.get('timeRange', 'week')
    
    analytics_service = get_analytics_service()
    result = asyncio.run(analytics_service.get_detailed_analytics(user_id, time_range))
    
    return jsonify(result)

@analytics_bp.route('/stats/<user_id>', methods=['GET'])
@analytics_bp.route('/stats', methods=['GET'])
@handle_errors
def get_user_stats(user_id='anonymous'):
    """Get user statistics summary"""
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
    recent_sessions = [s for s in sessions if s['userId'] == user_id]
    recent_sessions.sort(key=lambda x: x['completedAt'], reverse=True)
    
    formatted_sessions = []
    for session in recent_sessions[:5]:
        formatted_sessions.append({
            'date': session['completedAt'][:10],
            'duration': f"{int(session['duration'] / 60)}m {int(session['duration'] % 60)}s",
            'wpm': session['wpm'],
            'accuracy': session['accuracy'],
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
    analytics_service = get_analytics_service()
    users = analytics_service._load_user_stats()
    
    if user_id not in users:
        return jsonify({'success': True, 'goals': []})
    
    goals = users[user_id].get('goals', [])
    active_goals = [goal for goal in goals if goal['status'] == 'active']
    
    return jsonify({'success': True, 'goals': active_goals})

@analytics_bp.route('/goals', methods=['POST'])
@handle_errors
def create_goal():
    """Create new user goal"""
    data = request.get_json()
    user_id = data.get('userId', 'anonymous')
    
    analytics_service = get_analytics_service()
    users = analytics_service._load_user_stats()
    
    if user_id not in users:
        from models.user_stats import UserStats
        user_stats = UserStats(user_id)
        users[user_id] = user_stats.to_dict()
    
    new_goal = {
        'id': str(uuid.uuid4()),
        'title': data['title'],
        'type': data['type'],
        'targetValue': data['targetValue'],
        'unit': data.get('unit', ''),
        'deadline': data.get('deadline'),
        'status': 'active',
        'currentValue': 0,
        'createdAt': datetime.now().isoformat()
    }
    
    users[user_id]['goals'].append(new_goal)
    analytics_service._save_user_stats(users)
    
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
    analytics_service = get_analytics_service()
    users = analytics_service._load_user_stats()
    
    if user_id not in users:
        return jsonify({'success': True, 'achievements': []})
    
    achievements = users[user_id].get('achievements', [])
    achievements.sort(key=lambda x: x['earnedAt'], reverse=True)
    
    return jsonify({'success': True, 'achievements': achievements})

@analytics_bp.route('/achievements-list', methods=['GET'])
@handle_errors
def get_available_achievements():
    """Get list of all available achievements"""
    analytics_service = get_analytics_service()
    achievements = analytics_service._get_available_achievements()
    
    return jsonify({'success': True, 'achievements': achievements})

@analytics_bp.route('/recommendations/<user_id>', methods=['GET'])
@analytics_bp.route('/recommendations', methods=['GET'])
@handle_errors
def get_recommendations(user_id='anonymous'):
    """Get personalized recommendations"""
    analytics_service = get_analytics_service()
    recommendations = asyncio.run(analytics_service.generate_recommendations(user_id))
    
    return jsonify({'success': True, 'recommendations': recommendations})

@analytics_bp.route('/characters/<user_id>', methods=['GET'])
@analytics_bp.route('/characters', methods=['GET'])
@handle_errors
def get_character_analytics(user_id='anonymous'):
    """Get character-level analytics"""
    analytics_service = get_analytics_service()
    users = analytics_service._load_user_stats()
    
    if user_id not in users:
        return jsonify({
            'success': True,
            'characterStats': [],
            'problemCharacters': []
        })
    
    character_stats = users[user_id].get('characterStats', [])
    problem_chars = [cs for cs in character_stats 
                    if cs['accuracy'] < 90 and cs['totalAttempts'] > 3]
    problem_chars.sort(key=lambda x: x['accuracy'])
    
    return jsonify({
        'success': True,
        'characterStats': character_stats,
        'problemCharacters': problem_chars[:10]
    })

@analytics_bp.route('/reset/<user_id>', methods=['DELETE'])
@analytics_bp.route('/reset', methods=['DELETE'])
@handle_errors
def reset_user_data(user_id='anonymous'):
    """Reset user data (for testing)"""
    analytics_service = get_analytics_service()
    
    # Remove user from stats
    users = analytics_service._load_user_stats()
    if user_id in users:
        del users[user_id]
        analytics_service._save_user_stats(users)
    
    # Remove user sessions
    sessions = analytics_service._load_sessions()
    sessions = [s for s in sessions if s['userId'] != user_id]
    analytics_service._save_sessions(sessions)
    
    return jsonify({
        'success': True,
        'message': 'User data reset successfully'
    })
