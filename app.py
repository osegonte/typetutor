# Updated app.py with production CORS fix
import os
import sys
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

# Fix Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend')
sys.path.insert(0, current_dir)
sys.path.insert(0, backend_dir)

app = Flask(__name__)

# NUCLEAR CORS FIX - Maximum compatibility, allows everything
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

# Initialize CORS with maximum permissive settings
CORS(app, 
     origins="*",
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["*"],
     supports_credentials=False,  # Must be False with wildcard origin
     expose_headers=["*"])

# Override ALL CORS handling
@app.before_request
def nuclear_cors_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

@app.after_request
def nuclear_cors_response(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-User-ID, Accept, Origin"
    response.headers["Access-Control-Expose-Headers"] = "Authorization"
    return response


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



# Enhanced OPTIONS handling



if __name__ == \'__main__\':port = int(os.environ.get('PORT', 5001))
    
    print("🚀 TypeTutor Enhanced Backend with Production CORS")
    print(f"   Port: {port}")
    print(f"   Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"   Database: {app.config.get('USE_DATABASE')}")
    print(f"   Authentication: {AUTH_AVAILABLE}")
    print(f"   CORS Origins: {len(allowed_origins)}")
    
    app.run(host='0.0.0.0', port=port, debug=False)