from flask import Blueprint, request, jsonify, current_app
from services.stats_service import StatsService
from utils.validators import validate_stats_data
from utils.decorators import handle_errors, rate_limit

stats_bp = Blueprint('stats', __name__)

def get_stats_service():
    """Get stats service instance"""
    stats_file = current_app.config['STATS_FILE']
    return StatsService(stats_file)

@stats_bp.route('/stats', methods=['GET'])
@handle_errors
def get_stats():
    """Get user statistics"""
    stats_service = get_stats_service()
    stats = stats_service.get_stats()
    return jsonify(stats)

@stats_bp.route('/save-stats', methods=['POST'])
@rate_limit(max_requests=30, time_window=60)  # 30 saves per minute
@handle_errors
def save_stats():
    """Save typing session statistics"""
    data = request.get_json()
    
    # Validate input
    validation_result = validate_stats_data(data)
    if not validation_result['valid']:
        return jsonify({
            'error': 'Validation failed',
            'message': 'Invalid statistics data',
            'details': validation_result['errors']
        }), 400
    
    # Save session
    stats_service = get_stats_service()
    result = stats_service.save_session(data)
    
    return jsonify(result)

@stats_bp.route('/reset-stats', methods=['POST'])
@handle_errors
def reset_stats():
    """Reset user statistics"""
    data = request.get_json() or {}
    
    stats_service = get_stats_service()
    reset_stats = stats_service.reset_stats(data if data else None)
    
    return jsonify({
        'success': True,
        'message': 'Statistics reset successfully',
        'stats': reset_stats
    })

@stats_bp.route('/debug-stats', methods=['GET'])
@handle_errors
def debug_stats():
    """Get debug information about statistics"""
    stats_service = get_stats_service()
    debug_info = stats_service.get_debug_info()
    
    # Add current stats
    try:
        debug_info['current_stats'] = stats_service.get_stats()
        debug_info['stats_valid'] = True
    except Exception as e:
        debug_info['stats_valid'] = False
        debug_info['stats_error'] = str(e)
    
    return jsonify(debug_info)
