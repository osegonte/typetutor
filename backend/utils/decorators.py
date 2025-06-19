from functools import wraps
from flask import request, jsonify, current_app
import time
from collections import defaultdict

# Rate limiter storage
rate_limiter_storage = defaultdict(list)

def handle_errors(f):
    """Decorator to handle common errors"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except FileNotFoundError as e:
            current_app.logger.error(f'File not found: {e}')
            return jsonify({'error': 'File not found', 'message': str(e)}), 404
        except PermissionError as e:
            current_app.logger.error(f'Permission error: {e}')
            return jsonify({'error': 'Permission denied', 'message': str(e)}), 403
        except ValueError as e:
            current_app.logger.error(f'Value error: {e}')
            return jsonify({'error': 'Invalid data', 'message': str(e)}), 400
        except Exception as e:
            current_app.logger.error(f'Unexpected error: {e}')
            return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred'}), 500
    return decorated_function

def rate_limit(max_requests=None, time_window=None):
    """Rate limiting decorator - disabled during testing"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Skip rate limiting during testing
            if current_app.config.get('TESTING', False):
                return f(*args, **kwargs)
            
            # Get rate limit settings from app config or use defaults
            max_reqs = max_requests or current_app.config.get('RATE_LIMIT_REQUESTS', 10)
            window = time_window or current_app.config.get('RATE_LIMIT_WINDOW', 60)
            
            client_ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
            now = time.time()
            
            # Clean old requests
            rate_limiter_storage[client_ip] = [
                req_time for req_time in rate_limiter_storage[client_ip]
                if now - req_time < window
            ]
            
            # Check if under limit
            if len(rate_limiter_storage[client_ip]) >= max_reqs:
                return jsonify({'error': 'Rate limit exceeded'}), 429
            
            # Add current request
            rate_limiter_storage[client_ip].append(now)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
