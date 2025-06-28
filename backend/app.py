import os
import sys
from flask import Flask, jsonify, request, make_response
from datetime import datetime
from functools import wraps
import logging

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

app = Flask(__name__)
logger = logging.getLogger(__name__)

# Configuration
app.config.update({
    'SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
    'USE_DATABASE': os.environ.get('USE_DATABASE', 'true').lower() == 'true',
    'SUPABASE_URL': os.environ.get('SUPABASE_URL'),
    'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY'),
    'STATS_FILE': 'data/user_stats.json',
    'JWT_SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
    'JWT_ACCESS_TOKEN_EXPIRES_DAYS': 7,
    'MAX_CONTENT_LENGTH': 16 * 1024 * 1024  # 16MB
})

# CORS Configuration for Railway deployment
from flask_cors import CORS

# Railway-optimized CORS settings
ALLOWED_ORIGINS = [
    "https://typetutor.vercel.app",
    "https://typetutor-git-main-osegontes-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000"
]

# Configure CORS
CORS(app, 
     origins=ALLOWED_ORIGINS,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With", "Origin"],
     supports_credentials=False,
     send_wildcard=False,
     expose_headers=["Content-Type"]
)

def is_allowed_origin(origin):
    if not origin:
        return False
    if origin in ALLOWED_ORIGINS:
        return True
    if origin.startswith("https://") and origin.endswith(".vercel.app"):
        return True
    return False

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        origin = request.headers.get('Origin')
        if is_allowed_origin(origin):
            response = make_response()
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, X-Requested-With, Origin"
            response.headers["Access-Control-Max-Age"] = "86400"
            return response
        else:
            return make_response("Origin not allowed", 403)

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
    return response

# Create directories
os.makedirs('data', exist_ok=True)
os.makedirs('uploads', exist_ok=True)
os.makedirs('logs', exist_ok=True)

# ==================== EMBEDDED AUTH SERVICE ====================

import jwt
import bcrypt
import uuid
import re
import requests
from datetime import datetime, timedelta
from typing import Dict, Optional, Union

class AuthService:
    """Embedded authentication service"""
    
    def __init__(self, secret_key: str, supabase_url: str = None, supabase_key: str = None):
        self.secret_key = secret_key
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        
        if self.supabase_url and self.supabase_key:
            self.headers = {
                'apikey': self.supabase_key,
                'Authorization': f'Bearer {self.supabase_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
    
    def hash_password(self, password: str) -> str:
        try:
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed.decode('utf-8')
        except Exception as e:
            logger.error(f"Error hashing password: {e}")
            raise ValueError("Failed to hash password")
    
    def verify_password(self, password: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False
    
    def generate_token(self, user_id: str, email: str, expires_in_days: int = 7) -> str:
        try:
            payload = {
                'user_id': user_id,
                'email': email,
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(days=expires_in_days),
                'iss': 'typetutor-backend'
            }
            token = jwt.encode(payload, self.secret_key, algorithm='HS256')
            return token
        except Exception as e:
            logger.error(f"Error generating token: {e}")
            raise ValueError("Failed to generate token")
    
    def verify_token(self, token: str) -> Optional[Dict]:
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            
            if datetime.utcnow() > datetime.fromtimestamp(payload['exp']):
                return None
            
            return payload
            
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None
    
    def validate_email(self, email: str) -> bool:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_password(self, password: str) -> Dict[str, Union[bool, list]]:
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def create_user(self, email: str, password: str, display_name: str = None) -> Dict:
        try:
            if not self.validate_email(email):
                return {'success': False, 'error': 'Invalid email format'}
            
            password_validation = self.validate_password(password)
            if not password_validation['valid']:
                return {
                    'success': False, 
                    'error': 'Password validation failed',
                    'details': password_validation['errors']
                }
            
            existing_user = self.get_user_by_email(email)
            if existing_user:
                return {'success': False, 'error': 'User with this email already exists'}
            
            user_id = str(uuid.uuid4())
            password_hash = self.hash_password(password)
            
            user_data = {
                'id': user_id,
                'username': email.split('@')[0],
                'email': email.lower(),
                'display_name': display_name or email.split('@')[0],
                'password_hash': password_hash,
                'is_active': True,
                'is_anonymous': False,
                'preferences': {},
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
            }
            
            if not self.supabase_url or not self.supabase_key:
                return {
                    'success': False,
                    'error': 'Supabase not configured',
                    'details': ['SUPABASE_URL and SUPABASE_ANON_KEY must be set']
                }
            
            response = requests.post(
                f"{self.supabase_url}/rest/v1/users",
                headers=self.headers,
                json=user_data,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                result_data = response.json()
                if isinstance(result_data, list) and len(result_data) > 0:
                    user = result_data[0]
                else:
                    user = result_data
                
                token = self.generate_token(user['id'], user['email'])
                
                return {
                    'success': True,
                    'user': {
                        'id': user['id'],
                        'email': user['email'],
                        'display_name': user.get('display_name'),
                        'username': user.get('username')
                    },
                    'token': token,
                    'message': 'User created successfully'
                }
            else:
                try:
                    error_json = response.json()
                    error_message = error_json.get('message', response.text)
                except:
                    error_message = response.text
                
                return {
                    'success': False,
                    'error': 'Failed to create user in database',
                    'details': [error_message]
                }
                
        except Exception as e:
            logger.error(f"Error in create_user: {e}")
            return {'success': False, 'error': 'Internal error during user creation'}
    
    def authenticate_user(self, email: str, password: str) -> Dict:
        try:
            if not self.validate_email(email):
                return {'success': False, 'error': 'Invalid email format'}
            
            user = self.get_user_by_email(email.lower())
            if not user:
                return {'success': False, 'error': 'Invalid email or password'}
            
            if not user.get('password_hash'):
                return {'success': False, 'error': 'Account not properly configured'}
            
            if not self.verify_password(password, user['password_hash']):
                return {'success': False, 'error': 'Invalid email or password'}
            
            if not user.get('is_active', True):
                return {'success': False, 'error': 'Account is deactivated'}
            
            self.update_last_login(user['id'])
            
            token = self.generate_token(user['id'], user['email'])
            
            return {
                'success': True,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'display_name': user.get('display_name'),
                    'username': user.get('username')
                },
                'token': token,
                'message': 'Login successful'
            }
            
        except Exception as e:
            logger.error(f"Error in authenticate_user: {e}")
            return {'success': False, 'error': 'Internal error during authentication'}
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
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
        if not self.supabase_url or not self.supabase_key:
            return False
        
        try:
            update_data = {
                'last_login': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
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
    
    def get_user_profile(self, user_id: str) -> Dict:
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            profile = {
                'id': user['id'],
                'email': user['email'],
                'display_name': user.get('display_name'),
                'username': user.get('username'),
                'preferences': user.get('preferences', {}),
                'created_at': user.get('created_at'),
                'last_login': user.get('last_login'),
                'is_active': user.get('is_active', True)
            }
            
            return {'success': True, 'profile': profile}
            
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return {'success': False, 'error': 'Failed to get user profile'}

# Initialize auth service
def get_auth_service() -> AuthService:
    secret_key = app.config.get('SECRET_KEY', 'dev-secret-key')
    supabase_url = app.config.get('SUPABASE_URL')
    supabase_key = app.config.get('SUPABASE_ANON_KEY')
    return AuthService(secret_key, supabase_url, supabase_key)

# Auth decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            auth_service = get_auth_service()
            current_user = auth_service.verify_token(token)
            
            if current_user is None:
                return jsonify({'error': 'Token is invalid or expired'}), 401
            
            request.current_user = current_user
            
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return jsonify({'error': 'Token verification failed'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

# ==================== AUTH ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        display_name = data.get('display_name', '').strip()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        auth_service = get_auth_service()
        result = auth_service.create_user(email, password, display_name)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'user': result['user'],
                'token': result['token']
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

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
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

@app.route('/api/auth/profile', methods=['GET'])
@token_required
def get_profile():
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

@app.route('/api/auth/verify', methods=['POST'])
def verify_token():
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

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200

print("✅ Auth routes registered:")
print("   - POST /api/auth/register")
print("   - POST /api/auth/login")
print("   - GET /api/auth/profile")
print("   - POST /api/auth/verify")
print("   - POST /api/auth/logout")

# ==================== OTHER ROUTES ====================

# Health check endpoint
@app.route('/api/health')
def health():
    """Enhanced health check with Railway deployment info"""
    origin = request.headers.get('Origin', 'none')
    return jsonify({
        'status': 'healthy',
        'message': 'TypeTutor Backend API - Railway Production',
        'version': '3.4.0',
        'deployment': 'railway',
        'cors_enabled': True,
        'cors_debug': {
            'request_origin': origin,
            'origin_allowed': is_allowed_origin(origin),
            'allowed_origins': ALLOWED_ORIGINS[:3],
            'request_method': request.method,
            'cors_working': True
        },
        'environment': os.environ.get('FLASK_ENV', 'production'),
        'timestamp': datetime.now().isoformat(),
        'auth_available': True,  # Now always true since auth is embedded
        'database_configured': bool(app.config.get('SUPABASE_URL')),
        'endpoints': {
            'auth': {
                'register': '/api/auth/register',
                'login': '/api/auth/login',
                'profile': '/api/auth/profile',
                'verify': '/api/auth/verify',
                'logout': '/api/auth/logout'
            },
            'api': {
                'health': '/api/health',
                'stats': '/api/stats',
                'save_stats': '/api/save-stats',
                'process_text': '/api/process-text',
                'upload_pdf': '/api/upload-pdf'
            }
        }
    })

# Stats endpoints
@app.route('/api/stats')
def get_stats():
    """Get user statistics with robust error handling"""
    try:
        default_stats = {
            'averageWpm': 0,
            'accuracy': 0,
            'practiceMinutes': 0,
            'currentStreak': 0,
            'totalSessions': 0,
            'recentSessions': [],
            'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None},
            'source': 'default'
        }
        
        try:
            import json
            stats_file = app.config['STATS_FILE']
            if os.path.exists(stats_file):
                with open(stats_file, 'r') as f:
                    stored_stats = json.load(f)
                    default_stats.update(stored_stats)
                    default_stats['source'] = 'file'
        except Exception as e:
            print(f"⚠️ Error loading stats file: {e}")
        
        return jsonify(default_stats)
    except Exception as e:
        print(f"❌ Error in get_stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-stats', methods=['POST'])
def save_stats():
    """Save user statistics with enhanced validation"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['wmp', 'accuracy', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        duration = data.get('duration', 1)
        if duration <= 0 or not isinstance(duration, (int, float)) or duration != duration:
            duration = 1
        
        data['duration'] = max(int(duration), 1)
        wpm = max(0, int(data.get('wpm', 0)))
        accuracy = max(0, min(100, int(data.get('accuracy', 0))))
        
        try:
            import json
            stats_file = app.config['STATS_FILE']
            
            stats = {
                'recentSessions': [], 
                'totalSessions': 0, 
                'averageWpm': 0, 
                'accuracy': 0,
                'practiceMinutes': 0,
                'currentStreak': 0,
                'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None}
            }
            
            if os.path.exists(stats_file):
                with open(stats_file, 'r') as f:
                    stats = json.load(f)
            
            new_session = {
                'date': datetime.now().strftime('%Y-%m-%d'),
                'duration': f"{duration // 60}m {duration % 60}s",
                'wpm': wpm,
                'accuracy': accuracy,
                'mode': data.get('mode', 'Practice'),
                'timestamp': datetime.now().isoformat(),
                'raw_duration': duration
            }
            
            stats['recentSessions'].insert(0, new_session)
            stats['recentSessions'] = stats['recentSessions'][:10]
            stats['totalSessions'] = stats.get('totalSessions', 0) + 1
            stats['lastSessionDate'] = new_session['date']
            stats['practiceMinutes'] = stats.get('practiceMinutes', 0) + (duration / 60)
            
            sessions = stats['recentSessions']
            if sessions:
                stats['averageWpm'] = sum(s['wpm'] for s in sessions) // len(sessions)
                stats['accuracy'] = sum(s['accuracy'] for s in sessions) // len(sessions)
            
            if wpm > stats['personalBest']['wpm']:
                stats['personalBest'] = {
                    'wpm': wpm,
                    'accuracy': accuracy,
                    'date': new_session['date']
                }
            
            os.makedirs(os.path.dirname(stats_file), exist_ok=True)
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2)
            
        except Exception as e:
            print(f"⚠️ Error saving to file: {e}")
        
        return jsonify({
            'success': True,
            'message': 'Session saved successfully',
            'sessionId': f"session_{int(datetime.now().timestamp())}",
            'stats': {
                'wpm': wpm,
                'accuracy': accuracy,
                'duration': duration
            }
        })
        
    except Exception as e:
        print(f"❌ Error in save_stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-text', methods=['POST'])
def process_text():
    """Process custom text for typing practice"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text'].strip()
        
        if not text:
            return jsonify({'error': 'Empty text provided'}), 400
        
        if len(text) > 50000:
            return jsonify({'error': 'Text too long (max 50,000 characters)'}), 400
        
        return jsonify({
            'success': True,
            'message': 'Text processed successfully',
            'items': [{
                'id': 'custom-text',
                'content': text,
                'type': 'custom',
                'metadata': {
                    'length': len(text),
                    'words': len(text.split()),
                    'estimated_time': len(text) // 250,
                    'processed_at': datetime.now().isoformat()
                }
            }]
        })
        
    except Exception as e:
        print(f"❌ Error in process_text: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload and process PDF files"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided in request'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files are supported'}), 400
        
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > app.config['MAX_CONTENT_LENGTH']:
            return jsonify({'error': 'File too large (max 16MB)'}), 400
        
        try:
            import PyPDF2
            
            upload_path = os.path.join('uploads', file.filename)
            os.makedirs('uploads', exist_ok=True)
            file.save(upload_path)
            
            with open(upload_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                text_content = ""
                
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text_content += page_text + "\n"
                    except Exception as e:
                        print(f"Error extracting page {page_num + 1}: {e}")
            
            try:
                os.remove(upload_path)
            except:
                pass
            
            if not text_content.strip():
                return jsonify({'error': 'Could not extract text from PDF'}), 400
            
            return jsonify({
                'success': True,
                'message': f'Successfully processed PDF: {file.filename}',
                'items': [{
                    'id': f'pdf-{int(datetime.now().timestamp())}',
                    'content': text_content.strip(),
                    'type': 'pdf',
                    'metadata': {
                        'filename': file.filename,
                        'pages': len(pdf_reader.pages),
                        'length': len(text_content),
                        'processed_at': datetime.now().isoformat()
                    }
                }]
            })
            
        except ImportError:
            return jsonify({
                'success': False,
                'error': 'PDF processing library not available',
                'fallback': True
            }), 500
            
    except Exception as e:
        print(f"❌ Error in upload_pdf: {e}")
        return jsonify({'error': f'PDF processing failed: {str(e)}'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({'error': 'File too large (max 16MB)'}), 413

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Railway-optimized startup
if __name__ == '__main__':
    # Railway provides PORT environment variable
    port = int(os.environ.get('PORT', 5001))
    
    print("🚀 TypeTutor Backend API - Railway Production")
    print(f"   Port: {port}")
    print(f"   Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"   Host: 0.0.0.0 (Railway required)")
    print(f"   CORS: Enabled with explicit origins")
    print(f"   Auth endpoints: Embedded and available")
    print(f"   Database: {'Configured' if app.config.get('SUPABASE_URL') else 'Not configured'}")
    print(f"   Max file size: {app.config['MAX_CONTENT_LENGTH'] / (1024*1024)}MB")
    
    # CRITICAL: Must bind to 0.0.0.0 for Railway
    app.run(
        host='0.0.0.0',  # Essential for Railway deployment
        port=port,
        debug=False  # Production mode
    )