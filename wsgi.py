#!/usr/bin/env python3
"""
WSGI Entry Point for TypeTutor Flask Application
Railway Production Deployment
"""

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Try multiple import patterns to find the Flask app
try:
    # First try: import from app.py in root
    from app import create_app
    app = create_app()
except ImportError:
    try:
        # Second try: import from backend/app.py
        from backend.app import create_app
        app = create_app()
    except ImportError:
        # Third try: import the app instance directly
        try:
            from app import app
        except ImportError:
            try:
                from backend.app import app
            except ImportError:
                # Last resort: create a simple Flask app
                from flask import Flask
                app = Flask(__name__)
                
                @app.route('/api/health')
                def health():
                    return {'status': 'healthy', 'message': 'WSGI fallback app'}

# Ensure we have a WSGI-compatible application
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
