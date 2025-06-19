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
