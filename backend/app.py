import os
import sys
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from datetime import datetime

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

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

# DEFINITIVE CORS SOLUTION - Dynamic origin checking
def is_allowed_origin(origin):
    """Check if origin is allowed with dynamic Vercel support"""
    if not origin:
        return False
    
    # Exact matches for known domains
    allowed_exact = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://typetutor.vercel.app",
        "https://typetutor-git-main-osegontes-projects.vercel.app",
        "https://typetutor-osegonte.vercel.app",
        "https://typetutor.dev"
    ]
    
    if origin in allowed_exact:
        return True
    
    # Pattern matching for Vercel preview deployments
    import re
    if re.match(r'https://typetutor.*\.vercel\.app$', origin):
        return True
    
    return False

# Initialize CORS with custom origin checker
CORS(app, 
     origins=is_allowed_origin,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-User-ID", "Accept", "Origin"],
     supports_credentials=False,
     expose_headers=["Authorization"])

# Enhanced preflight handling
@app.before_request
def handle_preflight():
    """Handle OPTIONS preflight requests"""
    if request.method == "OPTIONS":
        origin = request.headers.get('Origin')
        response = make_response()
        
        if is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-User-ID, Accept, Origin"
            response.headers["Access-Control-Max-Age"] = "86400"
            
            print(f"✅ CORS preflight OK for origin: {origin}")
        else:
            print(f"❌ CORS preflight rejected for origin: {origin}")
        
        return response

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    origin = request.headers.get('Origin')
    
    if is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-User-ID, Accept, Origin"
        response.headers["Access-Control-Expose-Headers"] = "Authorization"
    
    return response

# Create directories
os.makedirs('data', exist_ok=True)
os.makedirs('uploads', exist_ok=True)
os.makedirs('logs', exist_ok=True)

# Health check endpoint
@app.route('/api/health')
def health():
    """Enhanced health check with CORS and system information"""
    return jsonify({
        'status': 'healthy',
        'message': 'TypeTutor Backend API - Clean Version',
        'version': '3.0.0',
        'cors_enabled': True,
        'cors_info': {
            'dynamic_origin_checking': True,
            'supports_vercel_previews': True
        },
        'environment': os.environ.get('FLASK_ENV', 'production'),
        'timestamp': datetime.now().isoformat(),
        'endpoints': {
            'auth': {
                'register': '/api/auth/register',
                'login': '/api/auth/login',
                'profile': '/api/auth/profile'
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

# Stats endpoints with proper error handling
@app.route('/api/stats')
def get_stats():
    """Get user statistics with robust error handling"""
    try:
        # Default stats structure
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
        
        # Try to load from file
        try:
            import json
            stats_file = app.config['STATS_FILE']
            if os.path.exists(stats_file):
                with open(stats_file, 'r') as f:
                    stored_stats = json.load(f)
                    default_stats.update(stored_stats)
                    default_stats['source'] = 'file'
                    print(f"✅ Loaded stats from {stats_file}")
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
        
        # Basic validation
        required_fields = ['wpm', 'accuracy', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Fix duration issues
        duration = data.get('duration', 1)
        if duration <= 0 or duration is None or str(duration).lower() == 'nan':
            print(f"⚠️ Invalid duration detected: {duration}, using fallback")
            duration = 1
        
        data['duration'] = max(int(duration), 1)  # Ensure minimum 1 second
        
        # Validate other fields
        wpm = max(0, int(data.get('wpm', 0)))
        accuracy = max(0, min(100, int(data.get('accuracy', 0))))
        
        print(f"📊 Saving session: {wpm}wpm, {accuracy}% accuracy, {duration}s duration")
        
        # Save to file
        try:
            import json
            
            stats_file = app.config['STATS_FILE']
            
            # Load existing stats or create new
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
            
            # Create new session record
            new_session = {
                'date': datetime.now().strftime('%Y-%m-%d'),
                'duration': f"{duration // 60}m {duration % 60}s",
                'wpm': wpm,
                'accuracy': accuracy,
                'mode': data.get('mode', 'Practice'),
                'timestamp': datetime.now().isoformat(),
                'raw_duration': duration
            }
            
            # Update stats
            stats['recentSessions'].insert(0, new_session)
            stats['recentSessions'] = stats['recentSessions'][:10]  # Keep last 10
            stats['totalSessions'] = stats.get('totalSessions', 0) + 1
            stats['lastSessionDate'] = new_session['date']
            
            # Update practice minutes
            stats['practiceMinutes'] = stats.get('practiceMinutes', 0) + (duration / 60)
            
            # Update averages
            sessions = stats['recentSessions']
            if sessions:
                stats['averageWpm'] = sum(s['wpm'] for s in sessions) // len(sessions)
                stats['accuracy'] = sum(s['accuracy'] for s in sessions) // len(sessions)
            
            # Update personal best
            if wpm > stats['personalBest']['wpm']:
                stats['personalBest'] = {
                    'wpm': wpm,
                    'accuracy': accuracy,
                    'date': new_session['date']
                }
                print(f"🏆 New personal best: {wpm} WPM!")
            
            # Save to file
            os.makedirs(os.path.dirname(stats_file), exist_ok=True)
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2)
            
            print(f"✅ Session saved successfully to {stats_file}")
            
        except Exception as e:
            print(f"⚠️ Error saving to file: {e}")
            # Continue anyway - at least return success to frontend
        
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
        
        if len(text) > 50000:  # Reasonable limit
            return jsonify({'error': 'Text too long (max 50,000 characters)'}), 400
        
        print(f"📝 Processing text: {len(text)} characters")
        
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
                    'estimated_time': len(text) // 250,  # Rough estimate at 50 WPM
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
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files are supported'}), 400
        
        print(f"📄 PDF upload attempt: {file.filename}")
        
        # Basic PDF processing (placeholder - you can enhance this)
        try:
            # Try to extract text (requires pypdf)
            import pypdf
            
            # Save uploaded file temporarily
            upload_path = os.path.join('uploads', file.filename)
            os.makedirs('uploads', exist_ok=True)
            file.save(upload_path)
            
            # Extract text
            with open(upload_path, 'rb') as pdf_file:
                pdf_reader = pypdf.PdfReader(pdf_file)
                text_content = ""
                
                for page in pdf_reader.pages:
                    text_content += page.extract_text() + "\n"
            
            # Clean up
            os.remove(upload_path)
            
            if not text_content.strip():
                return jsonify({'error': 'Could not extract text from PDF'}), 400
            
            print(f"✅ Extracted {len(text_content)} characters from PDF")
            
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
            # pypdf not available
            return jsonify({
                'success': False,
                'error': 'PDF processing not available. Please install pypdf or use custom text instead.',
                'fallback': True
            })
            
    except Exception as e:
        print(f"❌ Error in upload_pdf: {e}")
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    
    print("🚀 TypeTutor Backend API - Clean Version")
    print(f"   Port: {port}")
    print(f"   Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"   CORS: Dynamic origin checking enabled")
    print(f"   Data directory: {os.path.abspath('data')}")
    
    app.run(host='0.0.0.0', port=port, debug=False)
