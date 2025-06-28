#!/usr/bin/env python3
import os
import sys
import subprocess

# Change to backend directory
os.chdir('backend')

# Add backend to Python path
sys.path.insert(0, '.')

# Import and run the app
try:
    from app import app
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 Starting TypeTutor on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
except Exception as e:
    print(f"❌ Error starting app: {e}")
    sys.exit(1)
