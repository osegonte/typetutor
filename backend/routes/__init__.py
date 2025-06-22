# Updated backend/routes/__init__.py
from .pdf_routes import pdf_bp
from .stats_routes import stats_bp
from .health_routes import health_bp
from .analytics_routes import analytics_bp

def register_routes(app):
    """Register all route blueprints"""
    app.register_blueprint(pdf_bp, url_prefix='/api')
    app.register_blueprint(stats_bp, url_prefix='/api')
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    
    # Add database routes if database is enabled
    if app.config.get('USE_DATABASE', False):
        try:
            from .database_routes import database_bp
            app.register_blueprint(database_bp, url_prefix='/api')
            app.logger.info("Database routes registered")
        except ImportError as e:
            app.logger.warning(f"Could not register database routes: {e}")

__all__ = ['register_routes', 'pdf_bp', 'stats_bp', 'health_bp', 'analytics_bp']
