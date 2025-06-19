import os
from decouple import config

class Config:
    SECRET_KEY = config('SECRET_KEY', default='dev-secret-key-change-in-production')
    UPLOAD_FOLDER = config('UPLOAD_FOLDER', default='uploads')
    MAX_CONTENT_LENGTH = config('MAX_CONTENT_LENGTH', default=16 * 1024 * 1024, cast=int)  # 16MB
    ALLOWED_EXTENSIONS = {'pdf'}
    STATS_FILE = config('STATS_FILE', default='data/user_stats.json')
    CACHE_DIR = config('CACHE_DIR', default='cache')
    LOG_DIR = config('LOG_DIR', default='logs')
    
    # Rate limiting
    RATE_LIMIT_REQUESTS = config('RATE_LIMIT_REQUESTS', default=10, cast=int)
    RATE_LIMIT_WINDOW = config('RATE_LIMIT_WINDOW', default=60, cast=int)

class DevelopmentConfig(Config):
    DEBUG = True
    FLASK_ENV = 'development'
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    DEBUG = False
    FLASK_ENV = 'production'
    LOG_LEVEL = 'INFO'
    SECRET_KEY = config('SECRET_KEY')  # Required in production

class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    STATS_FILE = 'tests/test_stats.json'
    UPLOAD_FOLDER = 'tests/uploads'
