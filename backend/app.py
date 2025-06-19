import os
import sys
from flask import Flask, send_from_directory
from flask_cors import CORS

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.config import DevelopmentConfig, ProductionConfig, TestingConfig
from routes import register_routes
from utils.logging_config import setup_logging
from utils.error_handlers import register_error_handlers

def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__, static_folder='../frontend/dist')
    
    # Determine configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    if config_name == 'production':
        app.config.from_object(ProductionConfig)
    elif config_name == 'testing':
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(DevelopmentConfig)
    
    # Setup CORS
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000"
    ]
    
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    
    # Setup logging
    setup_logging(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register routes
    register_routes(app)
    
    # Create necessary directories
    _create_directories(app)
    
    # Serve static files (frontend)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path != "" and os.path.exists(app.static_folder + '/' + path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    app.logger.info(f'TypeTutor backend initialized in {config_name} mode')
    return app

def _create_directories(app):
    """Create necessary directories with proper permissions"""
    directories = [
        app.config.get('UPLOAD_FOLDER', 'uploads'),
        os.path.dirname(app.config.get('STATS_FILE', 'data/user_stats.json')),
        app.config.get('CACHE_DIR', 'cache'),
        app.config.get('LOG_DIR', 'logs')
    ]
    
    for directory in directories:
        if directory and not os.path.exists(directory):
            try:
                os.makedirs(directory, exist_ok=True)
                app.logger.info(f'Created directory: {directory}')
            except OSError as e:
                app.logger.error(f'Failed to create directory {directory}: {e}')
                raise

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    debug = app.config.get('DEBUG', False)
    
    app.run(debug=debug, host='0.0.0.0', port=port)
