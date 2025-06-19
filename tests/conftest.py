import pytest
import os
import tempfile
import json
import sys

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

from backend.app import create_app

@pytest.fixture
def app():
    """Create application for testing"""
    test_dir = tempfile.mkdtemp()
    
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'UPLOAD_FOLDER': os.path.join(test_dir, 'uploads'),
        'STATS_FILE': os.path.join(test_dir, 'test_stats.json'),
        'CACHE_DIR': os.path.join(test_dir, 'cache'),
        'LOG_DIR': os.path.join(test_dir, 'logs')
    })
    
    # Create test directories
    for directory in [app.config['UPLOAD_FOLDER'], 
                     os.path.dirname(app.config['STATS_FILE']),
                     app.config['CACHE_DIR'],
                     app.config['LOG_DIR']]:
        os.makedirs(directory, exist_ok=True)
    
    yield app
    
    # Cleanup
    import shutil
    shutil.rmtree(test_dir, ignore_errors=True)

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()
