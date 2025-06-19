import os
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
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
        if not MAGIC_AVAILABLE:
            return True
        try:  
            chunk = file.read(2048)
            file.seek(0)
            mime_type = magic.from_buffer(chunk, mime=True)
            return mime_type == 'application/pdf'
        except:
             return True
        
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
