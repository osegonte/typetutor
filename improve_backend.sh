#!/bin/bash

# TypeTutor Backend Improvement Script
# This script implements the improvements outlined in the TypeTutor Backend Improvement Guide

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_header() { echo -e "${PURPLE}[HEADER]${NC} $1"; }

print_header "TypeTutor Backend Improvement Script Starting..."
echo "=================================================================="

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    print_error "This script must be run from the TypeTutor root directory (where backend/ folder exists)"
    exit 1
fi

print_status "Backing up current backend..."
# Create backup of current backend
if [ -d "backend_backup" ]; then
    rm -rf backend_backup
fi
cp -r backend backend_backup
print_success "Backup created at backend_backup/"

print_status "Creating new directory structure..."

# Create new directory structure
mkdir -p backend/routes
mkdir -p backend/services
mkdir -p backend/utils
mkdir -p backend/models
mkdir -p backend/config
mkdir -p tests/fixtures
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p logs
mkdir -p cache

print_success "Directory structure created"

print_status "Creating enhanced requirements files..."

# Create requirements-dev.txt
cat > requirements-dev.txt << 'EOF'
# Development dependencies
pytest==7.4.0
pytest-cov==4.1.0
pytest-flask==1.2.0
black==23.7.0
flake8==6.0.0
coverage==7.2.7
pre-commit==3.3.3
python-decouple==3.8
python-magic==0.4.27
psutil==5.9.5
gunicorn==21.2.0
EOF

# Update requirements.txt
cat > requirements.txt << 'EOF'
Flask==2.3.3
Flask-Cors==4.0.0
PyPDF2==3.0.1
Werkzeug==2.3.7
python-decouple==3.8
python-magic==0.4.27
psutil==5.9.5
gunicorn==21.2.0
EOF

print_success "Requirements files updated"

print_status "Creating configuration system..."

# Create config.py
cat > backend/config/config.py << 'EOF'
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
EOF

# Create config __init__.py
cat > backend/config/__init__.py << 'EOF'
from .config import DevelopmentConfig, ProductionConfig, TestingConfig

__all__ = ['DevelopmentConfig', 'ProductionConfig', 'TestingConfig']
EOF

print_success "Configuration system created"

print_status "Creating utility modules..."

# Create logging configuration
cat > backend/utils/logging_config.py << 'EOF'
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
EOF

# Create error handlers
cat > backend/utils/error_handlers.py << 'EOF'
from flask import jsonify
import logging

def register_error_handlers(app):
    """Register global error handlers"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': 'The request could not be understood by the server',
            'status_code': 400
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'status_code': 404
        }), 404
    
    @app.errorhandler(413)
    def file_too_large(error):
        return jsonify({
            'error': 'File Too Large',
            'message': 'The uploaded file exceeds the maximum allowed size',
            'status_code': 413
        }), 413
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'error': 'Rate Limit Exceeded',
            'message': 'Too many requests. Please try again later.',
            'status_code': 429
        }), 429
    
    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.error(f'Server Error: {error}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500
        }), 500
EOF

# Create validators
cat > backend/utils/validators.py << 'EOF'
import os
import magic
from werkzeug.utils import secure_filename

class FileValidator:
    ALLOWED_EXTENSIONS = {'pdf'}
    MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
    
    @staticmethod
    def validate_file_upload(file):
        """Validate uploaded file"""
        errors = []
        
        # Check if file exists
        if not file or file.filename == '':
            errors.append("No file selected")
            return {'valid': False, 'errors': errors}
        
        # Validate filename
        filename = secure_filename(file.filename)
        if not filename:
            errors.append("Invalid filename")
        
        # Validate extension
        if not FileValidator._allowed_file(filename):
            errors.append("File type not allowed. Only PDF files are accepted.")
        
        # Validate file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > FileValidator.MAX_FILE_SIZE:
            errors.append(f"File too large. Maximum size is {FileValidator.MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Validate MIME type (if python-magic is available)
        try:
            if not FileValidator._validate_mime_type(file):
                errors.append("File content does not match PDF format")
        except ImportError:
            pass  # Skip MIME validation if python-magic not available
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'filename': filename,
            'size': file_size
        }
    
    @staticmethod
    def _allowed_file(filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in FileValidator.ALLOWED_EXTENSIONS
    
    @staticmethod
    def _validate_mime_type(file):
        try:
            # Read first 2048 bytes for MIME type detection
            chunk = file.read(2048)
            file.seek(0)
            mime_type = magic.from_buffer(chunk, mime=True)
            return mime_type == 'application/pdf'
        except:
            return True  # Fallback to allowing if detection fails

def validate_pdf_upload(request):
    """Validate PDF upload request"""
    if 'file' not in request.files:
        return {'valid': False, 'message': 'No file part in the request'}
    
    file = request.files['file']
    return FileValidator.validate_file_upload(file)

def validate_stats_data(data):
    """Validate statistics data"""
    required_fields = ['wpm', 'accuracy', 'duration']
    errors = []
    
    if not data:
        return {'valid': False, 'errors': ['No data provided']}
    
    for field in required_fields:
        if field not in data:
            errors.append(f'Missing required field: {field}')
    
    # Validate numeric fields
    try:
        if 'wpm' in data:
            wpm = int(data['wpm'])
            if wpm < 0 or wpm > 300:  # Reasonable WPM range
                errors.append('WPM must be between 0 and 300')
        
        if 'accuracy' in data:
            accuracy = int(data['accuracy'])
            if accuracy < 0 or accuracy > 100:
                errors.append('Accuracy must be between 0 and 100')
        
        if 'duration' in data:
            duration = float(data['duration'])
            if duration < 0:
                errors.append('Duration must be positive')
    
    except (ValueError, TypeError):
        errors.append('Invalid numeric data provided')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }
EOF

# Create decorators
cat > backend/utils/decorators.py << 'EOF'
from functools import wraps
from flask import request, jsonify, current_app
import time
from collections import defaultdict

# Rate limiter storage
rate_limiter_storage = defaultdict(list)

def handle_errors(f):
    """Decorator to handle common errors"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except FileNotFoundError as e:
            current_app.logger.error(f'File not found: {e}')
            return jsonify({'error': 'File not found', 'message': str(e)}), 404
        except PermissionError as e:
            current_app.logger.error(f'Permission error: {e}')
            return jsonify({'error': 'Permission denied', 'message': str(e)}), 403
        except ValueError as e:
            current_app.logger.error(f'Value error: {e}')
            return jsonify({'error': 'Invalid data', 'message': str(e)}), 400
        except Exception as e:
            current_app.logger.error(f'Unexpected error: {e}')
            return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred'}), 500
    return decorated_function

def rate_limit(max_requests=None, time_window=None):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get rate limit settings from app config or use defaults
            max_reqs = max_requests or current_app.config.get('RATE_LIMIT_REQUESTS', 10)
            window = time_window or current_app.config.get('RATE_LIMIT_WINDOW', 60)
            
            client_ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
            now = time.time()
            
            # Clean old requests
            rate_limiter_storage[client_ip] = [
                req_time for req_time in rate_limiter_storage[client_ip]
                if now - req_time < window
            ]
            
            # Check if under limit
            if len(rate_limiter_storage[client_ip]) >= max_reqs:
                return jsonify({'error': 'Rate limit exceeded'}), 429
            
            # Add current request
            rate_limiter_storage[client_ip].append(now)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
EOF

# Create cache utility
cat > backend/utils/cache.py << 'EOF'
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
EOF

# Create text processor
cat > backend/utils/text_processor.py << 'EOF'
import re
from typing import List, Dict

class TextProcessor:
    """Enhanced text processing for creating study items"""
    
    def __init__(self):
        self.sentence_endings = r'[.!?]+\s+'
        self.paragraph_breaks = r'\n\s*\n'
    
    def create_smart_chunks(self, text: str, target_length: int = 300, 
                          max_length: int = 600, min_length: int = 50) -> List[Dict]:
        """Create smart text chunks for typing practice"""
        
        # Clean and normalize text
        cleaned_text = self._clean_text(text)
        
        # Split into paragraphs
        paragraphs = self._split_paragraphs(cleaned_text)
        
        # Create chunks
        chunks = []
        current_chunk = []
        current_length = 0
        
        for paragraph in paragraphs:
            para_length = len(paragraph)
            
            # Skip very short paragraphs
            if para_length < min_length:
                continue
            
            # If paragraph alone exceeds max length, split it
            if para_length > max_length:
                sentence_chunks = self._split_long_paragraph(paragraph, max_length)
                chunks.extend(sentence_chunks)
                continue
            
            # If adding this paragraph exceeds max length, save current chunk
            if current_length + para_length > max_length and current_chunk:
                chunk_text = '\n\n'.join(current_chunk)
                chunks.append(self._create_chunk_metadata(chunk_text))
                current_chunk = [paragraph]
                current_length = para_length
            else:
                current_chunk.append(paragraph)
                current_length += para_length
                
                # If we've reached target length, create chunk
                if current_length >= target_length:
                    chunk_text = '\n\n'.join(current_chunk)
                    chunks.append(self._create_chunk_metadata(chunk_text))
                    current_chunk = []
                    current_length = 0
        
        # Add remaining text as final chunk
        if current_chunk:
            chunk_text = '\n\n'.join(current_chunk)
            chunks.append(self._create_chunk_metadata(chunk_text))
        
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common PDF extraction issues
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Fix missing spaces
        text = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', text)  # Fix hyphenated words
        
        # Remove page markers and headers/footers
        text = re.sub(r'--- Page \d+ ---', '', text)
        text = re.sub(r'\[No text found on this page\]', '', text)
        
        return text.strip()
    
    def _split_paragraphs(self, text: str) -> List[str]:
        """Split text into meaningful paragraphs"""
        # Split on double newlines or paragraph indicators
        paragraphs = re.split(self.paragraph_breaks, text)
        
        # Further split very long paragraphs
        processed = []
        for para in paragraphs:
            para = para.strip()
            if len(para) > 1000:  # Very long paragraph
                sentences = re.split(self.sentence_endings, para)
                current_group = []
                current_length = 0
                
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    
                    if current_length + len(sentence) > 500 and current_group:
                        processed.append('. '.join(current_group) + '.')
                        current_group = [sentence]
                        current_length = len(sentence)
                    else:
                        current_group.append(sentence)
                        current_length += len(sentence)
                
                if current_group:
                    processed.append('. '.join(current_group) + '.')
            else:
                if para:
                    processed.append(para)
        
        return processed
    
    def _split_long_paragraph(self, paragraph: str, max_length: int) -> List[Dict]:
        """Split a long paragraph into smaller chunks"""
        sentences = re.split(self.sentence_endings, paragraph)
        chunks = []
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            sentence_length = len(sentence)
            
            if current_length + sentence_length > max_length and current_chunk:
                chunk_text = '. '.join(current_chunk) + '.'
                chunks.append(self._create_chunk_metadata(chunk_text))
                current_chunk = [sentence]
                current_length = sentence_length
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        if current_chunk:
            chunk_text = '. '.join(current_chunk) + '.'
            chunks.append(self._create_chunk_metadata(chunk_text))
        
        return chunks
    
    def _create_chunk_metadata(self, text: str) -> Dict:
        """Create metadata for a text chunk"""
        word_count = len(text.split())
        char_count = len(text)
        
        # Estimate difficulty based on word length and complexity
        avg_word_length = char_count / word_count if word_count > 0 else 0
        complexity_indicators = len(re.findall(r'[;:,()]', text))
        
        if avg_word_length > 6 or complexity_indicators > word_count * 0.1:
            difficulty = 'hard'
        elif avg_word_length > 4 or complexity_indicators > word_count * 0.05:
            difficulty = 'medium'
        else:
            difficulty = 'easy'
        
        # Estimate typing time (assuming 40 WPM average)
        estimated_time = max(1, word_count / 40 * 60)  # in seconds
        
        return {
            'text': text,
            'word_count': word_count,
            'char_count': char_count,
            'difficulty': difficulty,
            'estimated_time': int(estimated_time)
        }
EOF

# Create utils __init__.py
cat > backend/utils/__init__.py << 'EOF'
from .logging_config import setup_logging, get_logger
from .error_handlers import register_error_handlers
from .validators import FileValidator, validate_pdf_upload, validate_stats_data
from .decorators import handle_errors, rate_limit
from .cache import pdf_cache, cache_pdf_extraction
from .text_processor import TextProcessor

__all__ = [
    'setup_logging', 'get_logger', 'register_error_handlers',
    'FileValidator', 'validate_pdf_upload', 'validate_stats_data',
    'handle_errors', 'rate_limit', 'pdf_cache', 'cache_pdf_extraction',
    'TextProcessor'
]
EOF

print_success "Utility modules created"

print_status "Creating enhanced PDF service..."

# Create enhanced PDF service
cat > backend/services/pdf_service.py << 'EOF'
import PyPDF2
import time
import os
import traceback
from typing import List, Dict, Optional
from utils.logging_config import get_logger
from utils.text_processor import TextProcessor
from utils.cache import cache_pdf_extraction

class EnhancedPDFParser:
    """Enhanced PDF parser with better error handling and caching"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.logger = get_logger(__name__)
        self.text_processor = TextProcessor()
        self.metadata = {}
        self.processing_time = 0
        
        # Validate file
        self._validate_file()
    
    def _validate_file(self):
        """Validate PDF file before processing"""
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"PDF file not found: {self.file_path}")
        
        if not os.access(self.file_path, os.R_OK):
            raise PermissionError(f"PDF file is not readable: {self.file_path}")
        
        # Check PDF header
        try:
            with open(self.file_path, 'rb') as f:
                header = f.read(5)
                if header != b'%PDF-':
                    raise ValueError(f"Invalid PDF file: {self.file_path}")
        except Exception as e:
            raise ValueError(f"Error validating PDF: {e}")
    
    @cache_pdf_extraction
    def extract_text(self) -> Dict:
        """Extract text with caching and timing"""
        start_time = time.time()
        
        try:
            self.logger.info(f"Extracting text from PDF: {self.file_path}")
            
            with open(self.file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                
                # Extract metadata
                self.metadata = {
                    'pages': len(reader.pages),
                    'title': 'Unknown',
                    'author': 'Unknown',
                    'parser_used': 'PyPDF2'
                }
                
                # Try to get metadata
                if reader.metadata:
                    self.metadata.update({
                        'title': reader.metadata.get('/Title', 'Unknown'),
                        'author': reader.metadata.get('/Author', 'Unknown')
                    })
                
                # Extract text from pages
                pages_text = []
                failed_pages = []
                
                for page_num, page in enumerate(reader.pages):
                    try:
                        text = page.extract_text()
                        if text and text.strip():
                            pages_text.append({
                                'page': page_num + 1,
                                'text': text.strip(),
                                'char_count': len(text)
                            })
                        else:
                            self.logger.warning(f"No text on page {page_num + 1}")
                    except Exception as e:
                        failed_pages.append(page_num + 1)
                        self.logger.error(f"Failed to extract page {page_num + 1}: {e}")
                
                self.processing_time = time.time() - start_time
                
                result = {
                    'pages_text': pages_text,
                    'failed_pages': failed_pages,
                    'metadata': self.metadata,
                    'processing_time': self.processing_time
                }
                
                self.logger.info(f"Extracted {len(pages_text)} pages in {self.processing_time:.2f}s")
                return result
                
        except PyPDF2.errors.PdfReadError as e:
            raise ValueError(f"PDF read error: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            raise ValueError(f"Error processing PDF: {e}")
    
    def create_study_items(self, extracted_data: Dict) -> List[Dict]:
        """Create optimized study items"""
        if not extracted_data['pages_text']:
            return [{
                'id': 'pdf-error-1',
                'prompt': 'No text could be extracted from this PDF',
                'content': 'This PDF may be image-based or password protected. Try a different file or copy/paste text directly.',
                'type': 'text',
                'context': 'PDF Processing Error'
            }]
        
        # Combine all text
        all_text = "\n\n".join([page['text'] for page in extracted_data['pages_text']])
        
        # Create smart chunks
        chunks = self.text_processor.create_smart_chunks(all_text)
        
        # Convert to study items
        items = []
        for i, chunk in enumerate(chunks):
            items.append({
                'id': f'pdf-item-{i+1}',
                'prompt': f'Type this text from the PDF (section {i+1}/{len(chunks)}):',
                'content': chunk['text'],
                'type': 'text',
                'context': f'PDF Section {i+1}',
                'difficulty': chunk.get('difficulty', 'medium'),
                'word_count': chunk.get('word_count', 0),
                'estimated_time': chunk.get('estimated_time', 0),
                'metadata': {
                    'source': 'pdf',
                    'total_sections': len(chunks),
                    'pdf_title': extracted_data['metadata'].get('title', 'Unknown')
                }
            })
        
        self.logger.info(f"Created {len(items)} study items")
        return items
    
    def extract_items(self) -> List[Dict]:
        """Main method to extract study items from PDF"""
        try:
            extracted_data = self.extract_text()
            return self.create_study_items(extracted_data)
        except Exception as e:
            self.logger.error(f"Error in extract_items: {e}")
            return [{
                'id': 'pdf-error-1',
                'prompt': 'Error processing PDF:',
                'content': f"Error: {str(e)}. Please try a different file.",
                'type': 'text',
                'context': 'PDF Processing Error'
            }]

class PDFService:
    """Service class for handling PDF operations"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
    
    def process_upload(self, file) -> Dict:
        """Process uploaded PDF file"""
        start_time = time.time()
        
        try:
            # Save file temporarily
            temp_path = os.path.join('uploads', file.filename)
            file.save(temp_path)
            
            # Process with enhanced parser
            parser = EnhancedPDFParser(temp_path)
            items = parser.extract_items()
            
            processing_time = time.time() - start_time
            
            # Clean up temporary file
            try:
                os.remove(temp_path)
            except OSError:
                self.logger.warning(f"Could not remove temp file: {temp_path}")
            
            return {
                'success': True,
                'items': items,
                'processing_time': processing_time,
                'item_count': len(items),
                'metadata': getattr(parser, 'metadata', {})
            }
            
        except Exception as e:
            # Clean up on error
            try:
                if 'temp_path' in locals():
                    os.remove(temp_path)
            except OSError:
                pass
            
            self.logger.error(f"Error processing upload: {e}")
            raise

def get_pdf_support_status():
    """Get PDF support status"""
    try:
        import PyPDF2
        return {
            'pymupdf_available': False,
            'pypdf2_available': True,
            'pdf_support': True,
            'version': PyPDF2.__version__,
            'message': f'PDF support available using PyPDF2 v{PyPDF2.__version__}'
        }
    except ImportError:
        return {
            'pymupdf_available': False,
            'pypdf2_available': False,
            'pdf_support': False,
            'message': 'PyPDF2 not available'
        }
EOF

# Create services __init__.py
cat > backend/services/__init__.py << 'EOF'
from .pdf_service import PDFService, EnhancedPDFParser, get_pdf_support_status
from .stats_service import StatsService

__all__ = ['PDFService', 'EnhancedPDFParser', 'get_pdf_support_status', 'StatsService']
EOF

print_success "Enhanced PDF service created"

print_status "Creating statistics service..."

# Create statistics service
cat > backend/services/stats_service.py << 'EOF'
import json
import os
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from utils.logging_config import get_logger

class StatsService:
    """Service for handling user statistics"""
    
    def __init__(self, stats_file: str):
        self.stats_file = stats_file
        self.logger = get_logger(__name__)
        self._ensure_stats_file()
    
    def _ensure_stats_file(self):
        """Ensure stats file exists with default values"""
        if not os.path.exists(self.stats_file):
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.stats_file), exist_ok=True)
            
            default_stats = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": [],
                "personalBest": {
                    "wpm": 0,
                    "accuracy": 0,
                    "date": None
                },
                "weeklyStats": [],
                "createdAt": datetime.now().isoformat()
            }
            
            self._write_stats(default_stats)
            self.logger.info("Created new stats file with defaults")
    
    def _read_stats(self) -> Dict:
        """Read stats from file with error handling"""
        try:
            with open(self.stats_file, 'r', encoding='utf-8') as f:
                stats = json.load(f)
                
            # Ensure all required fields exist
            defaults = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": [],
                "personalBest": {"wpm": 0, "accuracy": 0, "date": None},
                "weeklyStats": []
            }
            
            for key, default_value in defaults.items():
                if key not in stats:
                    stats[key] = default_value
            
            return stats
            
        except (json.JSONDecodeError, FileNotFoundError) as e:
            self.logger.error(f"Error reading stats file: {e}")
            # Return default stats if file is corrupted
            return {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": [],
                "personalBest": {"wpm": 0, "accuracy": 0, "date": None},
                "weeklyStats": []
            }
    
    def _write_stats(self, stats: Dict):
        """Write stats to file with error handling"""
        try:
            # Create backup
            if os.path.exists(self.stats_file):
                backup_file = f"{self.stats_file}.backup"
                with open(self.stats_file, 'r') as original:
                    with open(backup_file, 'w') as backup:
                        backup.write(original.read())
            
            # Write new stats
            with open(self.stats_file, 'w', encoding='utf-8') as f:
                json.dump(stats, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            self.logger.error(f"Error writing stats: {e}")
            raise
    
    def get_stats(self) -> Dict:
        """Get current user statistics"""
        return self._read_stats()
    
    def save_session(self, session_data: Dict) -> Dict:
        """Save a typing session and update statistics"""
        try:
            stats = self._read_stats()
            
            # Validate session data
            wpm = int(session_data['wpm'])
            accuracy = int(session_data['accuracy'])
            duration = float(session_data['duration'])
            
            # Create session record
            session_record = {
                'date': session_data.get('timestamp', datetime.now().isoformat()),
                'duration': self._format_duration(duration),
                'wpm': wpm,
                'accuracy': accuracy,
                'mode': session_data.get('itemType', 'Practice'),
                'difficulty': session_data.get('difficulty', 'medium'),
                'word_count': session_data.get('word_count', 0)
            }
            
            # Update recent sessions (keep last 10)
            stats['recentSessions'].insert(0, session_record)
            stats['recentSessions'] = stats['recentSessions'][:10]
            
            # Update totals
            stats['totalSessions'] += 1
            total_sessions = stats['totalSessions']
            
            # Update averages using proper weighted calculation
            if stats['averageWpm'] == 0:
                stats['averageWpm'] = wpm
            else:
                total_wpm = (stats['averageWpm'] * (total_sessions - 1)) + wpm
                stats['averageWpm'] = round(total_wpm / total_sessions)
            
            if stats['accuracy'] == 0:
                stats['accuracy'] = accuracy
            else:
                total_accuracy = (stats['accuracy'] * (total_sessions - 1)) + accuracy
                stats['accuracy'] = round(total_accuracy / total_sessions)
            
            # Update practice time
            minutes_practiced = math.ceil(duration / 60)
            stats['practiceMinutes'] += minutes_practiced
            
            # Update personal bests
            if wpm > stats['personalBest']['wpm']:
                stats['personalBest']['wpm'] = wpm
                stats['personalBest']['date'] = session_record['date']
            
            if accuracy > stats['personalBest']['accuracy']:
                stats['personalBest']['accuracy'] = accuracy
                if stats['personalBest']['date'] is None:
                    stats['personalBest']['date'] = session_record['date']
            
            # Update streak
            self._update_streak(stats, session_record['date'])
            
            # Update weekly stats
            self._update_weekly_stats(stats, session_record)
            
            # Save updated stats
            self._write_stats(stats)
            
            self.logger.info(f"Session saved: {wpm} WPM, {accuracy}% accuracy")
            
            return {
                'success': True,
                'message': 'Statistics saved successfully',
                'updated_stats': stats,
                'session_summary': {
                    'improvement': self._calculate_improvement(stats, wpm, accuracy),
                    'personal_best': wpm >= stats['personalBest']['wpm'],
                    'streak_updated': True
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error saving session: {e}")
            raise
    
    def _update_streak(self, stats: Dict, session_date: str):
        """Update the user's typing streak"""
        try:
            today = datetime.fromisoformat(session_date[:10]).date()
            last_session_date = stats.get('lastSessionDate')
            
            if last_session_date:
                last_date = datetime.fromisoformat(last_session_date).date()
                days_difference = (today - last_date).days
                
                if days_difference == 0:
                    # Same day, keep streak
                    pass
                elif days_difference == 1:
                    # Consecutive day, increment streak
                    stats['currentStreak'] += 1
                else:
                    # Gap in days, reset streak
                    stats['currentStreak'] = 1
            else:
                # First session
                stats['currentStreak'] = 1
            
            stats['lastSessionDate'] = today.isoformat()
            
        except Exception as e:
            self.logger.error(f"Error updating streak: {e}")
            stats['currentStreak'] = 1
            stats['lastSessionDate'] = datetime.now().date().isoformat()
    
    def _update_weekly_stats(self, stats: Dict, session: Dict):
        """Update weekly statistics"""
        try:
            # Get current week
            session_date = datetime.fromisoformat(session['date'][:10])
            week_start = session_date - timedelta(days=session_date.weekday())
            week_key = week_start.strftime('%Y-%m-%d')
            
            # Find or create week entry
            week_stats = None
            for week in stats['weeklyStats']:
                if week['week_start'] == week_key:
                    week_stats = week
                    break
            
            if not week_stats:
                week_stats = {
                    'week_start': week_key,
                    'sessions': 0,
                    'total_time': 0,
                    'best_wpm': 0,
                    'best_accuracy': 0,
                    'total_words': 0
                }
                stats['weeklyStats'].append(week_stats)
            
            # Update week stats
            week_stats['sessions'] += 1
            week_stats['total_time'] += session.get('word_count', 0) / max(session['wpm'], 1) * 60
            week_stats['best_wpm'] = max(week_stats['best_wpm'], session['wpm'])
            week_stats['best_accuracy'] = max(week_stats['best_accuracy'], session['accuracy'])
            week_stats['total_words'] += session.get('word_count', 0)
            
            # Keep only last 12 weeks
            stats['weeklyStats'] = sorted(stats['weeklyStats'], 
                                        key=lambda x: x['week_start'])[-12:]
            
        except Exception as e:
            self.logger.error(f"Error updating weekly stats: {e}")
    
    def _calculate_improvement(self, stats: Dict, current_wpm: int, current_accuracy: int) -> Dict:
        """Calculate improvement metrics"""
        recent_sessions = stats['recentSessions']
        
        if len(recent_sessions) < 2:
            return {'wpm_change': 0, 'accuracy_change': 0, 'trend': 'stable'}
        
        # Compare with average of last 3 sessions (excluding current)
        recent_wpm = sum(s['wpm'] for s in recent_sessions[1:4]) / min(3, len(recent_sessions) - 1)
        recent_accuracy = sum(s['accuracy'] for s in recent_sessions[1:4]) / min(3, len(recent_sessions) - 1)
        
        wpm_change = current_wpm - recent_wpm
        accuracy_change = current_accuracy - recent_accuracy
        
        if wpm_change > 2 or accuracy_change > 2:
            trend = 'improving'
        elif wpm_change < -2 or accuracy_change < -2:
            trend = 'declining'
        else:
            trend = 'stable'
        
        return {
            'wpm_change': round(wpm_change, 1),
            'accuracy_change': round(accuracy_change, 1),
            'trend': trend
        }
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration in a human-readable way"""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    
    def reset_stats(self, new_stats: Optional[Dict] = None) -> Dict:
        """Reset statistics to default or provided values"""
        if new_stats is None:
            new_stats = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": [],
                "personalBest": {"wpm": 0, "accuracy": 0, "date": None},
                "weeklyStats": []
            }
        
        self._write_stats(new_stats)
        self.logger.info("Statistics reset successfully")
        return new_stats
    
    def get_debug_info(self) -> Dict:
        """Get debug information about stats file"""
        info = {
            'stats_file_path': self.stats_file,
            'stats_file_exists': os.path.exists(self.stats_file),
            'stats_file_size': 0,
            'stats_file_readable': False,
            'stats_file_writable': False,
            'backup_exists': False
        }
        
        if os.path.exists(self.stats_file):
            try:
                stat = os.stat(self.stats_file)
                info['stats_file_size'] = stat.st_size
                info['stats_file_readable'] = os.access(self.stats_file, os.R_OK)
                info['stats_file_writable'] = os.access(self.stats_file, os.W_OK)
                info['last_modified'] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            except OSError as e:
                info['error'] = str(e)
        
        backup_file = f"{self.stats_file}.backup"
        info['backup_exists'] = os.path.exists(backup_file)
        
        return info
EOF

print_success "Statistics service created"

print_status "Creating modular routes..."

# Create PDF routes
cat > backend/routes/pdf_routes.py << 'EOF'
from flask import Blueprint, request, jsonify
from services.pdf_service import PDFService, get_pdf_support_status
from utils.validators import validate_pdf_upload
from utils.decorators import handle_errors, rate_limit

pdf_bp = Blueprint('pdf', __name__)

@pdf_bp.route('/pdf-support', methods=['GET'])
def get_support_info():
    """Get PDF parser support information"""
    return jsonify(get_pdf_support_status())

@pdf_bp.route('/upload-pdf', methods=['POST'])
@rate_limit(max_requests=5, time_window=60)  # 5 uploads per minute
@handle_errors
def upload_pdf():
    """Upload and process a PDF file"""
    # Validate request
    validation_result = validate_pdf_upload(request)
    if not validation_result['valid']:
        return jsonify({
            'error': 'Validation failed',
            'message': validation_result.get('message', 'Invalid file upload'),
            'details': validation_result.get('errors', [])
        }), 400
    
    # Process PDF
    pdf_service = PDFService()
    result = pdf_service.process_upload(request.files['file'])
    
    return jsonify(result)

@pdf_bp.route('/process-text', methods=['POST'])
@rate_limit()
@handle_errors
def process_text():
    """Process text input for typing practice"""
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text'].strip()
    if not text:
        return jsonify({'error': 'Empty text provided'}), 400
    
    if len(text) > 10000:  # Limit text length
        return jsonify({'error': 'Text too long. Maximum 10,000 characters allowed.'}), 400
    
    # Create study item
    items = [{
        'id': 'custom-text-1',
        'prompt': 'Type this custom text:',
        'content': text,
        'type': 'text',
        'context': 'Custom Text',
        'word_count': len(text.split()),
        'estimated_time': max(30, len(text.split()) / 40 * 60)  # Estimate based on 40 WPM
    }]
    
    return jsonify({
        'success': True,
        'items': items,
        'item_count': len(items)
    })
EOF

# Create stats routes
cat > backend/routes/stats_routes.py << 'EOF'
from flask import Blueprint, request, jsonify, current_app
from services.stats_service import StatsService
from utils.validators import validate_stats_data
from utils.decorators import handle_errors, rate_limit

stats_bp = Blueprint('stats', __name__)

def get_stats_service():
    """Get stats service instance"""
    stats_file = current_app.config['STATS_FILE']
    return StatsService(stats_file)

@stats_bp.route('/stats', methods=['GET'])
@handle_errors
def get_stats():
    """Get user statistics"""
    stats_service = get_stats_service()
    stats = stats_service.get_stats()
    return jsonify(stats)

@stats_bp.route('/save-stats', methods=['POST'])
@rate_limit(max_requests=30, time_window=60)  # 30 saves per minute
@handle_errors
def save_stats():
    """Save typing session statistics"""
    data = request.get_json()
    
    # Validate input
    validation_result = validate_stats_data(data)
    if not validation_result['valid']:
        return jsonify({
            'error': 'Validation failed',
            'message': 'Invalid statistics data',
            'details': validation_result['errors']
        }), 400
    
    # Save session
    stats_service = get_stats_service()
    result = stats_service.save_session(data)
    
    return jsonify(result)

@stats_bp.route('/reset-stats', methods=['POST'])
@handle_errors
def reset_stats():
    """Reset user statistics"""
    data = request.get_json() or {}
    
    stats_service = get_stats_service()
    reset_stats = stats_service.reset_stats(data if data else None)
    
    return jsonify({
        'success': True,
        'message': 'Statistics reset successfully',
        'stats': reset_stats
    })

@stats_bp.route('/debug-stats', methods=['GET'])
@handle_errors
def debug_stats():
    """Get debug information about statistics"""
    stats_service = get_stats_service()
    debug_info = stats_service.get_debug_info()
    
    # Add current stats
    try:
        debug_info['current_stats'] = stats_service.get_stats()
        debug_info['stats_valid'] = True
    except Exception as e:
        debug_info['stats_valid'] = False
        debug_info['stats_error'] = str(e)
    
    return jsonify(debug_info)
EOF

# Create health routes
cat > backend/routes/health_routes.py << 'EOF'
from flask import Blueprint, jsonify, current_app
import psutil
import os
from datetime import datetime
from utils.decorators import handle_errors

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
@handle_errors
def health_check():
    """Comprehensive health check endpoint"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        
        # Directory checks
        upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        cache_dir = current_app.config.get('CACHE_DIR', 'cache')
        log_dir = current_app.config.get('LOG_DIR', 'logs')
        
        directories = {
            'uploads': {
                'exists': os.path.exists(upload_dir),
                'writable': os.access(upload_dir, os.W_OK) if os.path.exists(upload_dir) else False,
                'path': upload_dir
            },
            'cache': {
                'exists': os.path.exists(cache_dir),
                'writable': os.access(cache_dir, os.W_OK) if os.path.exists(cache_dir) else False,
                'path': cache_dir
            },
            'logs': {
                'exists': os.path.exists(log_dir),
                'writable': os.access(log_dir, os.W_OK) if os.path.exists(log_dir) else False,
                'path': log_dir
            }
        }
        
        # Service checks
        services = {
            'pdf_parser': True,  # PyPDF2 should be available
            'stats_service': True,
            'cache_system': os.path.exists(cache_dir)
        }
        
        # Overall health
        all_dirs_ok = all(d['exists'] and d['writable'] for d in directories.values())
        system_ok = cpu_percent < 90 and memory.percent < 90
        overall_status = 'healthy' if all_dirs_ok and system_ok else 'degraded'
        
        return jsonify({
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat(),
            'system': {
                'cpu_percent': round(cpu_percent, 1),
                'memory_percent': round(memory.percent, 1),
                'disk_percent': round((disk.used / disk.total) * 100, 1),
                'available_memory_mb': round(memory.available / (1024 * 1024))
            },
            'directories': directories,
            'services': services,
            'config': {
                'debug_mode': current_app.debug,
                'max_content_length': current_app.config.get('MAX_CONTENT_LENGTH'),
                'upload_folder': current_app.config.get('UPLOAD_FOLDER')
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500

@health_bp.route('/debug-info', methods=['GET'])
@handle_errors
def debug_info():
    """Extended debug information"""
    import sys
    import platform
    
    try:
        info = {
            'python_version': sys.version,
            'platform': platform.platform(),
            'architecture': platform.architecture(),
            'processor': platform.processor(),
            'current_working_directory': os.getcwd(),
            'environment_variables': {
                'FLASK_ENV': os.environ.get('FLASK_ENV', 'not set'),
                'FLASK_DEBUG': os.environ.get('FLASK_DEBUG', 'not set')
            },
            'installed_packages': {}
        }
        
        # Check key packages
        packages_to_check = ['flask', 'PyPDF2', 'psutil', 'python-magic']
        for package in packages_to_check:
            try:
                module = __import__(package.replace('-', '_'))
                info['installed_packages'][package] = {
                    'available': True,
                    'version': getattr(module, '__version__', 'unknown')
                }
            except ImportError:
                info['installed_packages'][package] = {
                    'available': False,
                    'version': None
                }
        
        return jsonify(info)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Error gathering debug information'
        }), 500
EOF

# Create routes __init__.py
cat > backend/routes/__init__.py << 'EOF'
from .pdf_routes import pdf_bp
from .stats_routes import stats_bp
from .health_routes import health_bp

def register_routes(app):
    """Register all route blueprints"""
    app.register_blueprint(pdf_bp, url_prefix='/api')
    app.register_blueprint(stats_bp, url_prefix='/api')
    app.register_blueprint(health_bp, url_prefix='/api')

__all__ = ['register_routes', 'pdf_bp', 'stats_bp', 'health_bp']
EOF

print_success "Modular routes created"

print_status "Creating new main application file..."

# Backup original app.py
mv backend/app.py backend/app_original.py

# Create new app.py
cat > backend/app.py << 'EOF'
import os
import sys
from flask import Flask, send_from_directory
from flask_cors import CORS

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.config import DevelopmentConfig, ProductionConfig, TestingConfig
from routes import register_routes
from utils.logging_config import setup_logging
from utils.error_handlers import register_error_handlers

def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__, static_folder='../frontend/dist')
    
    # Determine configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    if config_name == 'production':
        app.config.from_object(ProductionConfig)
    elif config_name == 'testing':
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(DevelopmentConfig)
    
    # Setup CORS
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000"
    ]
    
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    
    # Setup logging
    setup_logging(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register routes
    register_routes(app)
    
    # Create necessary directories
    _create_directories(app)
    
    # Serve static files (frontend)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path != "" and os.path.exists(app.static_folder + '/' + path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    app.logger.info(f'TypeTutor backend initialized in {config_name} mode')
    return app

def _create_directories(app):
    """Create necessary directories with proper permissions"""
    directories = [
        app.config.get('UPLOAD_FOLDER', 'uploads'),
        os.path.dirname(app.config.get('STATS_FILE', 'data/user_stats.json')),
        app.config.get('CACHE_DIR', 'cache'),
        app.config.get('LOG_DIR', 'logs')
    ]
    
    for directory in directories:
        if directory and not os.path.exists(directory):
            try:
                os.makedirs(directory, exist_ok=True)
                app.logger.info(f'Created directory: {directory}')
            except OSError as e:
                app.logger.error(f'Failed to create directory {directory}: {e}')
                raise

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    debug = app.config.get('DEBUG', False)
    
    app.run(debug=debug, host='0.0.0.0', port=port)
EOF

print_success "New main application file created"

print_status "Creating test framework..."

# Create pytest configuration
cat > pytest.ini << 'EOF'
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --cov=backend --cov-report=html --cov-report=term-missing --cov-report=xml
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
EOF

# Create test configuration
cat > tests/conftest.py << 'EOF'
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
EOF

# Create unit tests
cat > tests/unit/test_pdf_service.py << 'EOF'
import pytest
import os
from unittest.mock import Mock, patch
from backend.services.pdf_service import PDFService, EnhancedPDFParser

class TestEnhancedPDFParser:
    def test_parser_initialization_with_invalid_file(self):
        """Test parser initialization with non-existent file"""
        with pytest.raises(FileNotFoundError):
            EnhancedPDFParser('nonexistent.pdf')
    
    @patch('backend.services.pdf_service.PyPDF2.PdfReader')
    def test_extract_text_success(self, mock_reader):
        """Test successful text extraction"""
        # Mock PDF reader
        mock_page = Mock()
        mock_page.extract_text.return_value = "Sample text from PDF"
        
        mock_reader_instance = Mock()
        mock_reader_instance.pages = [mock_page]
        mock_reader_instance.metadata = {'/Title': 'Test PDF', '/Author': 'Test Author'}
        mock_reader.return_value = mock_reader_instance
        
        # Create a temporary file for testing
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(b'%PDF-1.4\nTest content')
            temp_file_path = temp_file.name
        
        try:
            parser = EnhancedPDFParser(temp_file_path)
            result = parser.extract_text()
            
            assert 'pages_text' in result
            assert 'metadata' in result
            assert len(result['pages_text']) == 1
            assert result['pages_text'][0]['text'] == "Sample text from PDF"
        finally:
            os.unlink(temp_file_path)
    
    def test_create_study_items_with_empty_data(self):
        """Test study item creation with no extracted text"""
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(b'%PDF-1.4\nTest content')
            temp_file_path = temp_file.name
        
        try:
            parser = EnhancedPDFParser(temp_file_path)
            extracted_data = {'pages_text': [], 'failed_pages': [], 'metadata': {}}
            items = parser.create_study_items(extracted_data)
            
            assert len(items) == 1
            assert 'error' in items[0]['id']
        finally:
            os.unlink(temp_file_path)

class TestPDFService:
    def test_pdf_service_initialization(self):
        """Test PDF service can be initialized"""
        service = PDFService()
        assert service is not None
    
    @patch('backend.services.pdf_service.EnhancedPDFParser')
    def test_process_upload_success(self, mock_parser_class):
        """Test successful PDF upload processing"""
        # Mock file
        mock_file = Mock()
        mock_file.filename = 'test.pdf'
        mock_file.save = Mock()
        
        # Mock parser
        mock_parser = Mock()
        mock_parser.extract_items.return_value = [
            {'id': 'test-1', 'content': 'Test content', 'type': 'text'}
        ]
        mock_parser_class.return_value = mock_parser
        
        service = PDFService()
        
        with patch('os.remove'):
            result = service.process_upload(mock_file)
        
        assert result['success'] is True
        assert 'items' in result
        assert len(result['items']) == 1
EOF

# Create integration tests
cat > tests/integration/test_api_endpoints.py << 'EOF'
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
EOF

# Create performance tests
cat > tests/test_performance.py << 'EOF'
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
EOF

print_success "Test framework created"

print_status "Creating Docker configuration..."

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/

# Create necessary directories
RUN mkdir -p uploads data logs cache

# Set environment variables
ENV FLASK_APP=backend/app.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "backend.app:create_app()"]
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  typetutor:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=your-secret-key-here
    volumes:
      - ./uploads:/app/uploads
      - ./data:/app/data
      - ./logs:/app/logs
      - ./cache:/app/cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add a reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - typetutor
    restart: unless-stopped
EOF

# Create nginx configuration
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream typetutor {
        server typetutor:5000;
    }

    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # File upload size limit
        client_max_body_size 16M;

        location / {
            proxy_pass http://typetutor;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://typetutor/api/health;
        }
    }
}
EOF

print_success "Docker configuration created"

print_status "Creating environment configuration..."

# Create .env.example
cat > .env.example << 'EOF'
# TypeTutor Backend Configuration

# Flask Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=development
FLASK_DEBUG=1

# File Upload Settings
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216

# Storage Paths
STATS_FILE=data/user_stats.json
CACHE_DIR=cache
LOG_DIR=logs

# Rate Limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60

# Production Settings (uncomment for production)
# SECRET_KEY=your-production-secret-key
# FLASK_ENV=production
# FLASK_DEBUG=0
EOF

# Create .env file from template
cp .env.example .env

print_success "Environment configuration created"

print_status "Creating development tools configuration..."

# Create .gitignore additions
cat >> .gitignore << 'EOF'

# Backend improvements
backend_backup/
backend/__pycache__/
backend/*/__pycache__/
backend/*/*/__pycache__/
*.pyc
*.pyo
*.pyd
__pycache__/
*.so
.coverage
htmlcov/
.pytest_cache/
.cache
logs/
cache/
*.log

# Environment
.env
.env.local
.env.production

# Test files
tests/uploads/
tests/cache/
tests/logs/
test_stats.json

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOF

# Create pre-commit configuration
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/psf/black
    rev: 23.7.0
    hooks:
      - id: black
        language_version: python3
        files: backend/.*\.py$

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
        files: backend/.*\.py$
        args: [--max-line-length=88, --extend-ignore=E203,W503]

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-json
EOF

# Create Makefile for common tasks
cat > Makefile << 'EOF'
.PHONY: help install test lint format run clean docker-build docker-run

# Default target
help:
	@echo "TypeTutor Backend - Available commands:"
	@echo "  install     - Install dependencies"
	@echo "  test        - Run tests"
	@echo "  lint        - Run linting"
	@echo "  format      - Format code"
	@echo "  run         - Run development server"
	@echo "  clean       - Clean temporary files"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run  - Run with Docker Compose"

# Install dependencies
install:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt

# Run tests
test:
	pytest

# Run tests with coverage
test-coverage:
	pytest --cov=backend --cov-report=html --cov-report=term

# Lint code
lint:
	flake8 backend/
	black --check backend/

# Format code
format:
	black backend/

# Run development server
run:
	python backend/app.py

# Clean temporary files
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf cache/
	rm -f logs/*.log

# Docker commands
docker-build:
	docker build -t typetutor-backend .

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

# Development setup
dev-setup: install
	pre-commit install
	mkdir -p uploads data logs cache
	@echo "Development environment ready!"
EOF

print_success "Development tools configured"

print_status "Creating updated run script..."

# Create improved run script
cat > run_improved.sh << 'EOF'
#!/bin/bash

echo "TypeTutor Improved Backend Setup Script"
echo "======================================="

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_header() { echo -e "${PURPLE}[HEADER]${NC} $1"; }

# Check if improvements have been applied
if [ ! -d "backend/config" ]; then
    print_error "Backend improvements not found. Please run ./improve_backend.sh first."
    exit 1
fi

print_status "Setting up improved TypeTutor backend..."

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    print_success "Virtual environment activated"
else
    print_error "Virtual environment not found. Please run: python3 -m venv venv"
    exit 1
fi

# Install/update dependencies
print_status "Installing dependencies..."
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Create directories
print_status "Creating necessary directories..."
mkdir -p uploads data logs cache
mkdir -p frontend/dist  # Ensure frontend dist exists

# Set permissions
chmod 755 uploads data logs cache

# Run tests to verify everything works
print_status "Running tests to verify setup..."
if command -v pytest &> /dev/null; then
    pytest tests/ -v --tb=short
    if [ $? -eq 0 ]; then
        print_success "All tests passed!"
    else
        print_warning "Some tests failed, but continuing..."
    fi
else
    print_warning "pytest not available, skipping tests"
fi

# Start the improved backend
print_status "Starting improved TypeTutor backend..."

# Set environment
export FLASK_ENV=development
export FLASK_DEBUG=1

# Start backend
python backend/app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    print_success "Improved backend started successfully (PID: $BACKEND_PID)"
    print_success "Backend running at: http://localhost:5000"
    print_success "Health check: http://localhost:5000/api/health"
    print_success "Debug info: http://localhost:5000/api/debug-info"
else
    print_error "Backend failed to start"
    exit 1
fi

# Function to handle script termination
function cleanup {
    print_status "Shutting down backend..."
    kill $BACKEND_PID 2>/dev/null
    print_success "Backend shutdown complete"
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

print_header "TypeTutor Improved Backend is running!"
echo ""
echo "New Features:"
echo "- ✅ Modular architecture with separated concerns"
echo "- ✅ Enhanced error handling and logging"
echo "- ✅ Input validation and security improvements"
echo "- ✅ Caching system for better performance"
echo "- ✅ Rate limiting protection"
echo "- ✅ Comprehensive health monitoring"
echo "- ✅ Test framework with unit and integration tests"
echo "- ✅ Docker support for deployment"
echo ""
echo "Available endpoints:"
echo "- GET  /api/health        - Health check"
echo "- GET  /api/debug-info    - Debug information"
echo "- GET  /api/pdf-support   - PDF support status"
echo "- POST /api/upload-pdf    - Upload PDF file"
echo "- POST /api/process-text  - Process custom text"
echo "- GET  /api/stats         - Get statistics"
echo "- POST /api/save-stats    - Save session stats"
echo "- POST /api/reset-stats   - Reset statistics"
echo ""
print_warning "Press Ctrl+C to stop the server"

# Wait for user to press Ctrl+C
wait
EOF

chmod +x run_improved.sh

print_success "Improved run script created"

print_status "Creating migration verification..."

# Create verification script
cat > verify_improvements.py << 'EOF'
#!/usr/bin/env python3
"""
TypeTutor Backend Improvements Verification Script
This script verifies that all improvements have been properly implemented.
"""

import os
import sys
import importlib.util
import json

def check_file_exists(file_path, description):
    """Check if a file exists"""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} (NOT FOUND)")
        return False

def check_directory_exists(dir_path, description):
    """Check if a directory exists"""
    if os.path.exists(dir_path) and os.path.isdir(dir_path):
        print(f"✅ {description}: {dir_path}")
        return True
    else:
        print(f"❌ {description}: {dir_path} (NOT FOUND)")
        return False

def check_python_import(module_path, description):
    """Check if a Python module can be imported"""
    try:
        spec = importlib.util.spec_from_file_location("test_module", module_path)
        if spec is None:
            print(f"❌ {description}: Cannot create spec for {module_path}")
            return False
        
        module = importlib.util.module_from_spec(spec)
        sys.modules["test_module"] = module
        spec.loader.exec_module(module)
        print(f"✅ {description}: {module_path}")
        return True
    except Exception as e:
        print(f"❌ {description}: {module_path} - {str(e)}")
        return False

def main():
    print("TypeTutor Backend Improvements Verification")
    print("=" * 50)
    
    all_good = True
    
    # Check directory structure
    print("\n📁 Directory Structure:")
    directories = [
        ("backend/config", "Configuration directory"),
        ("backend/routes", "Routes directory"),
        ("backend/services", "Services directory"),
        ("backend/utils", "Utilities directory"),
        ("tests/unit", "Unit tests directory"),
        ("tests/integration", "Integration tests directory"),
        ("uploads", "Uploads directory"),
        ("data", "Data directory"),
        ("logs", "Logs directory"),
        ("cache", "Cache directory")
    ]
    
    for dir_path, description in directories:
        if not check_directory_exists(dir_path, description):
            all_good = False
    
    # Check configuration files
    print("\n⚙️ Configuration Files:")
    config_files = [
        ("backend/config/config.py", "Main configuration"),
        (".env", "Environment variables"),
        ("requirements.txt", "Python requirements"),
        ("requirements-dev.txt", "Development requirements"),
        ("pytest.ini", "Pytest configuration"),
        ("Dockerfile", "Docker configuration"),
        ("docker-compose.yml", "Docker Compose configuration")
    ]
    
    for file_path, description in config_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check core application files
    print("\n🐍 Core Application Files:")
    core_files = [
        ("backend/app.py", "Main application file"),
        ("backend/config/__init__.py", "Config module init"),
        ("backend/routes/__init__.py", "Routes module init"),
        ("backend/services/__init__.py", "Services module init"),
        ("backend/utils/__init__.py", "Utils module init")
    ]
    
    for file_path, description in core_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check service files
    print("\n🔧 Service Files:")
    service_files = [
        ("backend/services/pdf_service.py", "PDF service"),
        ("backend/services/stats_service.py", "Statistics service"),
        ("backend/routes/pdf_routes.py", "PDF routes"),
        ("backend/routes/stats_routes.py", "Statistics routes"),
        ("backend/routes/health_routes.py", "Health routes")
    ]
    
    for file_path, description in service_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check utility files
    print("\n🛠️ Utility Files:")
    utility_files = [
        ("backend/utils/logging_config.py", "Logging configuration"),
        ("backend/utils/error_handlers.py", "Error handlers"),
        ("backend/utils/validators.py", "Input validators"),
        ("backend/utils/decorators.py", "Decorators"),
        ("backend/utils/cache.py", "Cache utilities"),
        ("backend/utils/text_processor.py", "Text processor")
    ]
    
    for file_path, description in utility_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check test files
    print("\n🧪 Test Files:")
    test_files = [
        ("tests/conftest.py", "Test configuration"),
        ("tests/unit/test_pdf_service.py", "PDF service tests"),
        ("tests/integration/test_api_endpoints.py", "API endpoint tests"),
        ("tests/test_performance.py", "Performance tests")
    ]
    
    for file_path, description in test_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Try to import key modules
    print("\n🔍 Module Import Tests:")
    if os.path.exists("backend/app.py"):
        if not check_python_import("backend/app.py", "Main application"):
            all_good = False
    
    # Check if original app.py was backed up
    print("\n💾 Backup Verification:")
    if check_file_exists("backend_backup/app.py", "Original app.py backup"):
        print("  ℹ️  Original backend has been safely backed up")
    else:
        print("  ⚠️  Original backend backup not found")
    
    # Final result
    print("\n" + "=" * 50)
    if all_good:
        print("🎉 All improvements have been successfully implemented!")
        print("   Run './run_improved.sh' to start the enhanced backend")
    else:
        print("❌ Some improvements are missing or have issues")
        print("   Please re-run './improve_backend.sh' to fix any problems")
    
    return 0 if all_good else 1

if __name__ == "__main__":
    sys.exit(main())
EOF

chmod +x verify_improvements.py

print_success "Verification script created"

print_status "Running verification..."
python3 verify_improvements.py

print_header "TypeTutor Backend Improvement Complete!"
echo ""
echo "🎉 Backend improvements have been successfully implemented!"
echo ""
echo "What's New:"
echo "├── 🏗️  Modular Architecture"
echo "│   ├── Separated routes, services, and utilities"
echo "│   ├── Configuration management system"
echo "│   └── Better code organization"
echo "├── 🔒 Enhanced Security"
echo "│   ├── Input validation and sanitization"
echo "│   ├── Rate limiting protection"
echo "│   └── File upload security"
echo "├── ⚡ Performance Improvements"
echo "│   ├── Caching system for PDF processing"
echo "│   ├── Optimized text chunking algorithm"
echo "│   └── Better memory management"
echo "├── 📊 Enhanced Statistics"
echo "│   ├── Personal best tracking"
echo "│   ├── Weekly statistics"
echo "│   ├── Improvement trends"
echo "│   └── Better streak calculation"
echo "├── 🧪 Testing Framework"
echo "│   ├── Unit tests for all components"
echo "│   ├── Integration tests for API endpoints"
echo "│   ├── Performance tests"
echo "│   └── Automated test coverage"
echo "├── 📝 Better Logging & Monitoring"
echo "│   ├── Structured logging with rotation"
echo "│   ├── Health check endpoints"
echo "│   ├── Debug information API"
echo "│   └── Error tracking and reporting"
echo "├── 🐳 Docker Support"
echo "│   ├── Production-ready Dockerfile"
echo "│   ├── Docker Compose configuration"
echo "│   ├── Nginx reverse proxy setup"
echo "│   └── Health checks and monitoring"
echo "└── 🛠️ Development Tools"
echo "    ├── Pre-commit hooks for code quality"
echo "    ├── Makefile for common tasks"
echo "    ├── Environment configuration"
echo "    └── Code formatting and linting"
echo ""
echo "Next Steps:"
echo "1. 🧪 Run tests: 'make test' or 'pytest'"
echo "2. 🚀 Start improved backend: './run_improved.sh'"
echo "3. 🔍 Check health: 'curl http://localhost:5000/api/health'"
echo "4. 📊 View debug info: 'curl http://localhost:5000/api/debug-info'"
echo "5. 🐳 Deploy with Docker: 'make docker-build && make docker-run'"
echo ""
echo "Development Commands:"
echo "├── make install     - Install dependencies"
echo "├── make test        - Run all tests"
echo "├── make lint        - Check code quality"
echo "├── make format      - Format code"
echo "├── make run         - Start development server"
echo "├── make clean       - Clean temporary files"
echo "└── make dev-setup   - Complete development setup"
echo ""
echo "Files to Review:"
echo "├── 📖 README updates needed"
echo "├── ⚙️ .env - Configure environment variables"
echo "├── 🔧 backend/config/config.py - Application settings"
echo "├── 🧪 tests/ - Test your improvements"
echo "└── 📊 Check logs/ for application logs"
echo ""
echo "Backup Information:"
echo "├── Original backend saved to: backend_backup/"
echo "├── You can restore with: 'mv backend_backup/app.py backend/'"
echo "└── Remove backup when satisfied: 'rm -rf backend_backup/'"
echo ""
print_warning "Important Notes:"
echo "• Update your .env file with production secrets before deployment"
echo "• Review and customize the configuration in backend/config/config.py"
echo "• Install development dependencies: 'pip install -r requirements-dev.txt'"
echo "• Set up pre-commit hooks: 'pre-commit install'"
echo "• Test the improvements thoroughly before production deployment"
echo ""
print_success "Backend improvement script completed successfully!"
echo "Run './run_improved.sh' to start your enhanced TypeTutor backend!"
echo ""