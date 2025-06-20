import os
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
from werkzeug.utils import secure_filename
from typing import Dict, List, Any

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
    """Enhanced validation for statistics data with detailed error reporting"""
    required_fields = ['wpm', 'accuracy', 'duration']
    errors = []
    warnings = []
    
    if not data:
        return {'valid': False, 'errors': ['No data provided']}
    
    # Check for required fields
    for field in required_fields:
        if field not in data:
            errors.append(f'Missing required field: {field}')
    
    # If basic validation fails, return early
    if errors:
        return {'valid': False, 'errors': errors, 'warnings': warnings}
    
    # Enhanced validation with specific checks for common frontend issues
    try:
        # Validate WPM
        wpm_raw = data.get('wpm')
        if wpm_raw is None:
            errors.append('WPM is null or undefined')
        else:
            try:
                wpm = float(wpm_raw)
                if wpm < 0:
                    errors.append('WPM cannot be negative')
                elif wpm == 0:
                    warnings.append('WPM is 0 - this may indicate a timing issue in the frontend')
                elif wpm > 300:
                    warnings.append(f'WPM is very high ({wpm}) - please verify this is correct')
                elif wpm < 1 and wpm > 0:
                    warnings.append(f'WPM is very low ({wpm}) - this may indicate incorrect word counting')
            except (ValueError, TypeError):
                errors.append(f'WPM must be a number, got: {type(wpm_raw).__name__} ({wpm_raw})')
        
        # Validate Accuracy
        accuracy_raw = data.get('accuracy')
        if accuracy_raw is None:
            errors.append('Accuracy is null or undefined')
        else:
            try:
                accuracy = float(accuracy_raw)
                if accuracy < 0:
                    errors.append('Accuracy cannot be negative')
                elif accuracy > 100:
                    errors.append('Accuracy cannot exceed 100%')
                elif accuracy == 0:
                    warnings.append('Accuracy is 0% - this may indicate calculation issues')
            except (ValueError, TypeError):
                errors.append(f'Accuracy must be a number, got: {type(accuracy_raw).__name__} ({accuracy_raw})')
        
        # Validate Duration (this is the most critical for your issue)
        duration_raw = data.get('duration')
        if duration_raw is None:
            errors.append('Duration is null or undefined')
        else:
            try:
                duration = float(duration_raw)
                if duration < 0:
                    errors.append('Duration cannot be negative')
                elif duration == 0:
                    errors.append('Duration is 0 - this indicates the frontend timer is not working correctly')
                elif duration < 1:
                    warnings.append(f'Duration is very short ({duration}s) - this may cause display issues')
                elif duration > 3600:  # 1 hour
                    warnings.append(f'Duration is very long ({duration}s) - please verify this is correct')
            except (ValueError, TypeError):
                errors.append(f'Duration must be a number, got: {type(duration_raw).__name__} ({duration_raw})')
        
        # Additional helpful checks
        if 'timestamp' in data:
            timestamp = data.get('timestamp')
            if timestamp and isinstance(timestamp, str):
                try:
                    from datetime import datetime
                    datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except ValueError:
                    warnings.append('Timestamp format is invalid - using current time instead')
        
        # Check for common frontend data issues
        if 'totalCharacters' in data:
            total_chars = data.get('totalCharacters', 0)
            if isinstance(total_chars, (int, float)) and total_chars > 0:
                estimated_wpm = (total_chars / 5) / (float(data.get('duration', 1)) / 60)
                actual_wpm = float(data.get('wpm', 0))
                if abs(estimated_wpm - actual_wpm) > actual_wpm * 0.5:  # 50% difference
                    warnings.append(f'WPM calculation mismatch: estimated {estimated_wpm:.1f}, actual {actual_wpm}')
        
        # Check for itemType/mode
        item_type = data.get('itemType', data.get('mode', ''))
        if not item_type or item_type.strip() == '':
            warnings.append('No itemType/mode specified - will default to "Practice"')
    
    except Exception as e:
        errors.append(f'Unexpected error during validation: {str(e)}')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'data_summary': {
            'wpm': data.get('wpm'),
            'accuracy': data.get('accuracy'),
            'duration': data.get('duration'),
            'has_timestamp': 'timestamp' in data,
            'has_total_characters': 'totalCharacters' in data,
            'has_item_type': bool(data.get('itemType') or data.get('mode'))
        }
    }

def validate_session_data(data):
    """Validate session data for analytics (enhanced version)"""
    # Use the same enhanced validation as stats data
    return validate_stats_data(data)

def create_validation_report(data: Dict) -> str:
    """Create a detailed validation report for debugging"""
    lines = ["=== SESSION DATA VALIDATION REPORT ==="]
    
    if not data:
        lines.append("❌ No data provided")
        return "\n".join(lines)
    
    lines.append(f"📊 Data keys: {list(data.keys())}")
    
    # Check each important field
    for field, expected_type in [
        ('wpm', (int, float)),
        ('accuracy', (int, float)), 
        ('duration', (int, float)),
        ('timestamp', str),
        ('itemType', str),
        ('totalCharacters', (int, float))
    ]:
        value = data.get(field)
        if value is None:
            lines.append(f"⚠️  {field}: MISSING")
        elif not isinstance(value, expected_type):
            lines.append(f"❌ {field}: Wrong type - got {type(value).__name__}, expected {expected_type}")
        else:
            lines.append(f"✅ {field}: {value} ({type(value).__name__})")
    
    # Special duration analysis since this is the main issue
    duration = data.get('duration')
    if duration is not None:
        lines.append("\n=== DURATION ANALYSIS ===")
        try:
            dur_float = float(duration)
            if dur_float == 0:
                lines.append("🚨 CRITICAL: Duration is 0 - Frontend timer issue!")
                lines.append("   Check: startTime, endTime calculation in frontend")
                lines.append("   Check: Timer state management")
                lines.append("   Check: Session end triggering")
            elif dur_float < 1:
                lines.append(f"⚠️  Duration very short: {dur_float}s")
            else:
                minutes = int(dur_float // 60)
                seconds = int(dur_float % 60)
                lines.append(f"✅ Duration looks good: {dur_float}s = {minutes}m {seconds}s")
        except (ValueError, TypeError):
            lines.append(f"❌ Duration not convertible to float: {duration}")
    
    return "\n".join(lines)