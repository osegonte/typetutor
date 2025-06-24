# backend/routes/auth_routes.py
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

def get_auth_service():
    """Import auth service to avoid circular imports"""
    from services.auth_service import get_auth_service
    return get_auth_service()

def token_required(f):
    """Decorator to require JWT token for protected routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Remove 'Bearer ' prefix
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            auth_service = get_auth_service()
            current_user = auth_service.verify_token(token)
            
            if current_user is None:
                return jsonify({'error': 'Token is invalid or expired'}), 401
            
            # Add user info to request context
            request.current_user = current_user
            
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return jsonify({'error': 'Token verification failed'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract and validate required fields
        email = data.get('email', '').strip()
        password = data.get('password', '')
        display_name = data.get('display_name', '').strip()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        # Create user
        auth_service = get_auth_service()
        result = auth_service.create_user(email, password, display_name)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'user': result['user'],
                'token': result['token'],
                'warning': result.get('warning')  # For fallback mode
            }), 201
        else:
            status_code = 409 if 'already exists' in result['error'] else 400
            return jsonify({
                'error': result['error'],
                'details': result.get('details', [])
            }), status_code
            
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract credentials
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Authenticate user
        auth_service = get_auth_service()
        result = auth_service.authenticate_user(email, password)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'user': result['user'],
                'token': result['token']
            }), 200
        else:
            return jsonify({'error': result['error']}), 401
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get user profile (protected route)"""
    try:
        user_id = request.current_user['user_id']
        
        auth_service = get_auth_service()
        result = auth_service.get_user_profile(user_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'profile': result['profile']
            }), 200
        else:
            return jsonify({'error': result['error']}), 404
            
    except Exception as e:
        logger.error(f"Profile fetch error: {e}")
        return jsonify({'error': 'Failed to fetch profile'}), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh JWT token"""
    try:
        data = request.get_json()
        
        if not data or 'token' not in data:
            return jsonify({'error': 'Token is required'}), 400
        
        token = data['token']
        
        auth_service = get_auth_service()
        result = auth_service.refresh_token(token)
        
        if result['success']:
            return jsonify({
                'success': True,
                'token': result['token'],
                'message': result['message']
            }), 200
        else:
            return jsonify({'error': result['error']}), 401
            
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500

@auth_bp.route('/verify', methods=['POST'])
def verify_token():
    """Verify if token is valid"""
    try:
        data = request.get_json()
        
        if not data or 'token' not in data:
            return jsonify({'error': 'Token is required'}), 400
        
        token = data['token']
        
        auth_service = get_auth_service()
        payload = auth_service.verify_token(token)
        
        if payload:
            return jsonify({
                'valid': True,
                'user_id': payload['user_id'],
                'email': payload['email'],
                'expires_at': payload['exp']
            }), 200
        else:
            return jsonify({'valid': False}), 401
            
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return jsonify({'error': 'Token verification failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    """User logout (invalidate token on client side)"""
    try:
        # Since JWT is stateless, we just return success
        # The client should remove the token from storage
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    """Change user password (protected route)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new passwords are required'}), 400
        
        user_id = request.current_user['user_id']
        auth_service = get_auth_service()
        
        # Get user to verify current password
        user = auth_service.get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify current password
        if not auth_service.verify_password(current_password, user['password_hash']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Validate new password
        password_validation = auth_service.validate_password(new_password)
        if not password_validation['valid']:
            return jsonify({
                'error': 'New password validation failed',
                'details': password_validation['errors']
            }), 400
        
        # Hash new password
        new_password_hash = auth_service.hash_password(new_password)
        
        # Update password in database
        if auth_service.supabase_url and auth_service.supabase_key:
            import requests
            
            update_data = {'password_hash': new_password_hash}
            
            response = requests.patch(
                f"{auth_service.supabase_url}/rest/v1/users?id=eq.{user_id}",
                headers=auth_service.headers,
                json=update_data,
                timeout=10
            )
            
            if response.status_code in [200, 204]:
                return jsonify({
                    'success': True,
                    'message': 'Password changed successfully'
                }), 200
            else:
                return jsonify({'error': 'Failed to update password'}), 500
        else:
            return jsonify({'error': 'Database not available'}), 503
            
    except Exception as e:
        logger.error(f"Password change error: {e}")
        return jsonify({'error': 'Failed to change password'}), 500

# Health check for auth system
@auth_bp.route('/health', methods=['GET'])
def auth_health():
    """Health check for authentication system"""
    try:
        auth_service = get_auth_service()
        
        # Test token generation and verification
        test_token = auth_service.generate_token('test-user', 'test@example.com')
        test_payload = auth_service.verify_token(test_token)
        
        health_data = {
            'status': 'healthy' if test_payload else 'unhealthy',
            'jwt_working': test_payload is not None,
            'database_available': bool(auth_service.supabase_url and auth_service.supabase_key),
            'password_hashing': True,  # bcrypt is always available
            'features': {
                'registration': True,
                'login': True,
                'token_refresh': True,
                'password_change': True,
                'profile_management': True
            }
        }
        
        status_code = 200 if health_data['status'] == 'healthy' else 503
        return jsonify(health_data), status_code
        
    except Exception as e:
        logger.error(f"Auth health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

# Error handlers specific to auth blueprint
@auth_bp.errorhandler(400)
def auth_bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': 'Invalid request data',
        'auth_error': True
    }), 400

@auth_bp.errorhandler(401)
def auth_unauthorized(error):
    return jsonify({
        'error': 'Unauthorized',
        'message': 'Authentication required or token invalid',
        'auth_error': True
    }), 401

@auth_bp.errorhandler(403)
def auth_forbidden(error):
    return jsonify({
        'error': 'Forbidden',
        'message': 'Access denied',
        'auth_error': True
    }), 403