#!/usr/bin/env python3
# start.py - Fixed Railway startup for TypeTutor v3.4.0
import os
import sys
from datetime import datetime

# Version info
APP_VERSION = "3.4.0"
DEPLOYMENT_TIMESTAMP = datetime.now().isoformat()

print(f"🚀 TypeTutor v{APP_VERSION} starting...")
print(f"⏰ Deployment: {DEPLOYMENT_TIMESTAMP}")

# Get the absolute path to the project root
project_root = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(project_root, 'backend')

print(f"📁 Project root: {project_root}")
print(f"📁 Backend dir: {backend_dir}")

# Verify backend directory exists
if not os.path.exists(backend_dir):
    print(f"❌ Backend directory not found: {backend_dir}")
    print(f"📁 Available files: {os.listdir(project_root)}")
    sys.exit(1)

# Change to backend directory and add to path
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)
sys.path.insert(0, project_root)

print(f"📁 Current dir: {os.getcwd()}")
print(f"📁 Backend files: {os.listdir('.')}")

try:
    # Import the Flask app
    print("🔄 Importing Flask app...")
    from app import app
    
    # Verify auth routes are loaded
    auth_routes = [rule.rule for rule in app.url_map.iter_rules() if '/api/auth' in rule.rule]
    all_routes = [rule.rule for rule in app.url_map.iter_rules()]
    
    print(f"🔐 Auth routes loaded: {len(auth_routes)}")
    print(f"📍 Total routes: {len(all_routes)}")
    
    if len(auth_routes) > 0:
        print("   Auth routes found:")
        for route in auth_routes:
            print(f"     - {route}")
    else:
        print("   ❌ No auth routes found!")
    
    # Check environment
    print(f"🌍 Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"🗄️  Supabase URL: {'✅ Set' if os.environ.get('SUPABASE_URL') else '❌ Missing'}")
    print(f"🔑 Supabase Key: {'✅ Set' if os.environ.get('SUPABASE_ANON_KEY') else '❌ Missing'}")
    print(f"🔐 Secret Key: {'✅ Set' if os.environ.get('SECRET_KEY') else '❌ Missing'}")
    
    # Update app config
    app.config.update({
        'APP_VERSION': APP_VERSION,
        'DEPLOYMENT_TIMESTAMP': DEPLOYMENT_TIMESTAMP
    })
    
    # Start the app
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 Starting Flask server on port {port}")
    print(f"🌐 Health check will be available at: /api/health")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False,
        use_reloader=False,
        threaded=True
    )
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print(f"📁 Python path: {sys.path}")
    print(f"📁 Current directory contents: {os.listdir('.')}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Startup error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
