# Updated app.py with production CORS fix
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

# PRODUCTION CORS FIX - Allow specific domains
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://typetutor.vercel.app",
    "https://typetutor-git-main-osegontes-projects.vercel.app",
    "https://typetutor-osegonte.vercel.app",
    "https://typetutor-2fo842jj2-osegontes-projects.vercel.app",
    "https://typetutor-frontend-17neeudr8-osegontes-projects.vercel.app",
    "https://typetutor.dev"
]

# Also allow all Vercel preview domains for your project
import re
if request and hasattr(request, 'headers'):
    origin = request.headers.get('Origin', '')
    if re.match(r'https://typetutor.*\.vercel\.app$', origin):
        if origin not in allowed_origins:
            allowed_origins.append(origin)

print(f"🌐 CORS allowed origins: {allowed_origins}")

CORS(app, 
     origins=allowed_origins,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-User-ID"],
     supports_credentials=True,
     expose_headers=["Authorization"])
     expose_headers=["Authorization"])

# Enhanced preflight handling
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        origin = request.headers.get('Origin')
        
        # Check if origin is allowed
        if origin in allowed_origins:
            response.headers.add("Access-Control-Allow-Origin", origin)
        else:
            response.headers.add("Access-Control-Allow-Origin", "*")
            
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization,X-User-ID")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add('Access-Control-Allow-Credentials', "true")
        return response

# Create directories
os.makedirs('data', exist_ok=True)
os.makedirs('uploads', exist_ok=True)
os.makedirs('logs', exist_ok=True)

# Import and register authentication routes
try:
    from backend.routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    print("✅ Authentication routes registered")
    AUTH_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Authentication routes not available: {e}")
    AUTH_AVAILABLE = False

# Import token_required decorator
try:
    from backend.routes.auth_routes import token_required
except ImportError:
    print("⚠️  JWT authentication not available - using fallback mode")
    
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
        'cors_enabled': True,
        'cors_origins': len(allowed_origins),
        'environment': os.environ.get('FLASK_ENV', 'production'),
        'timestamp': os.environ.get('RAILWAY_DEPLOYMENT_ID', 'unknown'),
        'features': {
            'supabase_integration': database_status,
            'jwt_authentication': auth_status,
            'user_registration': AUTH_AVAILABLE,
            'user_login': AUTH_AVAILABLE,
            'protected_routes': AUTH_AVAILABLE,
            '21_achievements': database_status,
            'legacy_compatibility': True,
            'pdf_processing': True,
            'production_cors': True
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

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-ID')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Rest of your existing routes remain the same...
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    
    print("🚀 TypeTutor Enhanced Backend with Production CORS")
    print(f"   Port: {port}")
    print(f"   Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"   Database: {app.config.get('USE_DATABASE')}")
    print(f"   Authentication: {AUTH_AVAILABLE}")
    print(f"   CORS Origins: {len(allowed_origins)}")
    
    app.run(host='0.0.0.0', port=port, debug=False)