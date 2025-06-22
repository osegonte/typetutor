#!/usr/bin/env python3
"""
WSGI Entry Point for TypeTutor Flask Application
Railway Production Deployment
"""

import os
import sys

# Add the current directory and backend directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, 'backend'))

# Import the Flask app
try:
    # Import from the main app.py in root directory
    from app import create_app
    app = create_app()
    print("✅ Successfully imported app from root app.py")
except ImportError as e:
    print(f"⚠️ Could not import from root app.py: {e}")
    try:
        # Try importing from backend/app.py
        from backend.app import create_app
        app = create_app()
        print("✅ Successfully imported app from backend/app.py")
    except ImportError as e:
        print(f"❌ Could not import from backend/app.py: {e}")
        # Create a minimal fallback app
        from flask import Flask, jsonify
        app = Flask(__name__)
        
        @app.route('/api/health')
        def health():
            return jsonify({
                'status': 'error',
                'message': 'WSGI fallback app - main app could not be imported',
                'error': str(e)
            })
        
        print("⚠️ Using fallback Flask app")

# Configure for production
if hasattr(app, 'config'):
    app.config['DEBUG'] = False
    app.config['TESTING'] = False
    
    # Set required config from environment
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fallback-secret-key')
    app.config['SUPABASE_URL'] = os.environ.get('SUPABASE_URL', '')
    app.config['SUPABASE_ANON_KEY'] = os.environ.get('SUPABASE_ANON_KEY', '')
    app.config['USE_DATABASE'] = os.environ.get('USE_DATABASE', 'true').lower() == 'true'

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)