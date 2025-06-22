# backend/config/config.py
import os
from decouple import config

# Load .env file explicitly
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded environment variables from .env file")
except ImportError:
    print("⚠️ python-dotenv not available, using system environment")

class Config:
    SECRET_KEY = config('SECRET_KEY', default='dev-secret-key-change-in-production')
    
    # Database Configuration
    SUPABASE_URL = config('SUPABASE_URL', default='')
    SUPABASE_ANON_KEY = config('SUPABASE_ANON_KEY', default='')
    
    # File Upload
    UPLOAD_FOLDER = config('UPLOAD_FOLDER', default='uploads')
    MAX_CONTENT_LENGTH = config('MAX_CONTENT_LENGTH', default=16 * 1024 * 1024, cast=int)
    ALLOWED_EXTENSIONS = {'pdf'}
    
    # Legacy file storage (fallback)
    STATS_FILE = config('STATS_FILE', default='data/user_stats.json')
    CACHE_DIR = config('CACHE_DIR', default='cache')
    LOG_DIR = config('LOG_DIR', default='logs')
    
    # Server configuration
    PORT = config('PORT', default=5001, cast=int)
    HOST = config('HOST', default='0.0.0.0')
    
    # Feature flags
    USE_DATABASE = config('USE_DATABASE', default=False, cast=bool)
    
    # Rate limiting
    RATE_LIMIT_REQUESTS = config('RATE_LIMIT_REQUESTS', default=30, cast=int)
    RATE_LIMIT_WINDOW = config('RATE_LIMIT_WINDOW', default=60, cast=int)

class DevelopmentConfig(Config):
    DEBUG = True
    FLASK_ENV = 'development'
    LOG_LEVEL = 'DEBUG'
    # Enable database in development if credentials are available
    USE_DATABASE = config('USE_DATABASE', default=bool(config('SUPABASE_URL', default='')), cast=bool)

class ProductionConfig(Config):
    DEBUG = False
    FLASK_ENV = 'production'
    LOG_LEVEL = 'INFO'
    SECRET_KEY = config('SECRET_KEY')  # Required in production
    USE_DATABASE = True  # Force database usage in production

class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    USE_DATABASE = False  # Use file storage for tests
    STATS_FILE = 'tests/test_stats.json'
    UPLOAD_FOLDER = 'tests/uploads'
    PORT = config('TEST_PORT', default=5002, cast=int)
