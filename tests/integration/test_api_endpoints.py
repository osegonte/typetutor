import pytest
import json
import io
from unittest.mock import patch

class TestPDFEndpoints:
    def test_pdf_support_endpoint(self, client):
        """Test PDF support information endpoint"""
        response = client.get('/api/pdf-support')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'pdf_support' in data
        assert 'pypdf2_available' in data
    
    def test_upload_pdf_no_file(self, client):
        """Test PDF upload without file"""
        response = client.post('/api/upload-pdf')
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_upload_pdf_invalid_file(self, client):
        """Test PDF upload with invalid file"""
        data = {
            'file': (io.BytesIO(b'not a pdf'), 'test.txt')
        }
        response = client.post('/api/upload-pdf', data=data)
        assert response.status_code == 400
    
    def test_process_text_success(self, client):
        """Test text processing endpoint"""
        test_data = {'text': 'This is a test text for typing practice.'}
        response = client.post('/api/process-text', 
                             data=json.dumps(test_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['items']) == 1
    
    def test_process_text_empty(self, client):
        """Test text processing with empty text"""
        test_data = {'text': ''}
        response = client.post('/api/process-text',
                             data=json.dumps(test_data),
                             content_type='application/json')
        
        assert response.status_code == 400

class TestStatsEndpoints:
    def test_get_stats_initial(self, client):
        """Test getting initial statistics"""
        response = client.get('/api/stats')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'averageWpm' in data
        assert 'accuracy' in data
        assert 'totalSessions' in data
    
    def test_save_stats_success(self, client):
        """Test saving valid statistics"""
        stats_data = {
            'wpm': 45,
            'accuracy': 92,
            'duration': 180.5,
            'itemType': 'Practice'
        }
        
        response = client.post('/api/save-stats',
                             data=json.dumps(stats_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
    
    def test_save_stats_invalid_data(self, client):
        """Test saving invalid statistics"""
        stats_data = {
            'wpm': 'invalid',
            'accuracy': 92
            # Missing duration
        }
        
        response = client.post('/api/save-stats',
                             data=json.dumps(stats_data),
                             content_type='application/json')
        
        assert response.status_code == 400
    
    def test_reset_stats(self, client):
        """Test resetting statistics"""
        response = client.post('/api/reset-stats',
                             data=json.dumps({}),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True

class TestHealthEndpoints:
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/api/health')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'status' in data
        assert 'system' in data
        assert 'directories' in data
    
    def test_debug_info(self, client):
        """Test debug information endpoint"""
        response = client.get('/api/debug-info')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'python_version' in data
        assert 'installed_packages' in data
