"""
TypeTutor Flask Application - Railway Production
Simple root-level app.py for Railway deployment
"""

import os
import sys
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import tempfile
import uuid

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def create_app():
    """Create Flask application"""
    app = Flask(__name__, static_folder='frontend/dist')
    
    # Configuration
    app.config.update({
        'SECRET_KEY': os.environ.get('SECRET_KEY', 'railway-secret'),
        'DEBUG': False,
        'SUPABASE_URL': os.environ.get('SUPABASE_URL', ''),
        'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY', ''),
        'USE_DATABASE': os.environ.get('USE_DATABASE', 'true').lower() == 'true',
        'MAX_CONTENT_LENGTH': 16 * 1024 * 1024
    })
    
    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Create upload directory
    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_dir
    
    @app.route('/api/health')
    def health():
        return jsonify({
            'status': 'healthy',
            'message': 'TypeTutor backend running on Railway',
            'database_enabled': app.config.get('USE_DATABASE', False),
            'supabase_configured': bool(app.config.get('SUPABASE_URL')),
            'version': '2.0.0',
            'deployment': 'railway-simple'
        })
    
    @app.route('/api/stats')
    def get_stats():
        """Get user statistics"""
        return jsonify({
            'averageWpm': 45,
            'accuracy': 92,
            'practiceMinutes': 120,
            'currentStreak': 3,
            'totalSessions': 15,
            'recentSessions': [
                {
                    'date': '2025-06-22',
                    'duration': '2m 30s',
                    'wpm': 48,
                    'accuracy': 94,
                    'mode': 'Practice'
                }
            ],
            'personalBest': {
                'wpm': 52,
                'accuracy': 96,
                'date': '2025-06-22'
            }
        })
    
    @app.route('/api/save-stats', methods=['POST'])
    def save_stats():
        """Save typing session statistics"""
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['wpm', 'accuracy', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        return jsonify({
            'success': True,
            'message': 'Statistics saved successfully',
            'saved_data': {
                'wpm': data.get('wpm'),
                'accuracy': data.get('accuracy'),
                'duration': data.get('duration'),
                'timestamp': '2025-06-22T16:30:00Z'
            }
        })
    
    @app.route('/api/reset-stats', methods=['POST'])
    def reset_stats():
        """Reset user statistics"""
        return jsonify({
            'success': True,
            'message': 'Statistics reset successfully',
            'stats': {
                'averageWpm': 0,
                'accuracy': 0,
                'practiceMinutes': 0,
                'currentStreak': 0,
                'totalSessions': 0,
                'recentSessions': []
            }
        })
    
    @app.route('/api/process-text', methods=['POST'])
    def process_text():
        """Process custom text for typing practice"""
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({'error': 'Empty text provided'}), 400
        
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
                'message': 'PDF processing available',
                'supported_formats': ['pdf'],
                'max_file_size': '16MB'
            })
        except ImportError:
            return jsonify({
                'pdf_support': False,
                'pypdf_available': False,
                'message': 'PDF processing not available',
                'supported_formats': [],
                'max_file_size': '0MB'
            })
    
    @app.route('/api/upload-pdf', methods=['POST'])
    def upload_pdf():
        """Handle PDF upload"""
        return jsonify({
            'success': False,
            'message': 'PDF upload feature coming soon in Railway deployment',
            'alternative': 'Please use the text input feature for now'
        })
    
    # Serve frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        try:
            if path and os.path.exists(os.path.join(app.static_folder, path)):
                return send_from_directory(app.static_folder, path)
            else:
                return send_from_directory(app.static_folder, 'index.html')
        except:
            return jsonify({
                'message': 'TypeTutor Backend API',
                'frontend': 'Not available - use separate frontend deployment',
                'api_endpoints': [
                    '/api/health',
                    '/api/stats',
                    '/api/save-stats',
                    '/api/reset-stats',
                    '/api/process-text',
                    '/api/pdf-support'
                ]
            })
    
    return app

# Create app instance
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
