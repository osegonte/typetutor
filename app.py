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
    'SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-secret-key'),
    'USE_DATABASE': os.environ.get('USE_DATABASE', 'true').lower() == 'true',
    'SUPABASE_URL': os.environ.get('SUPABASE_URL'),
    'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY'),
    'STATS_FILE': 'data/user_stats.json'
})

# CORS
CORS(app, origins=['http://localhost:5173', 'http://localhost:3000'])

# Create directories
os.makedirs('data', exist_ok=True)

@app.route('/api/health')
def health():
    database_status = False
    if app.config.get('USE_DATABASE'):
        try:
            from services.simple_database_service import get_simple_supabase_service
            service = get_simple_supabase_service()
            database_status = True
        except Exception as e:
            print(f"Database service error: {e}")
    
    return jsonify({
        'status': 'healthy',
        'message': 'TypeTutor Enhanced Backend',
        'version': '2.0.0',
        'database_mode': app.config.get('USE_DATABASE', False),
        'database_connected': database_status,
        'features': {
            'supabase_integration': database_status,
            '21_achievements': database_status,
            'user_authentication': database_status,
            'legacy_compatibility': True
        }
    })

@app.route('/api/stats')
def get_stats():
    try:
        if app.config.get('USE_DATABASE'):
            try:
                from services.simple_database_service import get_simple_supabase_service
                import asyncio
                
                user_id = request.headers.get('X-User-ID', 'demo-user')
                service = get_simple_supabase_service()
                
                # Run async function
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    stats = loop.run_until_complete(service.get_user_statistics(user_id))
                    stats['source'] = 'supabase'
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
            return jsonify(stats)
        except ImportError:
            # Return default stats
            return jsonify({
                'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None},
                'source': 'default'
            })
    except Exception as e:
        print(f"Error in get_stats: {e}")
        return jsonify({
            'averageWmp': 0, 'accuracy': 0, 'practiceMinutes': 0,
            'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
            'error': str(e)
        })

@app.route('/api/save-stats', methods=['POST'])
def save_stats():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        if app.config.get('USE_DATABASE'):
            try:
                from services.simple_database_service import get_simple_supabase_service
                import asyncio
                
                user_id = request.headers.get('X-User-ID', 'demo-user')
                service = get_simple_supabase_service()
                
                session_data = {
                    'user_id': user_id,
                    'wpm': data['wpm'],
                    'accuracy': data['accuracy'],
                    'duration_seconds': int(float(data['duration'])),
                    'characters_typed': data.get('totalCharacters', 0),
                    'errors_count': data.get('errorsCount', 0)
                }
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(service.save_typing_session(session_data))
                    result['source'] = 'supabase'
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
            return jsonify(result)
        except ImportError:
            return jsonify({'error': 'No stats service available'}), 500
            
    except Exception as e:
        print(f"Save error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    
    print("🚀 TypeTutor Enhanced Backend")
    print(f"   Port: {port}")
    print(f"   Database: {app.config.get('USE_DATABASE')}")
    
    # Test services
    if app.config.get('USE_DATABASE'):
        try:
            from services.simple_database_service import get_simple_supabase_service
            service = get_simple_supabase_service()
            print("   ✅ Supabase service connected (REST API)")
        except Exception as e:
            print(f"   ⚠️  Supabase service failed: {e}")
    
    try:
        from services.stats_service import StatsService
        print("   ✅ Legacy stats service available")
    except ImportError:
        print("   ⚠️  Legacy stats service not available")
    
    print("   Ready for testing!")
    print("   🔗 Test: curl http://localhost:5001/api/health")
    
    app.run(host='0.0.0.0', port=port, debug=True)
