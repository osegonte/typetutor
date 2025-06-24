# backend/services/auth_service.py
import jwt
import bcrypt
import uuid
import re
import requests
from datetime import datetime, timedelta
from typing import Dict, Optional, Union
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class AuthService:
    """JWT Authentication service with Supabase integration"""
    
    def __init__(self, secret_key: str, supabase_url: str = None, supabase_key: str = None):
        self.secret_key = secret_key
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        
        # Set up headers for Supabase REST API calls
        if self.supabase_url and self.supabase_key:
            self.headers = {
                'apikey': self.supabase_key,
                'Authorization': f'Bearer {self.supabase_key}',
                'Content-Type': 'application/json'
            }
    
    def hash_password(self, password: str) -> str:
        """Hash password with bcrypt"""
        try:
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed.decode('utf-8')
        except Exception as e:
            logger.error(f"Error hashing password: {e}")
            raise ValueError("Failed to hash password")
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False
    
    def generate_token(self, user_id: str, email: str, expires_in_days: int = 7) -> str:
        """Generate JWT token"""
        try:
            payload = {
                'user_id': user_id,
                'email': email,
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(days=expires_in_days),
                'iss': 'typetutor-backend'  # Issuer
            }
            token = jwt.encode(payload, self.secret_key, algorithm='HS256')
            return token
        except Exception as e:
            logger.error(f"Error generating token: {e}")
            raise ValueError("Failed to generate token")
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify and decode JWT token"""
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            
            # Check if token is not expired (additional check)
            if datetime.utcnow() > datetime.fromtimestamp(payload['exp']):
                logger.warning("Token has expired")
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_password(self, password: str) -> Dict[str, Union[bool, list]]:
        """Validate password strength"""
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def create_user(self, email: str, password: str, display_name: str = None) -> Dict:
        """Create new user in Supabase"""
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
            
            # Check if user already exists
            existing_user = self.get_user_by_email(email)
            if existing_user:
                return {'success': False, 'error': 'User with this email already exists'}
            
            # Hash password
            password_hash = self.hash_password(password)
            
            # Create user data
            user_data = {
                'id': str(uuid.uuid4()),
                'email': email.lower(),
                'password_hash': password_hash,
                'display_name': display_name or email.split('@')[0],
                'is_active': True,
                'created_at': datetime.utcnow().isoformat(),
                'last_login': None
            }
            
            # Save to Supabase if available
            if self.supabase_url and self.supabase_key:
                try:
                    response = requests.post(
                        f"{self.supabase_url}/rest/v1/users",
                        headers=self.headers,
                        json=user_data,
                        timeout=10
                    )
                    
                    if response.status_code in [200, 201]:
                        result = response.json()
                        user = result[0] if isinstance(result, list) else result
                        
                        # Generate token
                        token = self.generate_token(user['id'], user['email'])
                        
                        return {
                            'success': True,
                            'user': {
                                'id': user['id'],
                                'email': user['email'],
                                'display_name': user['display_name']
                            },
                            'token': token,
                            'message': 'User created successfully'
                        }
                    else:
                        logger.error(f"Supabase user creation failed: {response.status_code} - {response.text}")
                        return {'success': False, 'error': 'Failed to create user in database'}
                        
                except Exception as e:
                    logger.error(f"Error creating user in Supabase: {e}")
                    return {'success': False, 'error': 'Database error during user creation'}
            
            # Fallback: return success without database storage
            return {
                'success': True,
                'user': {
                    'id': user_data['id'],
                    'email': user_data['email'],
                    'display_name': user_data['display_name']
                },
                'token': self.generate_token(user_data['id'], user_data['email']),
                'message': 'User created successfully (local mode)',
                'warning': 'Database not available - user not persisted'
            }
            
        except Exception as e:
            logger.error(f"Error in create_user: {e}")
            return {'success': False, 'error': 'Internal error during user creation'}
    
    def authenticate_user(self, email: str, password: str) -> Dict:
        """Authenticate user and return token"""
        try:
            # Validate email format
            if not self.validate_email(email):
                return {'success': False, 'error': 'Invalid email format'}
            
            # Get user from database
            user = self.get_user_by_email(email.lower())
            if not user:
                return {'success': False, 'error': 'Invalid email or password'}
            
            # Verify password
            if not self.verify_password(password, user['password_hash']):
                return {'success': False, 'error': 'Invalid email or password'}
            
            # Check if user is active
            if not user.get('is_active', True):
                return {'success': False, 'error': 'Account is deactivated'}
            
            # Update last login
            self.update_last_login(user['id'])
            
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
            logger.error(f"Error in authenticate_user: {e}")
            return {'success': False, 'error': 'Internal error during authentication'}
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email from Supabase"""
        if not self.supabase_url or not self.supabase_key:
            return None
        
        try:
            response = requests.get(
                f"{self.supabase_url}/rest/v1/users?email=eq.{email.lower()}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return data[0] if data else None
            else:
                logger.error(f"Error fetching user: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID from Supabase"""
        if not self.supabase_url or not self.supabase_key:
            return None
        
        try:
            response = requests.get(
                f"{self.supabase_url}/rest/v1/users?id=eq.{user_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return data[0] if data else None
            else:
                logger.error(f"Error fetching user by ID: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    def update_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp"""
        if not self.supabase_url or not self.supabase_key:
            return False
        
        try:
            update_data = {'last_login': datetime.utcnow().isoformat()}
            
            response = requests.patch(
                f"{self.supabase_url}/rest/v1/users?id=eq.{user_id}",
                headers=self.headers,
                json=update_data,
                timeout=10
            )
            
            return response.status_code in [200, 204]
            
        except Exception as e:
            logger.error(f"Error updating last login: {e}")
            return False
    
    def refresh_token(self, token: str) -> Dict:
        """Refresh JWT token"""
        try:
            payload = self.verify_token(token)
            if not payload:
                return {'success': False, 'error': 'Invalid or expired token'}
            
            # Generate new token
            new_token = self.generate_token(payload['user_id'], payload['email'])
            
            return {
                'success': True,
                'token': new_token,
                'message': 'Token refreshed successfully'
            }
            
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return {'success': False, 'error': 'Failed to refresh token'}
    
    def get_user_profile(self, user_id: str) -> Dict:
        """Get user profile information"""
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            # Return safe user information (no password hash)
            profile = {
                'id': user['id'],
                'email': user['email'],
                'display_name': user.get('display_name'),
                'created_at': user.get('created_at'),
                'last_login': user.get('last_login'),
                'is_active': user.get('is_active', True)
            }
            
            return {'success': True, 'profile': profile}
            
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return {'success': False, 'error': 'Failed to get user profile'}

# Global service instance
_auth_service = None

def get_auth_service() -> AuthService:
    """Get authentication service instance"""
    global _auth_service
    if _auth_service is None:
        secret_key = current_app.config.get('SECRET_KEY', 'dev-secret-key')
        supabase_url = current_app.config.get('SUPABASE_URL')
        supabase_key = current_app.config.get('SUPABASE_ANON_KEY')
        
        _auth_service = AuthService(secret_key, supabase_url, supabase_key)
    
    return _auth_service