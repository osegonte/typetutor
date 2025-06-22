# backend/routes/database_routes.py
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import asyncio
import sys
import os

# Add the backend directory to the path if not already there
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from database.supabase_client import get_supabase, check_database_health
    from services.database_service import DatabaseService
    from utils.decorators import handle_errors, rate_limit
    DATABASE_AVAILABLE = True
except ImportError as e:
    print(f"Database components not available: {e}")
    DATABASE_AVAILABLE = False

database_bp = Blueprint('database', __name__)

@database_bp.route('/db-health', methods=['GET'])
@handle_errors
def database_health():
    """Check database connection health"""
    if not DATABASE_AVAILABLE:
        return jsonify({
            'status': 'unavailable',
            'database_connected': False,
            'message': 'Database components not available',
            'error': 'Missing database dependencies'
        }), 503
    
    try:
        health_data = check_database_health()
        
        return jsonify({
            'status': 'healthy' if all(health_data.values()) else 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'database_connected': health_data.get('database_connected', False),
            'tables_accessible': health_data.get('tables_accessible', False),
            'sample_query_works': health_data.get('sample_query_works', False),
            'error': health_data.get('error'),
            'supabase_url': current_app.config.get('SUPABASE_URL', 'Not configured')[:50] + '...',
            'use_database': current_app.config.get('USE_DATABASE', False)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'database_connected': False,
            'message': 'Database health check failed',
            'error': str(e)
        }), 500

@database_bp.route('/db-stats', methods=['GET'])
@handle_errors 
def get_database_stats():
    """Get user statistics from database"""
    if not DATABASE_AVAILABLE:
        return jsonify({
            'error': 'Database not available',
            'message': 'Using fallback JSON storage'
        }), 503
    
    try:
        user_id = request.args.get('userId', 'anonymous')
        db_service = DatabaseService()
        stats = asyncio.run(db_service.get_user_statistics(user_id))
        
        return jsonify({
            'success': True,
            'stats': stats,
            'source': 'database'
        })
        
    except Exception as e:
        current_app.logger.error(f'Database stats error: {e}')
        return jsonify({
            'error': 'Failed to fetch stats from database',
            'message': str(e)
        }), 500

@database_bp.route('/db-save-stats', methods=['POST'])
@rate_limit(max_requests=30, time_window=60)
@handle_errors
def save_database_stats():
    """Save typing session to database"""
    if not DATABASE_AVAILABLE:
        return jsonify({
            'error': 'Database not available', 
            'message': 'Use /api/save-stats for JSON storage'
        }), 503
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['wpm', 'accuracy', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # Prepare session data for database
        session_data = {
            'userId': data.get('userId', 'anonymous'),
            'wpm': int(data['wpm']),
            'accuracy': int(data['accuracy']),
            'duration': float(data['duration']),
            'sessionType': data.get('sessionType', 'practice'),
            'contentType': data.get('contentType', 'custom'),
            'charactersTyped': data.get('charactersTyped', 0),
            'errorsCount': data.get('errorsCount', 0),
            'keystrokes': data.get('keystrokes', [])
        }
        
        db_service = DatabaseService()
        result = asyncio.run(db_service.save_typing_session(session_data))
        
        return jsonify({
            'success': True,
            'message': 'Session saved to database',
            'session_id': result.get('session_id'),
            'new_achievements': result.get('new_achievements', []),
            'source': 'database'
        })
        
    except Exception as e:
        current_app.logger.error(f'Database save error: {e}')
        return jsonify({
            'error': 'Failed to save to database',
            'message': str(e)
        }), 500

@database_bp.route('/db-achievements', methods=['GET'])
@handle_errors
def get_database_achievements():
    """Get user achievements from database"""
    if not DATABASE_AVAILABLE:
        return jsonify({
            'error': 'Database not available',
            'achievements': []
        }), 503
    
    try:
        user_id = request.args.get('userId', 'anonymous')
        db_service = DatabaseService()
        achievements = asyncio.run(db_service.get_user_achievements(user_id))
        
        return jsonify({
            'success': True,
            'achievements': achievements,
            'count': len(achievements),
            'source': 'database'
        })
        
    except Exception as e:
        current_app.logger.error(f'Database achievements error: {e}')
        return jsonify({
            'error': 'Failed to fetch achievements',
            'message': str(e),
            'achievements': []
        }), 500

@database_bp.route('/db-reset', methods=['POST'])
@handle_errors
def reset_database_stats():
    """Reset user data in database (for testing)"""
    if not DATABASE_AVAILABLE:
        return jsonify({'error': 'Database not available'}), 503
    
    try:
        user_id = request.json.get('userId', 'anonymous') if request.json else 'anonymous'
        
        # This would require additional implementation in DatabaseService
        # For now, return a placeholder response
        return jsonify({
            'success': True,
            'message': f'Database reset for user {user_id} (placeholder)',
            'source': 'database'
        })
        
    except Exception as e:
        current_app.logger.error(f'Database reset error: {e}')
        return jsonify({
            'error': 'Failed to reset database',
            'message': str(e)
        }), 500

@database_bp.route('/db-test', methods=['GET'])
@handle_errors
def test_database_operations():
    """Test database operations (development only)"""
    if not current_app.debug:
        return jsonify({'error': 'Only available in debug mode'}), 403
    
    if not DATABASE_AVAILABLE:
        return jsonify({'error': 'Database not available'}), 503
    
    try:
        # Test basic operations
        db_service = DatabaseService()
        
        # Test user creation
        user = asyncio.run(db_service.get_or_create_user('test-user'))
        
        # Test session save
        test_session = {
            'userId': 'test-user',
            'wpm': 45,
            'accuracy': 92,
            'duration': 120,
            'sessionType': 'test',
            'contentType': 'testing'
        }
        
        session_result = asyncio.run(db_service.save_typing_session(test_session))
        
        # Test stats retrieval
        stats = asyncio.run(db_service.get_user_statistics('test-user'))
        
        return jsonify({
            'success': True,
            'test_results': {
                'user_created': bool(user),
                'session_saved': session_result.get('success', False),
                'stats_retrieved': bool(stats),
                'user_id': user.get('id') if user else None,
                'session_id': session_result.get('session_id') if session_result else None
            },
            'message': 'Database test completed successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f'Database test error: {e}')
        return jsonify({
            'success': False,
            'error': 'Database test failed',
            'message': str(e)
        }), 500