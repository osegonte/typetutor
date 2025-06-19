import pytest
import os
import tempfile
import json
from backend.app import create_app

@pytest.fixture
def app():
    """Create application for testing"""
    # Create temporary directory for test files
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

@pytest.fixture
def sample_stats():
    """Sample statistics data for testing"""
    return {
        "averageWpm": 45,
        "accuracy": 92,
        "practiceMinutes": 120,
        "currentStreak": 5,
        "totalSessions": 25,
        "lastSessionDate": "2025-06-19",
        "recentSessions": [
            {
                "date": "2025-06-19T10:30:00",
                "duration": "3m 45s",
                "wpm": 48,
                "accuracy": 94,
                "mode": "PDF Practice"
            }
        ],
        "personalBest": {
            "wpm": 65,
            "accuracy": 98,
            "date": "2025-06-15T14:20:00"
        }
    }

@pytest.fixture
def sample_pdf_file():
    """Create a sample PDF file for testing"""
    # This would need a real PDF file for proper testing
    # For now, we'll create a placeholder
    import tempfile
    temp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    temp_file.write(b'%PDF-1.4\nSample PDF content for testing')
    temp_file.close()
    yield temp_file.name
    os.unlink(temp_file.name)
