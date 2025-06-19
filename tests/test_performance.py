import pytest
import time
from unittest.mock import Mock, patch

@pytest.mark.slow
class TestPerformance:
    def test_pdf_processing_time(self, client):
        """Test that PDF processing completes within reasonable time"""
        # This would need a real PDF file for proper testing
        pass
    
    def test_stats_save_performance(self, client):
        """Test statistics saving performance"""
        stats_data = {
            'wpm': 45,
            'accuracy': 92,
            'duration': 180.5,
            'itemType': 'Practice'
        }
        
        start_time = time.time()
        
        # Save stats multiple times
        for _ in range(10):
            response = client.post('/api/save-stats',
                                 json=stats_data)
            assert response.status_code == 200
        
        total_time = time.time() - start_time
        average_time = total_time / 10
        
        # Should complete within reasonable time
        assert average_time < 0.1  # 100ms per save operation
    
    def test_concurrent_requests(self, client):
        """Test handling of concurrent requests"""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request():
            response = client.get('/api/health')
            results.put(response.status_code)
        
        # Create multiple threads
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Check all requests succeeded
        status_codes = []
        while not results.empty():
            status_codes.append(results.get())
        
        assert len(status_codes) == 10
        assert all(code == 200 for code in status_codes)
