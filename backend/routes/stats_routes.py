from flask import Blueprint, request, jsonify, current_app
from services.stats_service import StatsService
from utils.validators import validate_stats_data, create_validation_report
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
    """Save typing session statistics with enhanced validation and debugging"""
    data = request.get_json()
    
    # Enhanced validation with detailed reporting
    validation_result = validate_stats_data(data)
    
    # Log validation details for debugging
    current_app.logger.info(f"Stats validation result: {validation_result}")
    
    if not validation_result['valid']:
        # Create detailed validation report for debugging
        validation_report = create_validation_report(data)
        current_app.logger.error(f"Validation failed:\n{validation_report}")
        
        return jsonify({
            'error': 'Validation failed',
            'message': 'Invalid statistics data provided',
            'details': validation_result['errors'],
            'warnings': validation_result.get('warnings', []),
            'validation_report': validation_report if current_app.debug else None
        }), 400
    
    # Log warnings even if validation passes
    if validation_result.get('warnings'):
        for warning in validation_result['warnings']:
            current_app.logger.warning(f"Stats data warning: {warning}")
    
    # Save session using enhanced stats service
    stats_service = get_stats_service()
    result = stats_service.save_session(data)
    
    # Handle case where save_session returns error dict instead of raising
    if not result.get('success', False):
        current_app.logger.error(f"Failed to save session: {result.get('message', 'Unknown error')}")
        return jsonify({
            'error': result.get('error', 'Save failed'),
            'message': result.get('message', 'Failed to save session statistics'),
            'debug_info': result if current_app.debug else None
        }), 500
    
    # Success response with additional debug info in development
    response_data = {
        'success': True,
        'message': 'Statistics saved successfully',
        'updated_stats': result['updated_stats']
    }
    
    # Add debug information in development mode
    if current_app.debug:
        response_data['debug_info'] = {
            'validation_warnings': validation_result.get('warnings', []),
            'session_summary': result.get('session_summary', {}),
            'data_received': validation_result.get('data_summary', {})
        }
    
    return jsonify(response_data)

@stats_bp.route('/reset-stats', methods=['POST'])
@handle_errors
def reset_stats():
    """Reset user statistics"""
    data = request.get_json() or {}
    
    stats_service = get_stats_service()
    reset_stats = stats_service.reset_stats(data if data else None)
    
    current_app.logger.info("User statistics reset")
    
    return jsonify({
        'success': True,
        'message': 'Statistics reset successfully',
        'stats': reset_stats
    })

@stats_bp.route('/debug-stats', methods=['GET'])
@handle_errors
def debug_stats():
    """Get comprehensive debug information about statistics"""
    stats_service = get_stats_service()
    debug_info = stats_service.get_debug_info()
    
    # Add current stats
    try:
        current_stats = stats_service.get_stats()
        debug_info['current_stats'] = current_stats
        debug_info['stats_valid'] = True
        
        # Analyze recent sessions for common issues
        recent_sessions = current_stats.get('recentSessions', [])
        debug_info['recent_sessions_analysis'] = analyze_recent_sessions(recent_sessions)
        
    except Exception as e:
        debug_info['stats_valid'] = False
        debug_info['stats_error'] = str(e)
    
    # Add system information
    debug_info['system_info'] = {
        'flask_debug': current_app.debug,
        'stats_file_config': current_app.config.get('STATS_FILE', 'Not configured'),
        'app_name': current_app.name,
        'request_info': {
            'method': request.method,
            'endpoint': request.endpoint,
            'remote_addr': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown')
        }
    }
    
    return jsonify(debug_info)

@stats_bp.route('/validate-session', methods=['POST'])
@handle_errors
def validate_session():
    """Validate session data without saving (for debugging)"""
    data = request.get_json()
    
    # Perform validation
    validation_result = validate_stats_data(data)
    
    # Create detailed report
    validation_report = create_validation_report(data)
    
    current_app.logger.info(f"Session validation request: {validation_result}")
    
    return jsonify({
        'validation_result': validation_result,
        'validation_report': validation_report,
        'data_received': data,
        'recommendations': get_validation_recommendations(validation_result, data)
    })

@stats_bp.route('/test-duration-formatting', methods=['GET'])
@handle_errors
def test_duration_formatting():
    """Test endpoint for duration formatting (development only)"""
    if not current_app.debug:
        return jsonify({'error': 'Only available in debug mode'}), 403
    
    test_durations = [0, 0.5, 1, 30, 60, 90, 180.7, 3661, -5, float('nan')]
    results = []
    
    for duration in test_durations:
        try:
            # Use the same formatting logic as StatsService
            if duration <= 0 or not isinstance(duration, (int, float)) or duration != duration:  # NaN check
                formatted = "0m 1s"
            else:
                minutes = int(duration // 60)
                seconds = int(duration % 60)
                if minutes == 0 and seconds == 0:
                    formatted = "0m 1s"
                else:
                    formatted = f"{minutes}m {seconds}s"
            
            results.append({
                'input': duration,
                'input_type': type(duration).__name__,
                'output': formatted,
                'is_problem': formatted == "0m 0s"
            })
        except Exception as e:
            results.append({
                'input': duration,
                'input_type': type(duration).__name__,
                'output': f"Error: {e}",
                'is_problem': True
            })
    
    return jsonify({
        'test_results': results,
        'summary': {
            'total_tests': len(results),
            'problematic_cases': len([r for r in results if r.get('is_problem', False)])
        }
    })

def analyze_recent_sessions(recent_sessions):
    """Analyze recent sessions for common issues"""
    analysis = {
        'total_sessions': len(recent_sessions),
        'zero_duration_count': 0,
        'zero_wpm_count': 0,
        'zero_accuracy_count': 0,
        'missing_fields': [],
        'unusual_patterns': []
    }
    
    for session in recent_sessions:
        # Check for zero duration (the main issue)
        if session.get('duration') == '0m 0s':
            analysis['zero_duration_count'] += 1
        
        # Check for zero WPM
        if session.get('wpm', 0) == 0:
            analysis['zero_wpm_count'] += 1
        
        # Check for zero accuracy
        if session.get('accuracy', 0) == 0:
            analysis['zero_accuracy_count'] += 1
        
        # Check for missing fields
        required_fields = ['date', 'duration', 'wpm', 'accuracy', 'mode']
        for field in required_fields:
            if field not in session:
                if field not in analysis['missing_fields']:
                    analysis['missing_fields'].append(field)
        
        # Check for unusual patterns
        if session.get('wpm', 0) > 200:
            analysis['unusual_patterns'].append(f"Very high WPM: {session.get('wpm')}")
        
        if session.get('accuracy', 0) == 100 and session.get('wpm', 0) > 100:
            analysis['unusual_patterns'].append("Perfect accuracy with very high WPM (suspicious)")
    
    # Add problem indicators
    analysis['has_duration_issues'] = analysis['zero_duration_count'] > 0
    analysis['has_wpm_issues'] = analysis['zero_wpm_count'] > 0
    analysis['has_accuracy_issues'] = analysis['zero_accuracy_count'] > 0
    
    # Calculate percentages
    if analysis['total_sessions'] > 0:
        analysis['duration_issue_percentage'] = (analysis['zero_duration_count'] / analysis['total_sessions']) * 100
        analysis['wpm_issue_percentage'] = (analysis['zero_wmp_count'] / analysis['total_sessions']) * 100
        analysis['accuracy_issue_percentage'] = (analysis['zero_accuracy_count'] / analysis['total_sessions']) * 100
    
    return analysis

def get_validation_recommendations(validation_result, data):
    """Generate recommendations based on validation results"""
    recommendations = []
    
    if not validation_result['valid']:
        errors = validation_result.get('errors', [])
        
        for error in errors:
            if 'duration' in error.lower():
                if 'is 0' in error:
                    recommendations.append({
                        'issue': 'Zero Duration',
                        'cause': 'Frontend timer not working correctly',
                        'solution': 'Check startTime initialization and timer logic in React component',
                        'debug_steps': [
                            'Add console.log for startTime when timer starts',
                            'Add console.log for endTime when timer stops', 
                            'Verify timer state management',
                            'Check for timer resets during session'
                        ]
                    })
                elif 'negative' in error:
                    recommendations.append({
                        'issue': 'Negative Duration',
                        'cause': 'endTime is before startTime',
                        'solution': 'Fix time calculation logic',
                        'debug_steps': [
                            'Verify Date.now() usage',
                            'Check for timezone issues',
                            'Ensure endTime > startTime'
                        ]
                    })
            
            elif 'wpm' in error.lower():
                if 'is 0' in error:
                    recommendations.append({
                        'issue': 'Zero WPM',
                        'cause': 'No words detected or calculation error',
                        'solution': 'Check word counting and WPM calculation',
                        'debug_steps': [
                            'Verify totalCharacters is being tracked',
                            'Check WPM formula: (chars/5) / (minutes)',
                            'Ensure typing is actually detected'
                        ]
                    })
    
    # Add general recommendations
    if data and data.get('duration', 0) == 0:
        recommendations.append({
            'issue': 'Timer Integration',
            'cause': 'Frontend-Backend timing mismatch',
            'solution': 'Use the provided debug helper components',
            'debug_steps': [
                'Implement useTypingTimerWithDebug hook',
                'Add TimerDebugPanel to UI',
                'Use saveStatsWithDebug function',
                'Check browser console for timer logs'
            ]
        })
    
    return recommendations