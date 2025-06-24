# backend/utils/enhanced_validators.py
"""
Enhanced validation functions for TypeTutor API
Comprehensive validation for users, sessions, goals, and documents
"""

import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import uuid

def validate_user_data(data: Dict, update: bool = False) -> Dict:
    """Validate user profile data"""
    errors = []
    warnings = []
    
    if not data:
        return {'valid': False, 'errors': ['No data provided']}
    
    # Required fields for creation (not update)
    if not update:
        required_fields = ['id']
        for field in required_fields:
            if field not in data:
                errors.append(f'Missing required field: {field}')
    
    # Validate user ID format
    if 'id' in data:
        try:
            uuid.UUID(data['id'])
        except (ValueError, TypeError):
            errors.append('Invalid user ID format (must be UUID)')
    
    # Validate username
    if 'username' in data:
        username = data['username']
        if not isinstance(username, str):
            errors.append('Username must be a string')
        elif len(username) < 3:
            errors.append('Username must be at least 3 characters')
        elif len(username) > 50:
            errors.append('Username must be less than 50 characters')
        elif not re.match(r'^[a-zA-Z0-9_-]+$', username):
            errors.append('Username can only contain letters, numbers, hyphens, and underscores')
    
    # Validate display name
    if 'display_name' in data:
        display_name = data['display_name']
        if not isinstance(display_name, str):
            errors.append('Display name must be a string')
        elif len(display_name) > 100:
            errors.append('Display name must be less than 100 characters')
    
    # Validate avatar URL
    if 'avatar_url' in data and data['avatar_url']:
        avatar_url = data['avatar_url']
        if not isinstance(avatar_url, str):
            errors.append('Avatar URL must be a string')
        elif not re.match(r'^https?://', avatar_url):
            errors.append('Avatar URL must be a valid HTTP/HTTPS URL')
    
    # Validate preferences
    if 'preferences' in data:
        prefs = data['preferences']
        if not isinstance(prefs, dict):
            errors.append('Preferences must be an object')
        else:
            # Validate known preference fields
            valid_themes = ['light', 'dark', 'auto']
            if 'theme' in prefs and prefs['theme'] not in valid_themes:
                warnings.append(f'Invalid theme: {prefs["theme"]}. Valid options: {valid_themes}')
            
            if 'typing_sound' in prefs and not isinstance(prefs['typing_sound'], bool):
                warnings.append('typing_sound should be a boolean')
            
            if 'show_wpm_real_time' in prefs and not isinstance(prefs['show_wpm_real_time'], bool):
                warnings.append('show_wpm_real_time should be a boolean')
    
    # Validate subscription status
    if 'subscription_status' in data:
        valid_statuses = ['free', 'premium', 'pro']
        if data['subscription_status'] not in valid_statuses:
            errors.append(f'Invalid subscription status. Valid options: {valid_statuses}')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

def validate_session_data(data: Dict) -> Dict:
    """Enhanced validation for typing session data"""
    errors = []
    warnings = []
    
    if not data:
        return {'valid': False, 'errors': ['No session data provided']}
    
    # Required fields
    required_fields = ['wpm', 'accuracy', 'duration']
    for field in required_fields:
        if field not in data:
            errors.append(f'Missing required field: {field}')
    
    # If basic validation fails, return early
    if errors:
        return {'valid': False, 'errors': errors}
    
    # Validate WPM
    try:
        wmp = float(data['wmp'])
        if wmp < 0:
            errors.append('WPM cannot be negative')
        elif wmp == 0:
            warnings.append('WPM is 0 - this may indicate a timing issue')
        elif wpm > 300:
            warnings.append(f'WPM is very high ({wpm}) - please verify this is correct')
        elif wpm < 1 and wpm > 0:
            warnings.append(f'WPM is very low ({wpm}) - this may indicate timing issues')
    except (ValueError, TypeError):
        errors.append(f'WPM must be a number, got: {type(data["wpm"]).__name__}')
    
    # Validate accuracy
    try:
        accuracy = float(data['accuracy'])
        if accuracy < 0:
            errors.append('Accuracy cannot be negative')
        elif accuracy > 100:
            errors.append('Accuracy cannot exceed 100%')
        elif accuracy == 0:
            warnings.append('Accuracy is 0% - this may indicate calculation issues')
    except (ValueError, TypeError):
        errors.append(f'Accuracy must be a number, got: {type(data["accuracy"]).__name__}')
    
    # Validate duration (critical for your issue)
    try:
        duration = float(data['duration'])
        if duration < 0:
            errors.append('Duration cannot be negative')
        elif duration == 0:
            errors.append('Duration is 0 - frontend timer is not working correctly')
        elif duration < 1:
            warnings.append(f'Duration is very short ({duration}s) - this may cause display issues')
        elif duration > 3600:  # 1 hour
            warnings.append(f'Duration is very long ({duration}s) - please verify this is correct')
    except (ValueError, TypeError):
        errors.append(f'Duration must be a number, got: {type(data["duration"]).__name__}')
    
    # Validate optional fields
    if 'total_characters' in data:
        try:
            total_chars = int(data['total_characters'])
            if total_chars < 0:
                warnings.append('Total characters cannot be negative')
        except (ValueError, TypeError):
            warnings.append('Total characters must be a number')
    
    if 'errors_count' in data:
        try:
            errors_count = int(data['errors_count'])
            if errors_count < 0:
                warnings.append('Errors count cannot be negative')
        except (ValueError, TypeError):
            warnings.append('Errors count must be a number')
    
    # Validate session type
    valid_session_types = ['practice', 'test', 'competition', 'custom']
    session_type = data.get('session_type', data.get('mode', 'practice'))
    if session_type not in valid_session_types:
        warnings.append(f'Unknown session type: {session_type}. Valid types: {valid_session_types}')
    
    # Validate content source
    valid_content_sources = ['pdf', 'custom', 'generated', 'preset']
    content_source = data.get('content_source', data.get('itemType', 'custom'))
    if content_source not in valid_content_sources:
        warnings.append(f'Unknown content source: {content_source}. Valid sources: {valid_content_sources}')
    
    # Cross-field validation
    if 'wmp' in data and 'accuracy' in data and 'duration' in data:
        try:
            wmp = float(data['wmp'])
            accuracy = float(data['accuracy'])
            duration = float(data['duration'])
            
            # Check for impossible combinations
            if wmp > 200 and accuracy > 98:
                warnings.append('Very high WPM with near-perfect accuracy - please verify')
            
            # Check consistency with total characters
            if 'total_characters' in data:
                total_chars = int(data.get('total_characters', 0))
                if total_chars > 0 and duration > 0:
                    estimated_wpm = (total_chars / 5) / (duration / 60)
                    if abs(estimated_wpm - wmp) > wmp * 0.3:  # 30% difference
                        warnings.append(f'WPM calculation mismatch: estimated {estimated_wpm:.1f}, reported {wmp}')
        except (ValueError, TypeError):
            pass  # Already handled in individual field validation
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'data_summary': {
            'wmp': data.get('wmp'),
            'accuracy': data.get('accuracy'),
            'duration': data.get('duration'),
            'session_type': session_type,
            'content_source': content_source
        }
    }

def validate_goal_data(data: Dict) -> Dict:
    """Validate goal creation/update data"""
    errors = []
    warnings = []
    
    if not data:
        return {'valid': False, 'errors': ['No goal data provided']}
    
    # Required fields
    required_fields = ['title', 'goal_type', 'target_value']
    for field in required_fields:
        if field not in data:
            errors.append(f'Missing required field: {field}')
    
    # Validate title
    if 'title' in data:
        title = data['title']
        if not isinstance(title, str):
            errors.append('Title must be a string')
        elif len(title.strip()) < 3:
            errors.append('Title must be at least 3 characters')
        elif len(title) > 100:
            errors.append('Title must be less than 100 characters')
    
    # Validate goal type
    if 'goal_type' in data:
        valid_types = ['speed', 'accuracy', 'streak', 'time', 'sessions']
        if data['goal_type'] not in valid_types:
            errors.append(f'Invalid goal type. Valid types: {valid_types}')
    
    # Validate target value
    if 'target_value' in data:
        try:
            target = float(data['target_value'])
            if target <= 0:
                errors.append('Target value must be positive')
            elif target > 1000000:  # Reasonable upper limit
                errors.append('Target value is too large')
            
            # Type-specific validation
            goal_type = data.get('goal_type')
            if goal_type == 'speed' and target > 300:
                warnings.append('Target WPM over 300 is very ambitious')
            elif goal_type == 'accuracy' and target > 100:
                errors.append('Accuracy target cannot exceed 100%')
            elif goal_type == 'streak' and target > 365:
                warnings.append('Streak target over 365 days is very ambitious')
                
        except (ValueError, TypeError):
            errors.append('Target value must be a number')
    
    # Validate description
    if 'description' in data and data['description']:
        if len(data['description']) > 500:
            warnings.append('Description is very long (over 500 characters)')
    
    # Validate deadline
    if 'deadline' in data and data['deadline']:
        try:
            deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
            now = datetime.now()
            
            if deadline <= now:
                errors.append('Deadline must be in the future')
            elif deadline > now + timedelta(days=1095):  # 3 years
                warnings.append('Deadline is very far in the future (over 3 years)')
                
        except (ValueError, TypeError):
            errors.append('Invalid deadline format (use ISO format)')
    
    # Validate priority
    if 'priority' in data:
        valid_priorities = ['low', 'medium', 'high']
        if data['priority'] not in valid_priorities:
            errors.append(f'Invalid priority. Valid options: {valid_priorities}')
    
    # Validate reward points
    if 'reward_points' in data:
        try:
            points = int(data['reward_points'])
            if points < 0:
                errors.append('Reward points cannot be negative')
            elif points > 10000:
                warnings.append('Reward points are very high')
        except (ValueError, TypeError):
            errors.append('Reward points must be a number')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

def validate_document_data(data: Dict) -> Dict:
    """Validate document upload data"""
    errors = []
    warnings = []
    
    if not data:
        return {'valid': False, 'errors': ['No document data provided']}
    
    # Required fields
    required_fields = ['filename', 'original_name', 'file_size', 'storage_path']
    for field in required_fields:
        if field not in data:
            errors.append(f'Missing required field: {field}')
    
    # Validate filename
    if 'filename' in data:
        filename = data['filename']
        if not isinstance(filename, str):
            errors.append('Filename must be a string')
        elif len(filename) > 255:
            errors.append('Filename too long (max 255 characters)')
        elif not re.match(r'^[a-zA-Z0-9._-]+$', filename):
            warnings.append('Filename contains special characters')
    
    # Validate original name
    if 'original_name' in data:
        original_name = data['original_name']
        if not isinstance(original_name, str):
            errors.append('Original name must be a string')
        elif len(original_name) > 255:
            errors.append('Original name too long (max 255 characters)')
    
    # Validate file size
    if 'file_size' in data:
        try:
            file_size = int(data['file_size'])
            if file_size <= 0:
                errors.append('File size must be positive')
            elif file_size > 16 * 1024 * 1024:  # 16MB
                errors.append('File size exceeds 16MB limit')
            elif file_size > 10 * 1024 * 1024:  # 10MB
                warnings.append('Large file size (over 10MB)')
        except (ValueError, TypeError):
            errors.append('File size must be a number')
    
    # Validate storage path
    if 'storage_path' in data:
        storage_path = data['storage_path']
        if not isinstance(storage_path, str):
            errors.append('Storage path must be a string')
        elif len(storage_path) > 500:
            errors.append('Storage path too long')
    
    # Validate file type
    if 'file_type' in data:
        file_type = data['file_type']
        allowed_types = ['application/pdf', 'text/plain', 'text/markdown']
        if file_type not in allowed_types:
            warnings.append(f'Unusual file type: {file_type}')
    
    # Validate processing status
    if 'processing_status' in data:
        valid_statuses = ['pending', 'processing', 'completed', 'failed']
        if data['processing_status'] not in valid_statuses:
            errors.append(f'Invalid processing status. Valid options: {valid_statuses}')
    
    # Validate content preview
    if 'content_preview' in data and data['content_preview']:
        if len(data['content_preview']) > 1000:
            warnings.append('Content preview is very long (over 1000 characters)')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

def create_validation_report(data: Dict, validation_result: Dict) -> str:
    """Create a detailed validation report for debugging"""
    lines = ["=== VALIDATION REPORT ==="]
    
    if not data:
        lines.append("❌ No data provided")
        return "\n".join(lines)
    
    lines.append(f"📊 Data received: {list(data.keys())}")
    lines.append(f"✅ Valid: {validation_result['valid']}")
    
    if validation_result.get('errors'):
        lines.append("\n🚨 ERRORS:")
        for error in validation_result['errors']:
            lines.append(f"  - {error}")
    
    if validation_result.get('warnings'):
        lines.append("\n⚠️  WARNINGS:")
        for warning in validation_result['warnings']:
            lines.append(f"  - {warning}")
    
    # Data analysis
    lines.append("\n📋 DATA ANALYSIS:")
    for key, value in data.items():
        value_type = type(value).__name__
        if isinstance(value, str):
            display_value = f'"{value[:50]}{"..." if len(value) > 50 else ""}"'
        elif isinstance(value, (int, float)):
            display_value = str(value)
        elif isinstance(value, (list, dict)):
            display_value = f"{value_type} with {len(value)} items"
        else:
            display_value = str(value)[:50]
        
        lines.append(f"  {key}: {display_value} ({value_type})")
    
    # Summary
    lines.append(f"\n📊 SUMMARY:")
    lines.append(f"  Errors: {len(validation_result.get('errors', []))}")
    lines.append(f"  Warnings: {len(validation_result.get('warnings', []))}")
    lines.append(f"  Status: {'✅ PASS' if validation_result['valid'] else '❌ FAIL'}")
    
    return "\n".join(lines)