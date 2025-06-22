from flask import Blueprint, jsonify

def register_routes(app):
    """Register minimal routes for Railway deployment"""
    
    @app.route('/api/health')
    def health():
        return jsonify({
            'status': 'healthy',
            'message': 'TypeTutor backend is running on Railway',
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
            'message': 'Stats saved (demo mode)'
        })
