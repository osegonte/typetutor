import os
import sys
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_app():
    """Create Flask app for Railway"""
    app = Flask(__name__, static_folder='../frontend/dist')
    
    # Configuration
    app.config.update({
        'SECRET_KEY': os.environ.get('SECRET_KEY', 'railway-secret'),
        'DEBUG': False,
        'SUPABASE_URL': os.environ.get('SUPABASE_URL', ''),
        'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY', ''),
        'USE_DATABASE': os.environ.get('USE_DATABASE', 'true').lower() == 'true'
    })
    
    # Enable CORS for all origins
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Basic routes
    @app.route('/api/health')
    def health():
        return jsonify({
            'status': 'healthy',
            'message': 'TypeTutor backend running on Railway',
            'database_enabled': app.config.get('USE_DATABASE', False)
        })
    
    @app.route('/api/stats')
    def get_stats():
        return jsonify({
            'averageWpm': 0,
            'accuracy': 0,
            'practiceMinutes': 0,
            'currentStreak': 0,
            'totalSessions': 0,
            'recentSessions': []
        })
    
    @app.route('/api/save-stats', methods=['POST'])
    def save_stats():
        return jsonify({
            'success': True,
            'message': 'Stats saved successfully'
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
            return jsonify({'message': 'TypeTutor Backend - Frontend not found'})
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
