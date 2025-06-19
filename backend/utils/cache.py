import os
import json
import hashlib
from functools import wraps

class SimpleFileCache:
    """Simple file-based cache for PDF processing"""
    
    def __init__(self, cache_dir='cache'):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def get_cache_key(self, file_path, function_name):
        """Generate cache key based on file path, modification time, and function"""
        try:
            file_stat = os.stat(file_path)
            key_data = f"{file_path}:{file_stat.st_mtime}:{function_name}"
            return hashlib.md5(key_data.encode()).hexdigest()
        except OSError:
            return None
    
    def get(self, key):
        """Get cached data"""
        if not key:
            return None
        
        cache_file = os.path.join(self.cache_dir, f"{key}.json")
        try:
            if os.path.exists(cache_file):
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except (json.JSONDecodeError, IOError):
            # Remove corrupted cache file
            try:
                os.remove(cache_file)
            except OSError:
                pass
        return None
    
    def set(self, key, data):
        """Set cached data"""
        if not key:
            return
        
        cache_file = os.path.join(self.cache_dir, f"{key}.json")
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except (IOError, TypeError):
            pass  # Fail silently if caching fails
    
    def clear(self):
        """Clear all cached data"""
        try:
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.json'):
                    os.remove(os.path.join(self.cache_dir, filename))
        except OSError:
            pass

# Global cache instance
pdf_cache = SimpleFileCache()

def cache_pdf_extraction(func):
    """Decorator to cache PDF extraction results"""
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        cache_key = pdf_cache.get_cache_key(self.file_path, func.__name__)
        if cache_key:
            cached_result = pdf_cache.get(cache_key)
            if cached_result:
                return cached_result
        
        result = func(self, *args, **kwargs)
        
        if cache_key:
            pdf_cache.set(cache_key, result)
        
        return result
    return wrapper
