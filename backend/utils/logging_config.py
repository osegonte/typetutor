import logging
import logging.handlers
import os
from datetime import datetime

def setup_logging(app):
    """Setup application logging"""
    log_dir = app.config.get('LOG_DIR', 'logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s %(levelname)s [%(name)s] %(message)s'
    )
    
    # File handler with rotation
    log_file = os.path.join(log_dir, 'typetutor.log')
    file_handler = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=10240000, backupCount=10
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)
    
    # Console handler for development
    if app.debug:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(logging.DEBUG)
        app.logger.addHandler(console_handler)
    
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('TypeTutor application started')

def get_logger(name):
    """Get logger instance"""
    return logging.getLogger(name)
