import os
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS

# Fix Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend')
sys.path.insert(0, current_dir)
sys.path.insert(0, backend_dir)

app = Flask(__name__)

# Configuration
app.config.update({
    'SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
    'USE_DATABASE': os.environ.get('USE_DATABASE', 'true').lower() == 'true',
    'SUPABASE_URL': os.environ.get('SUPABASE_URL'),
    'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY'),
    'STATS_FILE': 'data/user_stats.json',
    'JWT_SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
    'JWT_ACCESS_TOKEN_EXPIRES_DAYS': 7
})

# CORS - Allow all origins for development, restrict in production
cors_origins = [
    'http://localhost:5173',  # Vite dev server
    'http://localhost:3000',  # React dev server
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
]

# Add production origins if in production
if os.environ.get('FLASK_ENV') == 'production':
    cors_origins.extend([
        'https://*.vercel.app',
        'https://*.netlify.app',
        'https://*.railway.app'
    ])

CORS(app, origins=cors_origins, supports_credentials=True)

# Create directories
os.makedirs('data', exist_ok=True)
os.makedirs('uploads', exist_ok=True)
os.makedirs('logs', exist_ok=True)

# Import and register authentication routes
try:
    from backend.routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    print("✅ Authentication routes registered")
except ImportError as e:
    print(f"⚠️  Authentication routes not available: {e}")

# Import token_required decorator
try:
    from backend.routes.auth_routes import token_required
    AUTH_AVAILABLE = True
except ImportError:
    print("⚠️  JWT authentication not available - using fallback mode")
    AUTH_AVAILABLE = False
    
    # Fallback decorator that does nothing
    def token_required(f):
        return f

# Helper function to get user ID from request
def get_user_id_from_request():
    """Get user ID from JWT token or X-User-ID header (fallback)"""
    if AUTH_AVAILABLE and hasattr(request, 'current_user'):
        return request.current_user['user_id']
    else:
        # Fallback to X-User-ID header for backward compatibility
        return request.headers.get('X-User-ID', 'anonymous')

@app.route('/api/health')
def health():
    """Enhanced health check with authentication status"""
    database_status = False
    auth_status = False
    
    # Check database
    if app.config.get('USE_DATABASE'):
        try:
            from services.simple_database_service import get_simple_supabase_service
            service = get_simple_supabase_service()
            database_status = True
        except Exception as e:
            print(f"Database service error: {e}")
    
    # Check authentication
    if AUTH_AVAILABLE:
        try:
            from backend.services.auth_service import get_auth_service
            auth_service = get_auth_service()
            # Test token generation
            test_token = auth_service.generate_token('test', 'test@example.com')
            auth_status = auth_service.verify_token(test_token) is not None
        except Exception as e:
            print(f"Auth service error: {e}")
    
    return jsonify({
        'status': 'healthy',
        'message': 'TypeTutor Enhanced Backend with Authentication',
        'version': '2.1.0',
        'database_mode': app.config.get('USE_DATABASE', False),
        'database_connected': database_status,
        'authentication_enabled': AUTH_AVAILABLE,
        'authentication_working': auth_status,
        'features': {
            'supabase_integration': database_status,
            'jwt_authentication': auth_status,
            'user_registration': AUTH_AVAILABLE,
            'user_login': AUTH_AVAILABLE,
            'protected_routes': AUTH_AVAILABLE,
            '21_achievements': database_status,
            'legacy_compatibility': True,
            'pdf_processing': True
        },
        'endpoints': {
            'auth': {
                'register': '/api/auth/register',
                'login': '/api/auth/login',
                'profile': '/api/auth/profile',
                'refresh': '/api/auth/refresh',
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

@app.route('/api/stats')
def get_stats():
    """Get user statistics - now supports both authenticated and anonymous users"""
    try:
        user_id = get_user_id_from_request()
        
        if app.config.get('USE_DATABASE'):
            try:
                from services.simple_database_service import get_simple_supabase_service
                import asyncio
                
                service = get_simple_supabase_service()
                
                # Run async function
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    stats = loop.run_until_complete(service.get_user_statistics(user_id))
                    stats['source'] = 'supabase'
                    stats['user_id'] = user_id
                    stats['authenticated'] = AUTH_AVAILABLE and hasattr(request, 'current_user')
                    return jsonify(stats)
                finally:
                    loop.close()
            except Exception as e:
                print(f"Database error: {e}")
        
        # Fallback to file storage
        try:
            from services.stats_service import StatsService
            stats_service = StatsService(app.config['STATS_FILE'])
            stats = stats_service.get_stats()
            stats['source'] = 'file'
            stats['user_id'] = user_id
            stats['authenticated'] = AUTH_AVAILABLE and hasattr(request, 'current_user')
            return jsonify(stats)
        except ImportError:
            # Return default stats
            return jsonify({
                'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None},
                'source': 'default',
                'user_id': user_id,
                'authenticated': False
            })
    except Exception as e:
        print(f"Error in get_stats: {e}")
        return jsonify({
            'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
            'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
            'error': str(e)
        })

@app.route('/api/save-stats', methods=['POST'])
def save_stats():
    """Save statistics - now supports both authenticated and anonymous users"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_id = get_user_id_from_request()
        
        if app.config.get('USE_DATABASE'):
            try:
                from services.simple_database_service import get_simple_supabase_service
                import asyncio
                
                service = get_simple_supabase_service()
                
                session_data = {
                    'user_id': user_id,
                    'wpm': data['wpm'],
                    'accuracy': data['accuracy'],
                    'duration_seconds': int(float(data['duration'])),
                    'characters_typed': data.get('totalCharacters', 0),
                    'errors_count': data.get('errorsCount', 0),
                    'session_type': data.get('itemType', 'practice'),
                    'content_source': 'custom'
                }
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(service.save_typing_session(session_data))
                    result['source'] = 'supabase'
                    result['user_id'] = user_id
                    result['authenticated'] = AUTH_AVAILABLE and hasattr(request, 'current_user')
                    return jsonify(result)
                finally:
                    loop.close()
            except Exception as e:
                print(f"Database save error: {e}")
        
        # Fallback to file storage
        try:
            from services.stats_service import StatsService
            stats_service = StatsService(app.config['STATS_FILE'])
            result = stats_service.save_session(data)
            result['source'] = 'file'
            result['user_id'] = user_id
            result['authenticated'] = AUTH_AVAILABLE and hasattr(request, 'current_user')
            return jsonify(result)
        except ImportError:
            return jsonify({'error': 'No stats service available'}), 500
            
    except Exception as e:
        print(f"Save error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-text', methods=['POST'])
def process_text():
    """Process custom text for typing practice"""
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text'].strip()
    if not text:
        return jsonify({'error': 'Empty text provided'}), 400
    
    # Create study item
    items = [{
        'id': 'custom-text-1',
        'prompt': 'Type this custom text:',
        'content': text,
        'type': 'text',
        'context': 'Custom Text',
        'word_count': len(text.split()),
        'estimated_time': max(30, len(text.split()) / 40 * 60)
    }]
    
    return jsonify({
        'success': True,
        'items': items,
        'item_count': len(items)
    })

@app.route('/api/pdf-support')
def pdf_support():
    """Get PDF support information"""
    try:
        import pypdf
        return jsonify({
            'pdf_support': True,
            'pypdf_available': True,
            'message': f'PDF processing available using pypdf',
            'supported_formats': ['pdf'],
            'max_file_size': '16MB',
            'version': getattr(pypdf, '__version__', 'unknown')
        })
    except ImportError:
        return jsonify({
            'pdf_support': False,
            'pypdf_available': False,
            'message': 'PDF processing not available - pypdf not installed',
            'supported_formats': [],
            'max_file_size': '0MB'
        })

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    """Handle PDF upload and processing"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided',
                'message': 'Please select a PDF file to upload'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected',
                'message': 'Please select a PDF file to upload'
            }), 400
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({
                'success': False,
                'error': 'Invalid file type',
                'message': 'Only PDF files are supported'
            }), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > 16 * 1024 * 1024:  # 16MB
            return jsonify({
                'success': False,
                'error': 'File too large',
                'message': 'File size exceeds 16MB limit'
            }), 400
        
        # Try to process the PDF
        try:
            import pypdf
            import tempfile
            import uuid
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                file.save(temp_file.name)
                temp_path = temp_file.name
            
            # Process PDF
            try:
                reader = pypdf.PdfReader(temp_path)
                text_content = ""
                
                for page_num, page in enumerate(reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text and page_text.strip():
                            text_content += f"\n\n--- Page {page_num + 1} ---\n{page_text.strip()}"
                    except Exception as e:
                        print(f"Error extracting page {page_num + 1}: {e}")
                        continue
                
                # Clean up temp file
                os.unlink(temp_path)
                
                if not text_content.strip():
                    return jsonify({
                        'success': False,
                        'error': 'No text found',
                        'message': 'Could not extract text from this PDF. It may be image-based or password protected.'
                    }), 400
                
                # Create study items from extracted text
                paragraphs = [p.strip() for p in text_content.split('\n\n') if p.strip() and len(p.strip()) > 20]
                
                items = []
                for i, paragraph in enumerate(paragraphs[:10]):  # Limit to 10 items
                    if len(paragraph) > 1000:  # If too long, truncate
                        paragraph = paragraph[:997] + "..."
                    
                    items.append({
                        'id': f'pdf-item-{i+1}',
                        'prompt': f'Type this text from the PDF (section {i+1}):',
                        'content': paragraph,
                        'type': 'text',
                        'context': f'PDF Content - Page {i+1}',
                        'word_count': len(paragraph.split()),
                        'estimated_time': max(30, len(paragraph.split()) / 40 * 60)
                    })
                
                if not items:
                    return jsonify({
                        'success': False,
                        'error': 'No usable content',
                        'message': 'Could not create practice items from this PDF content.'
                    }), 400
                
                return jsonify({
                    'success': True,
                    'items': items,
                    'item_count': len(items),
                    'message': f'Successfully processed PDF with {len(items)} practice sections',
                    'file_info': {
                        'name': file.filename,
                        'size': file_size,
                        'pages': len(reader.pages)
                    }
                })
                
            except Exception as e:
                # Clean up temp file on error
                try:
                    os.unlink(temp_path)
                except:
                    pass
                
                return jsonify({
                    'success': False,
                    'error': 'PDF processing failed',
                    'message': f'Error processing PDF: {str(e)}'
                }), 500
                
        except ImportError:
            return jsonify({
                'success': False,
                'error': 'PDF support not available',
                'message': 'PDF processing library not installed'
            }), 503
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Upload failed',
            'message': f'Error uploading file: {str(e)}'
        }), 500

# Protected route example - requires authentication
@app.route('/api/protected-stats')
@token_required
def protected_stats():
    """Example of a protected route that requires authentication"""
    if not AUTH_AVAILABLE:
        return jsonify({'error': 'Authentication not available'}), 503
    
    user_id = request.current_user['user_id']
    email = request.current_user['email']
    
    return jsonify({
        'message': 'This is a protected route',
        'user_id': user_id,
        'email': email,
        'stats': 'User-specific stats would go here'
    })

# Reset stats endpoint
@app.route('/api/reset-stats', methods=['POST'])
def reset_stats():
    """Reset user statistics"""
    user_id = get_user_id_from_request()
    
    try:
        from services.stats_service import StatsService
        stats_service = StatsService(app.config['STATS_FILE'])
        stats = stats_service.reset_stats()
        
        return jsonify({
            'success': True,
            'message': 'Statistics reset successfully',
            'stats': stats,
            'user_id': user_id,
            'authenticated': AUTH_AVAILABLE and hasattr(request, 'current_user')
        })
    except ImportError:
        return jsonify({'error': 'Stats service not available'}), 503

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    
    print("🚀 TypeTutor Enhanced Backend with Authentication")
    print(f"   Port: {port}")
    print(f"   Database: {app.config.get('USE_DATABASE')}")
    print(f"   Authentication: {AUTH_AVAILABLE}")
    
    # Test services
    if app.config.get('USE_DATABASE'):
        try:
            from services.simple_database_service import get_simple_supabase_service
            service = get_simple_supabase_service()
            print("   ✅ Supabase service connected (REST API)")
        except Exception as e:
            print(f"   ⚠️  Supabase service failed: {e}")
    
    if AUTH_AVAILABLE:
        try:
            from backend.services.auth_service import get_auth_service
            auth_service = get_auth_service()
            test_token = auth_service.generate_token('test', 'test@example.com')
            if auth_service.verify_token(test_token):
                print("   ✅ JWT authentication working")
            else:
                print("   ⚠️  JWT authentication test failed")
        except Exception as e:
            print(f"   ⚠️  JWT authentication error: {e}")
    
    try:
        from services.stats_service import StatsService
        print("   ✅ Legacy stats service available")
    except ImportError:
        print("   ⚠️  Legacy stats service not available")
    
    print("   🔐 Authentication endpoints:")
    if AUTH_AVAILABLE:
        print("      POST /api/auth/register   - User registration")
        print("      POST /api/auth/login      - User login")
        print("      GET  /api/auth/profile    - Get user profile (protected)")
        print("      POST /api/auth/refresh    - Refresh token")
        print("      POST /api/auth/logout     - User logout")
        print("      GET  /api/auth/health     - Auth system health")
    
    print("   📊 API endpoints:")
    print("      GET  /api/health           - System health")
    print("      GET  /api/stats            - Get statistics (supports auth)")
    print("      POST /api/save-stats       - Save statistics (supports auth)")
    print("      GET  /api/protected-stats  - Protected stats (requires auth)")
    print("      POST /api/process-text     - Process custom text")
    print("      POST /api/upload-pdf       - Upload and process PDF")
    print("      GET  /api/pdf-support      - PDF support info")
    print("      POST /api/reset-stats      - Reset statistics")
    
    print("   🔗 Test endpoints:")
    print("      curl http://localhost:5001/api/health")
    print("      curl http://localhost:5001/api/auth/health")
    
    app.run(host='0.0.0.0', port=port, debug=True)# Force rebuild: Tue Jun 24 21:09:54 CEST 2025
