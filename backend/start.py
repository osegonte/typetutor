#!/usr/bin/env python3
import os
import sys

# Change to backend directory and add to path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
os.chdir(backend_dir)
sys.path.insert(0, '.')

try:
    # Import the app
    from app import app
    
    # Manually register auth routes if not already done
    try:
        from routes.auth_routes import auth_bp
        if not any(rule.rule.startswith('/api/auth') for rule in app.url_map.iter_rules()):
            app.register_blueprint(auth_bp, url_prefix='/api/auth')
            print("✅ Auth routes manually registered")
        else:
            print("✅ Auth routes already registered")
    except ImportError as e:
        print(f"⚠️ Auth routes not available: {e}")
    
    # Start the app
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 Starting TypeTutor on port {port}")
    print(f"   Auth available: {any(rule.rule.startswith('/api/auth') for rule in app.url_map.iter_rules())}")
    
    app.run(host='0.0.0.0', port=port, debug=False)
    
except Exception as e:
    print(f"❌ Error starting app: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
