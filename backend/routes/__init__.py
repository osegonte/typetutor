from .pdf_routes import pdf_bp
from .stats_routes import stats_bp
from .health_routes import health_bp

def register_routes(app):
    """Register all route blueprints"""
    app.register_blueprint(pdf_bp, url_prefix='/api')
    app.register_blueprint(stats_bp, url_prefix='/api')
    app.register_blueprint(health_bp, url_prefix='/api')

__all__ = ['register_routes', 'pdf_bp', 'stats_bp', 'health_bp']
