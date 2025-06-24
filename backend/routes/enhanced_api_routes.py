# backend/routes/enhanced_api_routes.py
"""
Enhanced API Routes for TypeTutor with complete Supabase integration
Handles authentication, sessions, achievements, goals, and analytics
"""

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from services.enhanced_database_service import get_supabase_service
from utils.validators import validate_session_data, validate_goal_data, validate_user_data
from utils.decorators import handle_errors, rate_limit

logger = logging.getLogger(__name__)

# Create blueprint
api_bp = Blueprint('enhanced_api', __name__)

def async_route(f):
    """Decorator to handle async functions in Flask routes"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(f(*args, **kwargs))
        finally:
            loop.close()
    return wrapper

def require_user_id(f):
    """Decorator to ensure user_id is provided"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user_id = request.headers.get('X-User-ID') or request.json.get('user_id') if request.json else None
        if not user_id:
            return jsonify({'error': 'User ID required', 'message': 'Include X-User-ID header or user_id in request'}), 400
        return f(user_id, *args, **kwargs)
    return wrapper

# Health and System
@api_bp.route('/health', methods=['GET'])
@handle_errors
@async_route
async def health_check():
    """Comprehensive health check"""
    service = get_supabase_service()
    health_data = await service.health_check()
    
    # Add system info
    health_data.update({
        'app_version': '2.0.0',
        'environment': current_app.config.get('FLASK_ENV', 'production'),
        'features': {
            'authentication': True,
            'achievements': True,
            'goals': True,
            'analytics': True,
            'pdf_processing': True,
            'real_time_stats': True
        }
    })
    
    status_code = 200 if health_data['status'] == 'healthy' else 503
    return jsonify(health_data), status_code

# User Management
@api_bp.route('/users/profile', methods=['GET'])
@handle_errors
@require_user_id
@async_route
async def get_user_profile(user_id):
    """Get user profile"""
    service = get_supabase_service()
    profile = await service.get_user_profile(user_id)
    
    if not profile:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'profile': profile
    })

@api_bp.route('/users/profile', methods=['PUT'])
@handle_errors
@require_user_id
@async_route
async def update_user_profile(user_id):
    """Update user profile"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate update data
    validation_result = validate_user_data(data, update=True)
    if not validation_result['valid']:
        return jsonify({
            'error': 'Validation failed',
            'details': validation_result['errors']
        }), 400
    
    service = get_supabase_service()
    updated_profile = await service.update_user_profile(user_id, data)
    
    if not updated_profile:
        return jsonify({'error': 'Failed to update profile'}), 500
    
    return jsonify({
        'success': True,
        'profile': updated_profile,
        'message': 'Profile updated successfully'
    })

@api_bp.route('/users/create', methods=['POST'])
@handle_errors
@async_route
async def create_user_profile():
    """Create user profile (called after authentication)"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate user data
    validation_result = validate_user_data(data)
    if not validation_result['valid']:
        return jsonify({
            'error': 'Validation failed',
            'details': validation_result['errors']
        }), 400
    
    service = get_supabase_service()
    
    try:
        profile = await service.create_user_profile(data)
        return jsonify({
            'success': True,
            'profile': profile,
            'message': 'User profile created successfully'
        })
    except Exception as e:
        logger.error(f"Error creating user profile: {e}")
        return jsonify({
            'error': 'Failed to create profile',
            'message': str(e)
        }), 500

# Session Management
@api_bp.route('/sessions', methods=['POST'])
@handle_errors
@require_user_id
@rate_limit(max_requests=30, time_window=60)
@async_route
async def save_typing_session(user_id):
    """Save typing session with full analytics"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No session data provided'}), 400
    
    # Add user_id to session data
    data['user_id'] = user_id
    
    # Validate session data
    validation_result = validate_session_data(data)
    if not validation_result['valid']:
        return jsonify({
            'error': 'Session validation failed',
            'details': validation_result['errors'],
            'warnings': validation_result.get('warnings', [])
        }), 400
    
    # Convert frontend data to database format
    session_data = {
        'user_id': user_id,
        'session_type': data.get('session_type', data.get('mode', 'practice')),
        'content_source': data.get('content_source', data.get('itemType', 'custom')),
        'content_id': data.get('content_id'),
        'wpm': float(data['wmp']),
        'accuracy': float(data['accuracy']),
        'duration_seconds': int(float(data['duration'])),
        'total_words': data.get('total_words', data.get('totalCharacters', 0) // 5),
        'correct_words': data.get('correct_words', 0),
        'incorrect_words': data.get('incorrect_words', data.get('errorsCount', 0)),
        'characters_typed': data.get('characters_typed', data.get('totalCharacters', 0)),
        'errors_count': data.get('errors_count', data.get('errorsCount', 0)),
        'corrections_count': data.get('corrections_count', 0),
        'consistency_score': data.get('consistency_score', 85),
        'session_data': {
            'device_info': data.get('device_info', {}),
            'keystrokes': data.get('keystrokes', []),
            'content_preview': data.get('content_preview', '')[:200],
            'practice_mode': data.get('practice_mode', 'paragraph'),
            'timestamp': data.get('timestamp', datetime.now().isoformat())
        },
        'start_time': data.get('start_time'),
        'end_time': data.get('end_time')
    }
    
    service = get_supabase_service()
    
    try:
        result = await service.save_typing_session(session_data)
        
        return jsonify({
            'success': True,
            'session_id': result['session_id'],
            'new_achievements': result['new_achievements'],
            'message': 'Session saved successfully',
            'achievements_earned': len(result['new_achievements'])
        })
        
    except Exception as e:
        logger.error(f"Error saving session: {e}")
        return jsonify({
            'error': 'Failed to save session',
            'message': str(e)
        }), 500

@api_bp.route('/sessions', methods=['GET'])
@handle_errors
@require_user_id
@async_route
async def get_user_sessions(user_id):
    """Get user's typing sessions with pagination"""
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 20)), 100)  # Max 100 per page
    session_type = request.args.get('type')
    
    service = get_supabase_service()
    
    try:
        # Build query
        query = service.client.table('typing_sessions')\
            .select('*')\
            .eq('user_id', user_id)
        
        if session_type:
            query = query.eq('session_type', session_type)
        
        # Get total count
        count_result = service.client.table('typing_sessions')\
            .select('*', count='exact')\
            .eq('user_id', user_id)
        
        if session_type:
            count_result = count_result.eq('session_type', session_type)
        
        count_data = count_result.execute()
        total_sessions = count_data.count
        
        # Get paginated data
        offset = (page - 1) * limit
        sessions_result = query.order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Format sessions
        sessions = []
        for session in sessions_result.data:
            duration = session['duration_seconds']
            minutes = int(duration // 60)
            seconds = int(duration % 60)
            
            sessions.append({
                'id': session['id'],
                'session_type': session['session_type'],
                'content_source': session['content_source'],
                'wmp': session['wpm'],
                'accuracy': session['accuracy'],
                'duration': f"{minutes}m {seconds}s",
                'duration_seconds': duration,
                'total_words': session['total_words'],
                'characters_typed': session['characters_typed'],
                'errors_count': session['errors_count'],
                'consistency_score': session.get('consistency_score', 0),
                'created_at': session['created_at'],
                'date': session['created_at'][:10]
            })
        
        total_pages = (total_sessions + limit - 1) // limit
        
        return jsonify({
            'success': True,
            'sessions': sessions,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_sessions,
                'pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        return jsonify({
            'error': 'Failed to get sessions',
            'message': str(e)
        }), 500

# Statistics
@api_bp.route('/stats', methods=['GET'])
@handle_errors
@require_user_id
@async_route
async def get_user_statistics(user_id):
    """Get comprehensive user statistics"""
    service = get_supabase_service()
    
    try:
        stats = await service.get_user_statistics(user_id)
        return jsonify({
            'success': True,
            'stats': stats,
            'source': 'database'
        })
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return jsonify({
            'error': 'Failed to get statistics',
            'message': str(e)
        }), 500

@api_bp.route('/stats/analytics', methods=['GET'])
@handle_errors
@require_user_id
@async_route
async def get_performance_analytics(user_id):
    """Get detailed performance analytics"""
    days = int(request.args.get('days', 30))
    days = min(max(days, 1), 365)  # Limit between 1 and 365 days
    
    service = get_supabase_service()
    
    try:
        analytics = await service.get_performance_analytics(user_id, days)
        
        return jsonify({
            'success': True,
            'analytics': analytics,
            'period_days': days
        })
        
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        return jsonify({
            'error': 'Failed to get analytics',
            'message': str(e)
        }), 500

# Achievements
@api_bp.route('/achievements', methods=['GET'])
@handle_errors
@require_user_id
@async_route
async def get_user_achievements(user_id):
    """Get user achievements"""
    status = request.args.get('status')  # earned, available, etc.
    
    service = get_supabase_service()
    
    try:
        achievements = await service.get_user_achievements(user_id, status)
        
        return jsonify({
            'success': True,
            'achievements': achievements,
            'count': len(achievements),
            'filter': status
        })
        
    except Exception as e:
        logger.error(f"Error getting achievements: {e}")
        return jsonify({
            'error': 'Failed to get achievements',
            'message': str(e)
        }), 500

@api_bp.route('/achievements/available', methods=['GET'])
@handle_errors
@async_route
async def get_available_achievements():
    """Get all available achievements (public endpoint)"""
    service = get_supabase_service()
    
    try:
        achievements = await service.get_available_achievements()
        
        # Group by category for better frontend organization
        grouped = {}
        for achievement in achievements:
            category = achievement['category']
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(achievement)
        
        return jsonify({
            'success': True,
            'achievements': achievements,
            'grouped': grouped,
            'categories': list(grouped.keys()),
            'total': len(achievements)
        })
        
    except Exception as e:
        logger.error(f"Error getting available achievements: {e}")
        return jsonify({
            'error': 'Failed to get available achievements',
            'message': str(e)
        }), 500

# Goals
@api_bp.route('/goals', methods=['GET'])
@handle_errors
@require_user_id
@async_route
async def get_user_goals(user_id):
    """Get user goals"""
    status = request.args.get('status', 'active')
    
    service = get_supabase_service()
    
    try:
        goals = await service.get_user_goals(user_id, status)
        
        return jsonify({
            'success': True,
            'goals': goals,
            'count': len(goals),
            'filter': status
        })
        
    except Exception as e:
        logger.error(f"Error getting goals: {e}")
        return jsonify({
            'error': 'Failed to get goals',
            'message': str(e)
        }), 500

@api_bp.route('/goals', methods=['POST'])
@handle_errors
@require_user_id
@async_route
async def create_goal(user_id):
    """Create a new goal"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No goal data provided'}), 400
    
    # Validate goal data
    validation_result = validate_goal_data(data)
    if not validation_result['valid']:
        return jsonify({
            'error': 'Goal validation failed',
            'details': validation_result['errors']
        }), 400
    
    service = get_supabase_service()
    
    try:
        goal = await service.create_goal(user_id, data)
        
        return jsonify({
            'success': True,
            'goal': goal,
            'message': 'Goal created successfully'
        })
        
    except Exception as e:
        logger.error(f"Error creating goal: {e}")
        return jsonify({
            'error': 'Failed to create goal',
            'message': str(e)
        }), 500

@api_bp.route('/goals/<goal_id>/progress', methods=['PUT'])
@handle_errors
@require_user_id
@async_route
async def update_goal_progress(user_id, goal_id):
    """Update goal progress"""
    data = request.get_json()
    if not data or 'current_value' not in data:
        return jsonify({'error': 'current_value required'}), 400
    
    try:
        current_value = float(data['current_value'])
    except (ValueError, TypeError):
        return jsonify({'error': 'current_value must be a number'}), 400
    
    service = get_supabase_service()
    
    try:
        updated_goal = await service.update_goal_progress(goal_id, current_value)
        
        if not updated_goal:
            return jsonify({'error': 'Goal not found'}), 404
        
        return jsonify({
            'success': True,
            'goal': updated_goal,
            'message': 'Goal progress updated'
        })
        
    except Exception as e:
        logger.error(f"Error updating goal progress: {e}")
        return jsonify({
            'error': 'Failed to update goal progress',
            'message': str(e)
        }), 500

# Documents
@api_bp.route('/documents', methods=['GET'])
@handle_errors
@require_user_id
@async_route
async def get_user_documents(user_id):
    """Get user's uploaded documents"""
    service = get_supabase_service()
    
    try:
        documents = await service.get_user_documents(user_id)
        
        return jsonify({
            'success': True,
            'documents': documents,
            'count': len(documents)
        })
        
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        return jsonify({
            'error': 'Failed to get documents',
            'message': str(e)
        }), 500

@api_bp.route('/documents', methods=['POST'])
@handle_errors
@require_user_id
@rate_limit(max_requests=5, time_window=60)  # Limit document uploads
@async_route
async def save_document(user_id):
    """Save document metadata after upload"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No document data provided'}), 400
    
    required_fields = ['filename', 'original_name', 'file_size', 'storage_path']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    service = get_supabase_service()
    
    try:
        document = await service.save_document(user_id, data)
        
        return jsonify({
            'success': True,
            'document': document,
            'message': 'Document saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving document: {e}")
        return jsonify({
            'error': 'Failed to save document',
            'message': str(e)
        }), 500

# Legacy API Compatibility (for existing frontend)
@api_bp.route('/save-stats', methods=['POST'])
@handle_errors
@async_route
async def legacy_save_stats():
    """Legacy endpoint for saving stats (redirects to new session endpoint)"""
    # Get user_id from various sources
    user_id = (request.headers.get('X-User-ID') or 
               request.json.get('userId') if request.json else None or
               'anonymous')
    
    if user_id == 'anonymous':
        # For anonymous users, fall back to file-based storage
        # Import the old stats service
        from services.stats_service import StatsService
        stats_service = StatsService(current_app.config['STATS_FILE'])
        
        data = request.get_json()
        result = stats_service.save_session(data)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 500
    
    # For authenticated users, use the new session endpoint
    request.view_args = {'user_id': user_id}
    return await save_typing_session(user_id)

@api_bp.route('/stats', methods=['GET'])
@handle_errors
@async_route
async def legacy_get_stats():
    """Legacy endpoint for getting stats"""
    user_id = request.headers.get('X-User-ID', 'anonymous')
    
    if user_id == 'anonymous':
        # Fall back to file-based storage
        from services.stats_service import StatsService
        stats_service = StatsService(current_app.config['STATS_FILE'])
        stats = stats_service.get_stats()
        return jsonify(stats)
    
    # Use new database endpoint
    return await get_user_statistics(user_id)

@api_bp.route('/reset-stats', methods=['POST'])
@handle_errors
@async_route
async def legacy_reset_stats():
    """Legacy endpoint for resetting stats"""
    user_id = request.headers.get('X-User-ID', 'anonymous')
    
    if user_id == 'anonymous':
        # Fall back to file-based storage
        from services.stats_service import StatsService
        stats_service = StatsService(current_app.config['STATS_FILE'])
        stats = stats_service.reset_stats()
        return jsonify({
            'success': True,
            'message': 'Statistics reset successfully',
            'stats': stats
        })
    
    # For authenticated users, you might want to implement a database reset
    # For now, return an error suggesting they should delete their account data
    return jsonify({
        'error': 'Reset not available for authenticated users',
        'message': 'Please contact support to reset your account data'
    }), 400

# Error handlers for the blueprint
@api_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': 'The request data is invalid or malformed',
        'status_code': 400
    }), 400

@api_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'error': 'Unauthorized',
        'message': 'Authentication required',
        'status_code': 401
    }), 401

@api_bp.errorhandler(403)
def forbidden(error):
    return jsonify({
        'error': 'Forbidden',
        'message': 'Access denied',
        'status_code': 403
    }), 403

@api_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'message': 'The requested resource was not found',
        'status_code': 404
    }), 404

@api_bp.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({
        'error': 'Rate Limit Exceeded',
        'message': 'Too many requests. Please try again later.',
        'status_code': 429
    }), 429

@api_bp.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred',
        'status_code': 500
    }), 500