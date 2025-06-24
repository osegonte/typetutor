# app.py - Enhanced TypeTutor Flask Application with Complete Supabase Integration
"""
TypeTutor Backend - Production-ready with Supabase integration
Features:
- Complete authentication system ready for frontend
- Full database integration with PostgreSQL
- Advanced user statistics and analytics
- Achievement and goal systems
- PDF processing and document management
- Real-time capabilities
- Comprehensive API with legacy compatibility
"""

import os
import sys
import logging
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def create_app(config_name='production'):
    """Create and configure Flask application"""
    app = Flask(__name__)
    
    # Environment-based configuration
    is_development = (os.environ.get('FLASK_ENV') == 'development' or 
                     config_name == 'development')
    is_testing = config_name == 'testing'
    use_database = os.environ.get('USE_DATABASE', 'true').lower() == 'true'
    
    # Basic configuration
    app.config.update({
        'SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-secret-key'),
        'DEBUG': is_development,
        'TESTING': is_testing,
        'MAX_CONTENT_LENGTH': 16 * 1024 * 1024,  # 16MB
        'UPLOAD_FOLDER': os.environ.get('UPLOAD_FOLDER', 'uploads'),
        'STATS_FILE': os.environ.get('STATS_FILE', 'data/user_stats.json'),
        'USE_DATABASE': use_database,
        'SUPABASE_URL': os.environ.get('SUPABASE_URL'),
        'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY'),
        'RATE_LIMIT_REQUESTS': int(os.environ.get('RATE_LIMIT_REQUESTS', 30)),
        'RATE_LIMIT_WINDOW': int(os.environ.get('RATE_LIMIT_WINDOW', 60)),
    })
    
    # CORS Configuration - Enhanced for production
    configure_cors(app, is_development)
    
    # Create necessary directories
    create_directories(app)
    
    # Setup logging
    setup_logging(app, is_development)
    
    # Register routes and error handlers
    register_routes(app)
    register_error_handlers(app)
    
    # Log startup information
    log_startup_info(app, use_database)
    
    return app

def configure_cors(app, is_development):
    """Configure CORS for development and production"""
    if is_development:
        # Development: Allow frontend dev servers
        CORS(app, 
             origins=[
                 'http://localhost:5173',
                 'http://localhost:3000', 
                 'http://127.0.0.1:5173',
                 'http://127.0.0.1:3000'
             ],
             supports_credentials=True,
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID'],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    else:
        # Production: Allow deployed frontends
        CORS(app,
             origins=[
                 'https://*.vercel.app',
                 'https://*.netlify.app',
                 'https://typetutor.dev',
                 'https://*.typetutor.dev'
             ],
             supports_credentials=True,
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID'],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

def create_directories(app):
    """Create necessary directories"""
    directories = [
        app.config['UPLOAD_FOLDER'],
        os.path.dirname(app.config['STATS_FILE']),
        'logs',
        'cache'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

def setup_logging(app, is_development):
    """Setup application logging"""
    if not app.debug and not app.testing:
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s %(levelname)s [%(name)s] %(message)s',
            handlers=[
                logging.FileHandler('logs/typetutor.log'),
                logging.StreamHandler()
            ]
        )
    
    # Reduce noise from external libraries
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)

def register_routes(app):
    """Register all application routes"""
    
    # Add CORS headers to ALL responses
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-User-ID'
        response.headers['Access-Control-Max-Age'] = '86400'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Handle preflight OPTIONS requests
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = jsonify({'status': 'OK'})
            origin = request.headers.get('Origin')
            if origin:
                response.headers['Access-Control-Allow-Origin'] = origin
            else:
                response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-User-ID'
            response.headers['Access-Control-Max-Age'] = '86400'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response

    # Main health check endpoint
    @app.route('/api/health', methods=['GET', 'OPTIONS'])
    def health():
        """Enhanced health check with system status"""
        use_database = app.config.get('USE_DATABASE', False)
        
        health_data = {
            'status': 'healthy',
            'message': 'TypeTutor backend running with enhanced Supabase integration',
            'timestamp': datetime.now().isoformat(),
            'version': '2.0.0',
            'environment': {
                'debug': app.debug,
                'testing': app.testing,
                'use_database': use_database,
                'upload_folder': app.config.get('UPLOAD_FOLDER'),
                'max_file_size_mb': app.config.get('MAX_CONTENT_LENGTH', 0) // (1024 * 1024)
            },
            'features': {
                'database_integration': use_database,
                'user_authentication': use_database,
                'achievements_system': use_database,
                'goals_system': use_database,
                'analytics_system': use_database,
                'pdf_processing': True,
                'real_time_stats': use_database,
                'legacy_compatibility': True
            },
            'cors': {
                'enabled': True,
                'development_mode': app.debug,
                'credentials_supported': True
            }
        }
        
        # Test database connection if enabled
        if use_database:
            try:
                from services.enhanced_database_service import get_supabase_service
                service = get_supabase_service()
                db_health = service.client.table('achievements').select('count').limit(1).execute()
                health_data['database'] = {
                    'connected': True,
                    'status': 'healthy',
                    'tables_accessible': True
                }
            except Exception as e:
                health_data['database'] = {
                    'connected': False,
                    'status': 'unhealthy',
                    'error': str(e)
                }
                health_data['status'] = 'degraded'
        
        status_code = 200 if health_data['status'] == 'healthy' else 503
        return jsonify(health_data), status_code

    # Register enhanced API routes if database is enabled
    if app.config.get('USE_DATABASE'):
        try:
            from routes.enhanced_api_routes import api_bp
            app.register_blueprint(api_bp, url_prefix='/api')
            app.logger.info("✅ Enhanced API routes registered (database mode)")
        except ImportError as e:
            app.logger.warning(f"⚠️  Could not register enhanced API routes: {e}")
            register_fallback_routes(app)
    else:
        register_fallback_routes(app)
    
    # Legacy PDF processing endpoint (always available)
    register_pdf_routes(app)
    
    # Root endpoint - API documentation
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_docs(path):
        """API documentation and status"""
        use_database = app.config.get('USE_DATABASE', False)
        
        return jsonify({
            'message': 'TypeTutor Backend API - Enhanced with Supabase',
            'version': '2.0.0',
            'timestamp': datetime.now().isoformat(),
            'database_mode': use_database,
            'documentation': {
                'health': 'GET /api/health - System health check',
                'legacy_endpoints': {
                    'stats': 'GET /api/stats - Get user statistics',
                    'save_stats': 'POST /api/save-stats - Save typing session',
                    'reset_stats': 'POST /api/reset-stats - Reset statistics',
                    'process_text': 'POST /api/process-text - Process custom text',
                    'pdf_support': 'GET /api/pdf-support - PDF processing info',
                    'upload_pdf': 'POST /api/upload-pdf - Upload and process PDF'
                },
                'enhanced_endpoints': {
                    'users': {
                        'profile': 'GET/PUT /api/users/profile - User profile management',
                        'create': 'POST /api/users/create - Create user profile'
                    },
                    'sessions': 'GET/POST /api/sessions - Typing session management',
                    'achievements': 'GET /api/achievements - User achievements',
                    'goals': 'GET/POST /api/goals - Goal management',
                    'analytics': 'GET /api/stats/analytics - Performance analytics',
                    'documents': 'GET/POST /api/documents - Document management'
                } if use_database else 'Available when USE_DATABASE=true'
            },
            'authentication': {
                'required': use_database,
                'header': 'X-User-ID',
                'note': 'Include user ID in X-User-ID header for authenticated endpoints'
            },
            'cors': {
                'enabled': True,
                'supports_credentials': True,
                'allowed_headers': ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID']
            },
            'quick_test': {
                'health_check': 'curl ' + request.url_root + 'api/health',
                'stats': 'curl ' + request.url_root + 'api/stats',
                'pdf_support': 'curl ' + request.url_root + 'api/pdf-support'
            }
        })

def register_fallback_routes(app):
    """Register fallback routes when database is not available"""
    from services.stats_service import StatsService
    
    @app.route('/api/stats', methods=['GET', 'OPTIONS'])
    def get_stats():
        """Get user statistics (file-based fallback)"""
        try:
            stats_service = StatsService(app.config['STATS_FILE'])
            stats = stats_service.get_stats()
            return jsonify(stats)
        except Exception as e:
            app.logger.error(f'Error getting stats: {e}')
            return jsonify({
                'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None}
            })

    @app.route('/api/save-stats', methods=['POST', 'OPTIONS'])
    def save_stats():
        """Save typing session statistics (file-based fallback)"""
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            stats_service = StatsService(app.config['STATS_FILE'])
            result = stats_service.save_session(data)
            
            if result.get('success'):
                return jsonify(result)
            else:
                return jsonify(result), 500
                
        except Exception as e:
            app.logger.error(f'Error saving stats: {e}')
            return jsonify({'error': 'Failed to save statistics'}), 500

    @app.route('/api/reset-stats', methods=['POST', 'OPTIONS'])
    def reset_stats():
        """Reset user statistics (file-based fallback)"""
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
        try:
            stats_service = StatsService(app.config['STATS_FILE'])
            stats = stats_service.reset_stats()
            return jsonify({
                'success': True,
                'message': 'Statistics reset successfully',
                'stats': stats
            })
        except Exception as e:
            app.logger.error(f'Error resetting stats: {e}')
            return jsonify({'error': 'Failed to reset statistics'}), 500

def register_pdf_routes(app):
    """Register PDF processing routes (always available)"""
    
    @app.route('/api/pdf-support', methods=['GET', 'OPTIONS'])
    def pdf_support():
        """Get PDF support information"""
        try:
            import pypdf
            return jsonify({
                'pdf_support': True,
                'pypdf_available': True,
                'version': pypdf.__version__,
                'message': 'PDF processing available',
                'supported_formats': ['pdf'],
                'max_file_size': '16MB'
            })
        except ImportError:
            return jsonify({
                'pdf_support': False,
                'pypdf_available': False,
                'message': 'PDF processing not available - pypdf not installed'
            })

    @app.route('/api/upload-pdf', methods=['POST', 'OPTIONS'])
    def upload_pdf():
        """Upload and process PDF file"""
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
        try:
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
                    'error': 'No file selected'
                }), 400
            
            if not file.filename.lower().endswith('.pdf'):
                return jsonify({
                    'success': False,
                    'error': 'Invalid file type',
                    'message': 'Only PDF files are supported'
                }), 400
            
            # Process PDF using existing logic
            import tempfile
            import pypdf
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                file.save(temp_file.name)
                temp_path = temp_file.name
            
            try:
                reader = pypdf.PdfReader(temp_path)
                text_content = ""
                
                for page_num, page in enumerate(reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text and page_text.strip():
                            text_content += f"\n\n--- Page {page_num + 1} ---\n{page_text.strip()}"
                    except Exception as e:
                        app.logger.warning(f"Error extracting page {page_num + 1}: {e}")
                        continue
                
                os.unlink(temp_path)
                
                if not text_content.strip():
                    return jsonify({
                        'success': False,
                        'error': 'No text found',
                        'message': 'Could not extract text from this PDF'
                    }), 400
                
                # Create study items
                paragraphs = [p.strip() for p in text_content.split('\n\n') 
                             if p.strip() and len(p.strip()) > 20]
                
                items = []
                for i, paragraph in enumerate(paragraphs[:10]):
                    if len(paragraph) > 1000:
                        paragraph = paragraph[:997] + "..."
                    
                    items.append({
                        'id': f'pdf-item-{i+1}',
                        'prompt': f'Type this text from the PDF (section {i+1}):',
                        'content': paragraph,
                        'type': 'text',
                        'context': f'PDF Content - Section {i+1}',
                        'word_count': len(paragraph.split()),
                        'estimated_time': max(30, len(paragraph.split()) / 40 * 60)
                    })
                
                return jsonify({
                    'success': True,
                    'items': items,
                    'item_count': len(items),
                    'message': f'Successfully processed PDF with {len(items)} sections',
                    'file_info': {
                        'name': file.filename,
                        'pages': len(reader.pages)
                    }
                })
                
            except Exception as e:
                try:
                    os.unlink(temp_path)
                except:
                    pass
                return jsonify({
                    'success': False,
                    'error': 'PDF processing failed',
                    'message': str(e)
                }), 500
                
        except ImportError:
            return jsonify({
                'success': False,
                'error': 'PDF support not available'
            }), 503
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Upload failed',
                'message': str(e)
            }), 500

    @app.route('/api/process-text', methods=['POST', 'OPTIONS'])
    def process_text():
        """Process custom text for typing practice"""
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
        try:
            data = request.get_json()
            if not data or 'text' not in data:
                return jsonify({'error': 'No text provided'}), 400
            
            text = data['text'].strip()
            if not text:
                return jsonify({'error': 'Empty text provided'}), 400
            
            if len(text) > 10000:
                return jsonify({'error': 'Text too long. Maximum 10,000 characters.'}), 400
            
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
            
        except Exception as e:
            app.logger.error(f'Error processing text: {e}')
            return jsonify({'error': 'Failed to process text'}), 500

def register_error_handlers(app):
    """Register global error handlers"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': 'The request could not be understood',
            'status_code': 400,
            'timestamp': datetime.now().isoformat()
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required',
            'status_code': 401,
            'timestamp': datetime.now().isoformat()
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'error': 'Forbidden',
            'message': 'Access denied',
            'status_code': 403,
            'timestamp': datetime.now().isoformat()
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'status_code': 404,
            'timestamp': datetime.now().isoformat(),
            'available_endpoints': [
                '/api/health',
                '/api/stats',
                '/api/save-stats',
                '/api/upload-pdf',
                '/api/process-text'
            ]
        }), 404
    
    @app.errorhandler(413)
    def file_too_large(error):
        return jsonify({
            'error': 'File Too Large',
            'message': 'The uploaded file exceeds the 16MB limit',
            'status_code': 413,
            'timestamp': datetime.now().isoformat()
        }), 413
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'error': 'Rate Limit Exceeded',
            'message': 'Too many requests. Please try again later.',
            'status_code': 429,
            'timestamp': datetime.now().isoformat()
        }), 429
    
    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.error(f'Server Error: {error}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500,
            'timestamp': datetime.now().isoformat()
        }), 500

def log_startup_info(app, use_database):
    """Log startup information"""
    app.logger.info("🚀 TypeTutor Backend Starting...")
    app.logger.info(f"   Environment: {os.environ.get('FLASK_ENV', 'production')}")
    app.logger.info(f"   Debug Mode: {app.debug}")
    app.logger.info(f"   Database Mode: {use_database}")
    app.logger.info(f"   Upload Folder: {app.config['UPLOAD_FOLDER']}")
    app.logger.info(f"   Max File Size: {app.config['MAX_CONTENT_LENGTH'] // (1024*1024)}MB")
    
    if use_database:
        app.logger.info("✅ Enhanced mode: Supabase database integration enabled")
        app.logger.info("   Features: Users, Achievements, Goals, Analytics")
    else:
        app.logger.info("📁 Legacy mode: File-based storage")
        app.logger.info("   Set USE_DATABASE=true for enhanced features")

# Create the Flask app instance
app = create_app()

if __name__ == '__main__':
    # Development server
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    use_database = os.environ.get('USE_DATABASE', 'true').lower() == 'true'
    
    print("🚀 TypeTutor Backend - Enhanced with Supabase Integration")
    print("=" * 60)
    print(f"   Version: 2.0.0")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"   Database Mode: {use_database}")
    print("")
    
    if use_database:
        print("🎯 Enhanced Features Available:")
        print("   ✅ User Authentication System")
        print("   ✅ Advanced Statistics & Analytics")
        print("   ✅ Achievement System")
        print("   ✅ Goal Setting & Tracking")
        print("   ✅ Real-time Performance Insights")
        print("   ✅ Document Management")
        print("   ✅ Character-level Analytics")
    else:
        print("📁 Running in Legacy Mode (file-based storage)")
        print("   Set USE_DATABASE=true for enhanced features")
    
    print("")
    print("🌐 API Available at:")
    print(f"   http://localhost:{port}")
    print(f"   http://127.0.0.1:{port}")
    print("")
    
    print("🔗 Key Endpoints:")
    print(f"   Health Check: http://localhost:{port}/api/health")
    print(f"   Statistics: http://localhost:{port}/api/stats")
    print(f"   PDF Upload: http://localhost:{port}/api/upload-pdf")
    
    if use_database:
        print(f"   User Profile: http://localhost:{port}/api/users/profile")
        print(f"   Achievements: http://localhost:{port}/api/achievements")
        print(f"   Goals: http://localhost:{port}/api/goals")
        print(f"   Analytics: http://localhost:{port}/api/stats/analytics")
    
    print("")
    print("🧪 Quick Tests:")
    print(f"   curl http://localhost:{port}/api/health")
    print(f"   curl http://localhost:{port}/api/stats")
    print(f"   curl http://localhost:{port}/api/pdf-support")
    
    if use_database:
        print("")
        print("🔐 Authentication:")
        print("   Include 'X-User-ID: <user_id>' header for authenticated endpoints")
        print("   Frontend should implement Supabase Auth and pass user ID")
    
    print("")
    print("🚀 CORS Configuration:")
    print("   ✅ Preflight requests supported")
    print("   ✅ File uploads enabled")
    print("   ✅ Credentials supported")
    print("   ✅ Frontend integration ready")
    
    if use_database:
        print("")
        print("📊 Database Status:")
        try:
            from services.enhanced_database_service import get_supabase_service
            service = get_supabase_service()
            print("   ✅ Supabase connection established")
            print(f"   ✅ Connected to: {service.url[:50]}...")
        except Exception as e:
            print(f"   ❌ Database connection failed: {e}")
            print("   Check your SUPABASE_URL and SUPABASE_ANON_KEY")
    
    print("")
    print("📝 Next Steps for Frontend Integration:")
    print("   1. Update frontend API URL to use this backend")
    print("   2. Implement authentication with Supabase Auth")
    print("   3. Pass user ID in X-User-ID header for authenticated requests")
    print("   4. Test file uploads and session saving")
    print("   5. Deploy both backend and frontend")
    
    print("")
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    print("")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=debug)
    except KeyboardInterrupt:
        print("\n👋 TypeTutor Backend stopped")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)