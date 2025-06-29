#!/usr/bin/env python3
# backend/app.py - Complete TypeTutor Flask Application v3.4.0
import os
import sys
import json
import hashlib
import traceback
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv
import jwt
import bcrypt

# Load environment variables
load_dotenv()

# Add current directory to Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

print(f"🚀 TypeTutor Backend v3.4.0 starting...")
print(f"📁 Working directory: {current_dir}")
print(f"🌍 Environment: {os.environ.get('FLASK_ENV', 'development')}")

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 16777216))  # 16MB
    app.config['USE_DATABASE'] = os.environ.get('USE_DATABASE', 'false').lower() == 'true'
    
    # Environment detection
    is_production = os.environ.get('FLASK_ENV') == 'production'
    is_railway = bool(os.environ.get('RAILWAY_ENVIRONMENT'))
    
    print(f"🔧 Configuration:")
    print(f"   Production: {is_production}")
    print(f"   Railway: {is_railway}")
    print(f"   Database: {app.config['USE_DATABASE']}")
    print(f"   Max upload: {app.config['MAX_CONTENT_LENGTH']} bytes")
    
    # ===========================
    # ENHANCED CORS CONFIGURATION
    # ===========================
    
    # Define allowed origins based on environment
    if is_production:
        allowed_origins = [
            "https://*.vercel.app",
            "https://*.netlify.app", 
            "https://*.github.io",
            "https://typetutor.vercel.app",
            "https://typetutor-frontend.vercel.app",
            # Add your specific frontend domain here
        ]
        print(f"🔒 Production CORS: {allowed_origins}")
    else:
        allowed_origins = [
            "http://localhost:5173",    # Vite dev
            "http://localhost:4173",    # Vite preview
            "http://localhost:3000",    # Alternative dev
            "http://127.0.0.1:5173",
            "http://127.0.0.1:4173",
        ]
        print(f"🔓 Development CORS: {allowed_origins}")
    
    # Configure CORS with comprehensive settings
    CORS(app, 
         origins=allowed_origins + (["*"] if not is_production else []),
         allow_headers=[
             "Content-Type", 
             "Authorization", 
             "Accept",
             "Origin",
             "X-Requested-With",
             "Access-Control-Allow-Origin",
             "Access-Control-Allow-Headers",
             "Access-Control-Allow-Methods"
         ],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         supports_credentials=False,
         send_wildcard=not is_production,
         vary_header=True
    )
    
    # Global preflight handler
    @app.before_request
    def handle_preflight():
        """Handle CORS preflight requests globally"""
        if request.method == "OPTIONS":
            origin = request.headers.get('Origin', 'unknown')
            print(f"🔄 CORS Preflight from: {origin}")
            
            response = make_response()
            response.headers["Access-Control-Allow-Origin"] = "*" if not is_production else origin
            response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,Accept,Origin,X-Requested-With"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
            response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
            response.headers["Vary"] = "Origin"
            
            print(f"✅ CORS Preflight response sent to {origin}")
            return response
    
    # Global CORS headers for all responses
    @app.after_request
    def after_request(response):
        """Add CORS headers to all responses"""
        origin = request.headers.get('Origin')
        
        if origin:
            if not is_production or any(origin.endswith(allowed.replace('*', '')) for allowed in allowed_origins if '*' in allowed):
                response.headers["Access-Control-Allow-Origin"] = "*" if not is_production else origin
                response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,Accept,Origin,X-Requested-With"
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
                response.headers["Access-Control-Allow-Credentials"] = "false"
                response.headers["Vary"] = "Origin"
        
        return response
    
    # =====================
    # DATABASE CONFIGURATION
    # =====================
    
    database_client = None
    if app.config['USE_DATABASE']:
        try:
            from database.supabase_client import get_supabase, test_supabase_connection
            database_client = get_supabase()
            
            # Test connection
            test_result = test_supabase_connection()
            if test_result['success']:
                print("✅ Database connected successfully")
            else:
                print(f"⚠️ Database connection warning: {test_result['message']}")
        except ImportError:
            print("⚠️ Database modules not found - falling back to JSON storage")
            app.config['USE_DATABASE'] = False
        except Exception as e:
            print(f"⚠️ Database connection failed: {e}")
            app.config['USE_DATABASE'] = False
    
    # Fallback storage setup
    if not app.config['USE_DATABASE']:
        print("📁 Using JSON file storage")
        data_dir = os.path.join(current_dir, 'data')
        os.makedirs(data_dir, exist_ok=True)
        
        # Initialize stats file if it doesn't exist
        stats_file = os.path.join(data_dir, 'user_stats.json')
        if not os.path.exists(stats_file):
            default_stats = {
                "totalSessions": 0,
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "personalBest": {"wpm": 0, "accuracy": 0},
                "currentStreak": 0,
                "lastSessionDate": None,
                "recentSessions": []
            }
            with open(stats_file, 'w') as f:
                json.dump(default_stats, f, indent=2)
            print(f"📋 Created default stats file: {stats_file}")
    
    # =====================
    # UTILITY FUNCTIONS
    # =====================
    
    def get_file_hash(file_content: bytes) -> str:
        """Generate SHA-256 hash of file content"""
        return hashlib.sha256(file_content).hexdigest()
    
    def validate_session_data(data: Dict[str, Any]) -> tuple[bool, str]:
        """Validate typing session data"""
        required_fields = ['wpm', 'accuracy', 'duration']
        
        for field in required_fields:
            if field not in data:
                return False, f"Missing required field: {field}"
            
            try:
                value = float(data[field])
                if value < 0:
                    return False, f"Field {field} cannot be negative"
                if field == 'accuracy' and value > 100:
                    return False, "Accuracy cannot exceed 100%"
            except (ValueError, TypeError):
                return False, f"Field {field} must be a number"
        
        return True, "Valid"
    
    # =====================
    # CORE API ROUTES
    # =====================
    
    @app.route('/api/health', methods=['GET', 'OPTIONS'])
    @cross_origin()
    def health_check():
        """Enhanced health check with system information"""
        origin = request.headers.get('Origin', 'Direct')
        method = request.method
        
        health_data = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '3.4.0',
            'environment': 'production' if is_production else 'development',
            'database': 'connected' if app.config['USE_DATABASE'] else 'json_fallback',
            'uptime': 'running',
            'cors_debug': {
                'method': method,
                'origin': origin,
                'allowed_origins': allowed_origins,
                'is_preflight': method == 'OPTIONS',
                'headers_received': dict(request.headers),
                'railway_env': is_railway
            }
        }
        
        print(f"🏥 Health check: {origin} → {method}")
        return jsonify(health_data)
    
    @app.route('/api/db-health', methods=['GET', 'OPTIONS'])
    @cross_origin()
    def database_health():
        """Database-specific health check"""
        if not app.config['USE_DATABASE']:
            return jsonify({
                'status': 'json_mode',
                'database': 'file_storage',
                'message': 'Using JSON file storage',
                'timestamp': datetime.now().isoformat()
            })
        
        try:
            from database.supabase_client import test_supabase_connection
            result = test_supabase_connection()
            
            return jsonify({
                'status': 'healthy' if result['success'] else 'error',
                'database': 'supabase',
                'connection': result,
                'timestamp': datetime.now().isoformat()
            })
        except Exception as e:
            return jsonify({
                'status': 'error',
                'database': 'supabase',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }), 500
    
    # =====================
    # PDF UPLOAD & PROCESSING
    # =====================
    
    @app.route('/api/upload-pdf', methods=['POST', 'OPTIONS'])
    @cross_origin()
    def upload_pdf():
        """Handle PDF file uploads"""
        try:
            print(f"📤 PDF upload request from: {request.headers.get('Origin', 'unknown')}")
            
            if 'file' not in request.files:
                return jsonify({'success': False, 'error': 'No file provided'}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'No file selected'}), 400
            
            if not file.filename.lower().endswith('.pdf'):
                return jsonify({'success': False, 'error': 'File must be a PDF'}), 400
            
            # Read file content
            file_content = file.read()
            file_size = len(file_content)
            
            print(f"📋 File info: {file.filename} ({file_size} bytes)")
            
            if file_size == 0:
                return jsonify({'success': False, 'error': 'File is empty'}), 400
            
            if file_size > app.config['MAX_CONTENT_LENGTH']:
                return jsonify({'success': False, 'error': 'File too large (max 16MB)'}), 400
            
            # Try to extract text from PDF
            try:
                import PyPDF2
                import io
                
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                extracted_text = ""
                
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        text = page.extract_text()
                        if text.strip():
                            extracted_text += text + "\n\n"
                    except Exception as e:
                        print(f"⚠️ Error extracting page {page_num}: {e}")
                        continue
                
                if not extracted_text.strip():
                    return jsonify({
                        'success': False, 
                        'error': 'No text could be extracted from PDF'
                    }), 400
                
                # Process into study items
                items = []
                paragraphs = [p.strip() for p in extracted_text.split('\n\n') if p.strip()]
                
                for i, paragraph in enumerate(paragraphs[:10]):  # Limit to 10 items
                    if len(paragraph) > 50:  # Only include substantial paragraphs
                        items.append({
                            'id': f'pdf_item_{i+1}',
                            'type': 'paragraph',
                            'content': paragraph,
                            'length': len(paragraph),
                            'estimated_wpm_time': len(paragraph) // 5 / 40  # Estimate for 40 WPM
                        })
                
                if not items:
                    return jsonify({
                        'success': False,
                        'error': 'No suitable text content found for typing practice'
                    }), 400
                
                file_hash = get_file_hash(file_content)
                
                result = {
                    'success': True,
                    'filename': file.filename,
                    'file_size': file_size,
                    'file_hash': file_hash,
                    'pages_processed': len(pdf_reader.pages),
                    'items_extracted': len(items),
                    'items': items,
                    'total_characters': sum(len(item['content']) for item in items),
                    'processing_time': datetime.now().isoformat()
                }
                
                print(f"✅ PDF processed: {len(items)} items extracted")
                return jsonify(result)
                
            except ImportError:
                return jsonify({
                    'success': False,
                    'error': 'PDF processing not available - PyPDF2 not installed'
                }), 500
            except Exception as e:
                print(f"❌ PDF processing error: {e}")
                return jsonify({
                    'success': False,
                    'error': f'Error processing PDF: {str(e)}'
                }), 500
                
        except Exception as e:
            print(f"❌ Upload error: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'Upload failed: {str(e)}'
            }), 500
    
    @app.route('/api/process-text', methods=['POST', 'OPTIONS'])
    @cross_origin()
    def process_text():
        """Process custom text for typing practice"""
        try:
            data = request.get_json()
            if not data or 'text' not in data:
                return jsonify({'success': False, 'error': 'No text provided'}), 400
            
            text = data['text'].strip()
            if not text:
                return jsonify({'success': False, 'error': 'Text is empty'}), 400
            
            if len(text) < 10:
                return jsonify({'success': False, 'error': 'Text too short (minimum 10 characters)'}), 400
            
            # Split into manageable chunks/paragraphs
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            
            if not paragraphs:
                paragraphs = [text]  # Use the whole text if no paragraphs found
            
            items = []
            for i, paragraph in enumerate(paragraphs):
                if len(paragraph) > 20:  # Only include substantial content
                    items.append({
                        'id': f'text_item_{i+1}',
                        'type': 'paragraph',
                        'content': paragraph,
                        'length': len(paragraph),
                        'estimated_wpm_time': len(paragraph) // 5 / 40
                    })
            
            result = {
                'success': True,
                'items_created': len(items),
                'items': items,
                'total_characters': len(text),
                'processing_time': datetime.now().isoformat()
            }
            
            print(f"✅ Text processed: {len(items)} items created")
            return jsonify(result)
            
        except Exception as e:
            print(f"❌ Text processing error: {e}")
            return jsonify({
                'success': False,
                'error': f'Processing failed: {str(e)}'
            }), 500
    
    # =====================
    # STATISTICS MANAGEMENT
    # =====================
    
    @app.route('/api/stats', methods=['GET', 'OPTIONS'])
    @cross_origin()
    def get_user_stats():
        """Get user statistics"""
        try:
            if app.config['USE_DATABASE']:
                # Database implementation
                try:
                    # Get anonymous user stats
                    stats_result = database_client.table('user_statistics').select('*').eq('user_id', 'anonymous').execute()
                    
                    if stats_result.data:
                        stats = stats_result.data[0]
                        return jsonify({
                            'averageWpm': stats.get('average_wpm', 0),
                            'accuracy': stats.get('average_accuracy', 0),
                            'practiceMinutes': stats.get('total_practice_time_minutes', 0),
                            'currentStreak': stats.get('current_streak', 0),
                            'totalSessions': stats.get('total_sessions', 0),
                            'recentSessions': []  # Could implement this
                        })
                    else:
                        # Return default stats
                        return jsonify({
                            'averageWpm': 0,
                            'accuracy': 0,
                            'practiceMinutes': 0,
                            'currentStreak': 0,
                            'totalSessions': 0,
                            'recentSessions': []
                        })
                except Exception as e:
                    print(f"⚠️ Database stats error: {e}")
                    # Fall back to JSON
                    pass
            
            # JSON file implementation
            stats_file = os.path.join(current_dir, 'data', 'user_stats.json')
            
            if os.path.exists(stats_file):
                with open(stats_file, 'r') as f:
                    stats = json.load(f)
                return jsonify(stats)
            else:
                # Return default stats
                default_stats = {
                    "totalSessions": 0,
                    "averageWpm": 0,
                    "accuracy": 0,
                    "practiceMinutes": 0,
                    "personalBest": {"wpm": 0, "accuracy": 0},
                    "currentStreak": 0,
                    "lastSessionDate": None,
                    "recentSessions": []
                }
                return jsonify(default_stats)
                
        except Exception as e:
            print(f"❌ Stats retrieval error: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/save-stats', methods=['POST', 'OPTIONS'])
    @cross_origin()
    def save_user_stats():
        """Save typing session statistics"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            # Validate the session data
            is_valid, error_msg = validate_session_data(data)
            if not is_valid:
                return jsonify({'success': False, 'error': error_msg}), 400
            
            print(f"💾 Saving session: {data.get('wpm')}WPM, {data.get('accuracy')}%, {data.get('duration')}s")
            
            if app.config['USE_DATABASE']:
                # Database implementation
                try:
                    # Save to typing_sessions table
                    session_data = {
                        'user_id': 'anonymous',  # For now, using anonymous
                        'session_type': data.get('mode', 'practice'),
                        'content_type': data.get('itemType', 'custom').lower(),
                        'wpm': int(float(data['wpm'])),
                        'accuracy': int(float(data['accuracy'])),
                        'duration_seconds': float(data['duration']),
                        'characters_typed': data.get('totalCharacters', 0),
                        'errors_count': data.get('errors', 0),
                        'session_data': {
                            'timestamp': data.get('timestamp', datetime.now().isoformat()),
                            'completedAt': data.get('completedAt', datetime.now().isoformat())
                        }
                    }
                    
                    result = database_client.table('typing_sessions').insert(session_data).execute()
                    
                    if result.data:
                        print("✅ Session saved to database")
                        return jsonify({'success': True, 'message': 'Session saved to database'})
                    else:
                        raise Exception("Failed to save to database")
                        
                except Exception as e:
                    print(f"⚠️ Database save error: {e}, falling back to JSON")
                    # Fall back to JSON storage
                    pass
            
            # JSON file implementation
            stats_file = os.path.join(current_dir, 'data', 'user_stats.json')
            
            # Load existing stats
            if os.path.exists(stats_file):
                with open(stats_file, 'r') as f:
                    stats = json.load(f)
            else:
                stats = {
                    "totalSessions": 0,
                    "averageWpm": 0,
                    "accuracy": 0,
                    "practiceMinutes": 0,
                    "personalBest": {"wpm": 0, "accuracy": 0},
                    "currentStreak": 0,
                    "lastSessionDate": None,
                    "recentSessions": []
                }
            
            # Update stats
            wpm = int(float(data['wpm']))
            accuracy = int(float(data['accuracy']))
            duration_minutes = float(data['duration']) / 60
            
            stats['totalSessions'] += 1
            stats['practiceMinutes'] += duration_minutes
            
            # Update averages
            if stats['totalSessions'] > 0:
                stats['averageWpm'] = round(
                    (stats['averageWpm'] * (stats['totalSessions'] - 1) + wpm) / stats['totalSessions']
                )
                stats['accuracy'] = round(
                    (stats['accuracy'] * (stats['totalSessions'] - 1) + accuracy) / stats['totalSessions']
                )
            else:
                stats['averageWpm'] = wpm
                stats['accuracy'] = accuracy
            
            # Update personal bests
            if wpm > stats['personalBest']['wpm']:
                stats['personalBest']['wpm'] = wpm
            if accuracy > stats['personalBest']['accuracy']:
                stats['personalBest']['accuracy'] = accuracy
            
            # Add to recent sessions
            session_entry = {
                'wpm': wpm,
                'accuracy': accuracy,
                'duration': f"{int(duration_minutes)}:{int((duration_minutes % 1) * 60):02d}",
                'raw_duration': float(data['duration']),
                'date': datetime.now().strftime('%Y-%m-%d'),
                'timestamp': datetime.now().isoformat(),
                'mode': data.get('mode', 'practice')
            }
            
            stats['recentSessions'].insert(0, session_entry)
            stats['recentSessions'] = stats['recentSessions'][:10]  # Keep last 10
            
            # Update last session date
            stats['lastSessionDate'] = datetime.now().strftime('%Y-%m-%d')
            
            # Save updated stats
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2)
            
            print(f"✅ Session saved to JSON: {stats['totalSessions']} total sessions")
            return jsonify({'success': True, 'message': 'Session saved successfully'})
            
        except Exception as e:
            print(f"❌ Save stats error: {e}")
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/reset-stats', methods=['POST', 'OPTIONS'])
    @cross_origin()
    def reset_user_stats():
        """Reset all user statistics"""
        try:
            if app.config['USE_DATABASE']:
                # Database implementation
                try:
                    # Reset user statistics
                    database_client.table('user_statistics').delete().eq('user_id', 'anonymous').execute()
                    database_client.table('typing_sessions').delete().eq('user_id', 'anonymous').execute()
                    
                    print("✅ Database stats reset")
                    return jsonify({'success': True, 'message': 'Statistics reset successfully'})
                except Exception as e:
                    print(f"⚠️ Database reset error: {e}, falling back to JSON")
                    pass
            
            # JSON file implementation
            stats_file = os.path.join(current_dir, 'data', 'user_stats.json')
            
            default_stats = {
                "totalSessions": 0,
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "personalBest": {"wpm": 0, "accuracy": 0},
                "currentStreak": 0,
                "lastSessionDate": None,
                "recentSessions": []
            }
            
            with open(stats_file, 'w') as f:
                json.dump(default_stats, f, indent=2)
            
            print("✅ JSON stats reset")
            return jsonify({'success': True, 'message': 'Statistics reset successfully'})
            
        except Exception as e:
            print(f"❌ Reset stats error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # =====================
    # AUTHENTICATION ROUTES
    # =====================
    
    @app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
    @cross_origin()
    def register():
        """User registration"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            email = data.get('email', '').strip().lower()
            password = data.get('password', '')
            display_name = data.get('display_name', '').strip()
            
            # Validation
            if not email or '@' not in email:
                return jsonify({'success': False, 'error': 'Valid email required'}), 400
            
            if not password or len(password) < 8:
                return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400
            
            if app.config['USE_DATABASE']:
                # Database implementation
                try:
                    # Check if user exists
                    existing = database_client.table('users').select('*').eq('email', email).execute()
                    
                    if existing.data:
                        return jsonify({'success': False, 'error': 'Email already registered'}), 400
                    
                    # Hash password
                    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    
                    # Create user
                    user_data = {
                        'email': email,
                        'username': email.split('@')[0],
                        'display_name': display_name or email.split('@')[0],
                        'password_hash': password_hash,
                        'is_anonymous': False
                    }
                    
                    result = database_client.table('users').insert(user_data).execute()
                    
                    if result.data:
                        user = result.data[0]
                        
                        # Generate JWT token
                        token_payload = {
                            'user_id': user['id'],
                            'email': user['email'],
                            'exp': datetime.utcnow() + timedelta(days=30)
                        }
                        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')
                        
                        return jsonify({
                            'success': True,
                            'token': token,
                            'user': {
                                'id': user['id'],
                                'email': user['email'],
                                'display_name': user['display_name'],
                                'username': user['username']
                            }
                        })
                    else:
                        raise Exception("Failed to create user")
                        
                except Exception as e:
                    print(f"⚠️ Database registration error: {e}")
                    return jsonify({'success': False, 'error': 'Registration failed'}), 500
            else:
                # For JSON mode, just return success (no real user management)
                return jsonify({
                    'success': True,
                    'token': 'demo-token',
                    'user': {
                        'id': 'demo-user',
                        'email': email,
                        'display_name': display_name or email.split('@')[0],
                        'username': email.split('@')[0]
                    }
                })
                
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return jsonify({'success': False, 'error': 'Registration failed'}), 500
    
    @app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
    @cross_origin()
    def login():
        """User login"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            email = data.get('email', '').strip().lower()
            password = data.get('password', '')
            
            if not email or not password:
                return jsonify({'success': False, 'error': 'Email and password required'}), 400
            
            if app.config['USE_DATABASE']:
                # Database implementation
                try:
                    # Find user
                    user_result = database_client.table('users').select('*').eq('email', email).execute()
                    
                    if not user_result.data:
                        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
                    
                    user = user_result.data[0]
                    
                    # Check password
                    if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
                    
                    # Generate JWT token
                    token_payload = {
                        'user_id': user['id'],
                        'email': user['email'],
                        'exp': datetime.utcnow() + timedelta(days=30)
                    }
                    token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')
                    
                    return jsonify({
                        'success': True,
                        'token': token,
                        'user': {
                            'id': user['id'],
                            'email': user['email'],
                            'display_name': user['display_name'],
                            'username': user['username']
                        }
                    })
                    
                except Exception as e:
                    print(f"⚠️ Database login error: {e}")
                    return jsonify({'success': False, 'error': 'Login failed'}), 500
            else:
                # For JSON mode, just return success (no real user management)
                return jsonify({
                    'success': True,
                    'token': 'demo-token',
                    'user': {
                        'id': 'demo-user',
                        'email': email,
                        'display_name': email.split('@')[0],
                        'username': email.split('@')[0]
                    }
                })
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return jsonify({'success': False, 'error': 'Login failed'}), 500
    
    @app.route('/api/auth/logout', methods=['POST', 'OPTIONS'])
    @cross_origin()
    def logout():
        """User logout"""
        try:
            # For now, just return success (token invalidation would be handled client-side)
            return jsonify({'success': True, 'message': 'Logged out successfully'})
        except Exception as e:
            print(f"❌ Logout error: {e}")
            return jsonify({'success': False, 'error': 'Logout failed'}), 500
    
    @app.route('/api/auth/profile', methods=['GET', 'OPTIONS'])
    @cross_origin()
    def get_profile():
        """Get user profile"""
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'success': False, 'error': 'No valid token provided'}), 401
            
            token = auth_header.split(' ')[1]
            
            if app.config['USE_DATABASE']:
                try:
                    # Decode JWT token
                    payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                    user_id = payload['user_id']
                    
                    # Get user from database
                    user_result = database_client.table('users').select('*').eq('id', user_id).execute()
                    
                    if not user_result.data:
                        return jsonify({'success': False, 'error': 'User not found'}), 404
                    
                    user = user_result.data[0]
                    
                    return jsonify({
                        'success': True,
                        'user': {
                            'id': user['id'],
                            'email': user['email'],
                            'display_name': user['display_name'],
                            'username': user['username']
                        }
                    })
                    
                except jwt.ExpiredSignatureError:
                    return jsonify({'success': False, 'error': 'Token expired'}), 401
                except jwt.InvalidTokenError:
                    return jsonify({'success': False, 'error': 'Invalid token'}), 401
                except Exception as e:
                    print(f"⚠️ Profile error: {e}")
                    return jsonify({'success': False, 'error': 'Failed to get profile'}), 500
            else:
                # For JSON mode, return demo user
                return jsonify({
                    'success': True,
                    'user': {
                        'id': 'demo-user',
                        'email': 'demo@example.com',
                        'display_name': 'Demo User',
                        'username': 'demo'
                    }
                })
                
        except Exception as e:
            print(f"❌ Profile error: {e}")
            return jsonify({'success': False, 'error': 'Failed to get profile'}), 500
    
    # =====================
    # DATABASE-SPECIFIC ROUTES
    # =====================
    
    @app.route('/api/db-stats', methods=['GET', 'OPTIONS'])
    @cross_origin()
    def get_database_stats():
        """Get statistics from database"""
        if not app.config['USE_DATABASE']:
            return jsonify({
                'error': 'Database not enabled',
                'mode': 'json_storage'
            }), 400
        
        try:
            # Get user statistics
            stats_result = database_client.table('user_statistics').select('*').limit(1).execute()
            sessions_result = database_client.table('typing_sessions').select('*').order('created_at', desc=True).limit(10).execute()
            
            return jsonify({
                'success': True,
                'stats': stats_result.data,
                'recent_sessions': sessions_result.data,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Database stats error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/db-save-stats', methods=['POST', 'OPTIONS'])
    @cross_origin()
    def save_database_stats():
        """Save statistics to database"""
        if not app.config['USE_DATABASE']:
            return jsonify({
                'error': 'Database not enabled',
                'mode': 'json_storage'
            }), 400
        
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            # Validate session data
            is_valid, error_msg = validate_session_data(data)
            if not is_valid:
                return jsonify({'success': False, 'error': error_msg}), 400
            
            # Save session to database
            session_data = {
                'user_id': data.get('userId', 'anonymous'),
                'session_type': 'practice',
                'content_type': 'custom',
                'wpm': int(float(data['wpm'])),
                'accuracy': int(float(data['accuracy'])),
                'duration_seconds': float(data['duration']),
                'characters_typed': data.get('characters', 0),
                'errors_count': data.get('errors', 0),
                'session_data': {
                    'timestamp': datetime.now().isoformat(),
                    'source': 'api_direct'
                }
            }
            
            result = database_client.table('typing_sessions').insert(session_data).execute()
            
            if result.data:
                return jsonify({
                    'success': True,
                    'session_id': result.data[0]['id'],
                    'message': 'Session saved to database'
                })
            else:
                return jsonify({'success': False, 'error': 'Failed to save session'}), 500
                
        except Exception as e:
            print(f"❌ Database save error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # =====================
    # ERROR HANDLERS
    # =====================
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors with CORS"""
        response = jsonify({
            'error': 'Endpoint not found',
            'status': 404,
            'available_endpoints': [
                '/api/health',
                '/api/db-health',
                '/api/upload-pdf',
                '/api/process-text',
                '/api/stats',
                '/api/save-stats',
                '/api/reset-stats',
                '/api/auth/register',
                '/api/auth/login',
                '/api/auth/logout',
                '/api/auth/profile'
            ]
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        return response, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors with CORS"""
        response = jsonify({
            'error': 'Internal server error',
            'status': 500,
            'message': 'Something went wrong on the server'
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        return response, 500
    
    @app.errorhandler(413)
    def file_too_large(error):
        """Handle file size errors"""
        response = jsonify({
            'error': 'File too large',
            'status': 413,
            'max_size': f"{app.config['MAX_CONTENT_LENGTH']} bytes"
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 413
    
    # =====================
    # DEVELOPMENT ROUTES
    # =====================
    
    if not is_production:
        @app.route('/api/debug', methods=['GET', 'OPTIONS'])
        @cross_origin()
        def debug_info():
            """Debug information for development"""
            return jsonify({
                'environment': 'development',
                'config': {
                    'USE_DATABASE': app.config['USE_DATABASE'],
                    'MAX_CONTENT_LENGTH': app.config['MAX_CONTENT_LENGTH'],
                    'SECRET_KEY_SET': bool(app.config['SECRET_KEY'])
                },
                'environment_vars': {
                    'FLASK_ENV': os.environ.get('FLASK_ENV'),
                    'SUPABASE_URL_SET': bool(os.environ.get('SUPABASE_URL')),
                    'SUPABASE_ANON_KEY_SET': bool(os.environ.get('SUPABASE_ANON_KEY')),
                    'RAILWAY_ENVIRONMENT': bool(os.environ.get('RAILWAY_ENVIRONMENT'))
                },
                'cors_origins': allowed_origins,
                'timestamp': datetime.now().isoformat()
            })
    
    return app

# =====================
# APPLICATION ENTRY POINT
# =====================

# Create the Flask app
app = create_app()

if __name__ == '__main__':
    # Get configuration from environment
    port = int(os.environ.get('PORT', 5001))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    print(f"\n🚀 TypeTutor Backend Starting")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🔧 Debug: {debug}")
    print(f"🌍 Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print(f"🗄️  Database: {'Enabled' if app.config['USE_DATABASE'] else 'JSON Fallback'}")
    print(f"🚂 Railway: {'Yes' if os.environ.get('RAILWAY_ENVIRONMENT') else 'No'}")
    
    print(f"\n📡 Available endpoints:")
    print(f"   • Health: http://{host}:{port}/api/health")
    print(f"   • Database: http://{host}:{port}/api/db-health")
    print(f"   • Upload: http://{host}:{port}/api/upload-pdf")
    print(f"   • Stats: http://{host}:{port}/api/stats")
    print(f"   • Auth: http://{host}:{port}/api/auth/register")
    
    if not app.config.get('USE_DATABASE'):
        print(f"\n⚠️  Running in JSON storage mode")
        print(f"   To enable database: set USE_DATABASE=true")
    
    print(f"\n🎯 CORS configured for:")
    for origin in app.config.get('CORS_ORIGINS', ['*']):
        print(f"   • {origin}")
    
    print(f"\n" + "="*50)
    print(f"🌟 TypeTutor Backend Ready! 🌟")
    print(f"="*50 + "\n")
    
    try:
        app.run(
            host=host,
            port=port,
            debug=debug,
            use_reloader=False,  # Disable reloader for production
            threaded=True
        )
    except KeyboardInterrupt:
        print(f"\n👋 TypeTutor Backend shutting down...")
    except Exception as e:
        print(f"\n❌ Failed to start server: {e}")
        traceback.print_exc()