# backend/services/auth_service_fallback.py
# Fallback authentication service that works without database

import jwt
import bcrypt
import uuid
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

class FallbackAuthService:
    """Fallback JWT Authentication service with file-based storage"""
    
    def __init__(self, secret_key: str, storage_file: str = 'data/users.json'):
        self.secret_key = secret_key
        self.storage_file = storage_file
        
        # Ensure storage directory exists
        os.makedirs(os.path.dirname(storage_file), exist_ok=True)
        
        # Initialize storage file if it doesn't exist
        if not os.path.exists(storage_file):
            with open(storage_file, 'w') as f:
                json.dump({}, f)
    
    def _load_users(self) -> Dict:
        """Load users from file"""
        try:
            with open(self.storage_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    def _save_users(self, users: Dict):
        """Save users to file"""
        with open(self.storage_file, 'w') as f:
            json.dump(users, f, indent=2, default=str)
    
    def hash_password(self, password: str) -> str:
        """Hash password with bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def generate_token(self, user_id: str, email: str, expires_in_days: int = 7) -> str:
        """Generate JWT token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(days=expires_in_days),
            'iss': 'typetutor-backend'
        }
        return jwt.encode(payload, self.secret_key, algorithm='HS256')
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify and decode JWT token"""
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            
            if datetime.utcnow() > datetime.fromtimestamp(payload['exp']):
                return None
            
            return payload
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None
    
    def validate_email(self, email: str) -> bool:
        """Basic email validation"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_password(self, password: str) -> Dict:
        """Validate password strength"""
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def create_user(self, email: str, password: str, display_name: str = None) -> Dict:
        """Create new user in file storage"""
        try:
            # Validate email
            if not self.validate_email(email):
                return {'success': False, 'error': 'Invalid email format'}
            
            # Validate password
            password_validation = self.validate_password(password)
            if not password_validation['valid']:
                return {
                    'success': False,
                    'error': 'Password validation failed',
                    'details': password_validation['errors']
                }
            
            # Load existing users
            users = self._load_users()
            
            # Check if user already exists
            if email.lower() in users:
                return {'success': False, 'error': 'User with this email already exists'}
            
            # Create user
            user_id = str(uuid.uuid4())
            user_data = {
                'id': user_id,
                'email': email.lower(),
                'password_hash': self.hash_password(password),
                'display_name': display_name or email.split('@')[0],
                'is_active': True,
                'created_at': datetime.utcnow().isoformat(),
                'last_login': None
            }
            
            # Save user
            users[email.lower()] = user_data
            self._save_users(users)
            
            # Generate token
            token = self.generate_token(user_id, email.lower())
            
            return {
                'success': True,
                'user': {
                    'id': user_id,
                    'email': email.lower(),
                    'display_name': user_data['display_name']
                },
                'token': token,
                'message': 'User created successfully (local storage mode)'
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Internal error: {str(e)}'}
    
    def authenticate_user(self, email: str, password: str) -> Dict:
        """Authenticate user"""
        try:
            if not self.validate_email(email):
                return {'success': False, 'error': 'Invalid email format'}
            
            users = self._load_users()
            user = users.get(email.lower())
            
            if not user:
                return {'success': False, 'error': 'Invalid email or password'}
            
            if not self.verify_password(password, user['password_hash']):
                return {'success': False, 'error': 'Invalid email or password'}
            
            if not user.get('is_active', True):
                return {'success': False, 'error': 'Account is deactivated'}
            
            # Update last login
            user['last_login'] = datetime.utcnow().isoformat()
            users[email.lower()] = user
            self._save_users(users)
            
            # Generate token
            token = self.generate_token(user['id'], user['email'])
            
            return {
                'success': True,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'display_name': user.get('display_name', user['email'].split('@')[0])
                },
                'token': token,
                'message': 'Login successful'
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Internal error: {str(e)}'}
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        users = self._load_users()
        return users.get(email.lower())
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        users = self._load_users()
        for user in users.values():
            if user.get('id') == user_id:
                return user
        return None
    
    def get_user_profile(self, user_id: str) -> Dict:
        """Get user profile"""
        user = self.get_user_by_id(user_id)
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        profile = {
            'id': user['id'],
            'email': user['email'],
            'display_name': user.get('display_name'),
            'created_at': user.get('created_at'),
            'last_login': user.get('last_login'),
            'is_active': user.get('is_active', True)
        }
        
        return {'success': True, 'profile': profile}
    
    def refresh_token(self, token: str) -> Dict:
        """Refresh JWT token"""
        payload = self.verify_token(token)
        if not payload:
            return {'success': False, 'error': 'Invalid or expired token'}
        
        new_token = self.generate_token(payload['user_id'], payload['email'])
        return {'success': True, 'token': new_token, 'message': 'Token refreshed successfully'}

# Update the main auth service to include fallback
def get_auth_service_with_fallback():
    """Get auth service with automatic fallback to file storage"""
    from flask import current_app
    
    secret_key = current_app.config.get('SECRET_KEY', 'dev-secret-key')
    supabase_url = current_app.config.get('SUPABASE_URL')
    supabase_key = current_app.config.get('SUPABASE_ANON_KEY')
    
    # Try database first, fall back to file storage
    if supabase_url and supabase_key:
        try:
            from .auth_service import AuthService
            auth_service = AuthService(secret_key, supabase_url, supabase_key)
            
            # Test database connection
            test_result = auth_service.get_user_by_email('test@nonexistent.com')
            # If we get here without exception, database is working
            return auth_service
            
        except Exception as e:
            print(f"Database auth failed, using fallback: {e}")
    
    # Use fallback file storage
    print("Using fallback file-based authentication")
    return FallbackAuthService(secret_key)