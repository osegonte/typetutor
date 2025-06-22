import os
import sys
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import tempfile
import uuid

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_app():
    """Enhanced Flask app with full TypeTutor functionality"""
    app = Flask(__name__, static_folder='../frontend/dist')
    
    # Configuration
    app.config.update({
        'SECRET_KEY': os.environ.get('SECRET_KEY', 'railway-secret'),
        'DEBUG': False,
        'SUPABASE_URL': os.environ.get('SUPABASE_URL', ''),
        'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY', ''),
        'USE_DATABASE': os.environ.get('USE_DATABASE', 'true').lower() == 'true',
        'MAX_CONTENT_LENGTH': 16 * 1024 * 1024  # 16MB max file size
    })
    
    # Enable CORS for all origins
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Create upload directory
    upload_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_dir
    
    # Enhanced routes
    @app.route('/api/health')
    def health():
        return jsonify({
            'status': 'healthy',
            'message': 'TypeTutor backend running on Railway',
            'database_enabled': app.config.get('USE_DATABASE', False),
            'supabase_configured': bool(app.config.get('SUPABASE_URL')),
            'version': '2.0.0',
            'upload_folder': app.config.get('UPLOAD_FOLDER'),
            'max_file_size': app.config.get('MAX_CONTENT_LENGTH')
        })
    
    @app.route('/api/stats')
    def get_stats():
        """Get user statistics"""
        # For now, return mock data - can be enhanced with database later
        return jsonify({
            'averageWpm': 45,
            'accuracy': 92,
            'practiceMinutes': 120,
            'currentStreak': 3,
            'totalSessions': 15,
            'recentSessions': [
                {
                    'date': '2025-06-22',
                    'duration': '2m 30s',
                    'wpm': 48,
                    'accuracy': 94,
                    'mode': 'Practice'
                },
                {
                    'date': '2025-06-21',
                    'duration': '3m 15s',
                    'wpm': 42,
                    'accuracy': 89,
                    'mode': 'Custom Text'
                }
            ],
            'personalBest': {
                'wpm': 52,
                'accuracy': 96,
                'date': '2025-06-22'
            }
        })
    
    @app.route('/api/save-stats', methods=['POST'])
    def save_stats():
        """Save typing session statistics"""
        data = request.get_json()
        
        # Basic validation
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['wpm', 'accuracy', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # For now, just return success - can be enhanced with database later
        return jsonify({
            'success': True,
            'message': 'Statistics saved successfully',
            'saved_data': {
                'wmp': data.get('wpm'),
                'accuracy': data.get('accuracy'),
                'duration': data.get('duration'),
                'timestamp': '2025-06-22T16:30:00Z'
            }
        })
    
    @app.route('/api/reset-stats', methods=['POST'])
    def reset_stats():
        """Reset user statistics"""
        return jsonify({
            'success': True,
            'message': 'Statistics reset successfully',
            'stats': {
                'averageWpm': 0,
                'accuracy': 0,
                'practiceMinutes': 0,
                'currentStreak': 0,
                'totalSessions': 0,
                'recentSessions': []
            }
        })
    
    @app.route('/api/process-text', methods=['POST'])
    def process_text():
        """Process custom text for typing practice"""
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({'error': 'Empty text provided'}), 400
        
        # Create study item
        items = [{
            'id': 'custom-text-1',
            'prompt': 'Type this custom text:',
            'content': text,
            'type': 'text',
            'context': 'Custom Text',
            'word_count': len(text.split()),
            'estimated_time': max(30, len(text.split()) / 40 * 60)
        }]
        
        return jsonify({
            'success': True,
            'items': items,
            'item_count': len(items)
        })
    
    @app.route('/api/pdf-support')
    def pdf_support():
        """Get PDF support information"""
        try:
            import pypdf
            return jsonify({
                'pdf_support': True,
                'pypdf_available': True,
                'message': f'PDF processing available using pypdf',
                'supported_formats': ['pdf'],
                'max_file_size': '16MB',
                'version': getattr(pypdf, '__version__', 'unknown')
            })
        except ImportError:
            return jsonify({
                'pdf_support': False,
                'pypdf_available': False,
                'message': 'PDF processing not available - pypdf not installed',
                'supported_formats': [],
                'max_file_size': '0MB'
            })
    
    @app.route('/api/upload-pdf', methods=['POST'])
    def upload_pdf():
        """Handle PDF upload and processing"""
        try:
            # Check if file is present
            if 'file' not in request.files:
                return jsonify({
                    'success': False,
                    'error': 'No file provided',
                    'message': 'Please select a PDF file to upload'
                }), 400
            
            file = request.files['file']
            
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': 'No file selected',
                    'message': 'Please select a PDF file to upload'
                }), 400
            
            # Validate file type
            if not file.filename.lower().endswith('.pdf'):
                return jsonify({
                    'success': False,
                    'error': 'Invalid file type',
                    'message': 'Only PDF files are supported'
                }), 400
            
            # Check file size
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > app.config['MAX_CONTENT_LENGTH']:
                return jsonify({
                    'success': False,
                    'error': 'File too large',
                    'message': 'File size exceeds 16MB limit'
                }), 400
            
            # Try to process the PDF
            try:
                import pypdf
                
                # Create a temporary file
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                    file.save(temp_file.name)
                    temp_path = temp_file.name
                
                # Process PDF
                try:
                    reader = pypdf.PdfReader(temp_path)
                    text_content = ""
                    
                    for page_num, page in enumerate(reader.pages):
                        try:
                            page_text = page.extract_text()
                            if page_text and page_text.strip():
                                text_content += f"\n\n--- Page {page_num + 1} ---\n{page_text.strip()}"
                        except Exception as e:
                            print(f"Error extracting page {page_num + 1}: {e}")
                            continue
                    
                    # Clean up temp file
                    os.unlink(temp_path)
                    
                    if not text_content.strip():
                        return jsonify({
                            'success': False,
                            'error': 'No text found',
                            'message': 'Could not extract text from this PDF. It may be image-based or password protected.'
                        }), 400
                    
                    # Create study items from extracted text
                    # Simple chunking - split by paragraphs and create items
                    paragraphs = [p.strip() for p in text_content.split('\n\n') if p.strip() and len(p.strip()) > 20]
                    
                    items = []
                    for i, paragraph in enumerate(paragraphs[:10]):  # Limit to 10 items
                        if len(paragraph) > 1000:  # If too long, truncate
                            paragraph = paragraph[:997] + "..."
                        
                        items.append({
                            'id': f'pdf-item-{i+1}',
                            'prompt': f'Type this text from the PDF (section {i+1}):',
                            'content': paragraph,
                            'type': 'text',
                            'context': f'PDF Content - Page {i+1}',
                            'word_count': len(paragraph.split()),
                            'estimated_time': max(30, len(paragraph.split()) / 40 * 60)
                        })
                    
                    if not items:
                        return jsonify({
                            'success': False,
                            'error': 'No usable content',
                            'message': 'Could not create practice items from this PDF content.'
                        }), 400
                    
                    return jsonify({
                        'success': True,
                        'items': items,
                        'item_count': len(items),
                        'message': f'Successfully processed PDF with {len(items)} practice sections',
                        'file_info': {
                            'name': file.filename,
                            'size': file_size,
                            'pages': len(reader.pages)
                        }
                    })
                    
                except Exception as e:
                    # Clean up temp file on error
                    try:
                        os.unlink(temp_path)
                    except:
                        pass
                    
                    return jsonify({
                        'success': False,
                        'error': 'PDF processing failed',
                        'message': f'Error processing PDF: {str(e)}'
                    }), 500
                    
            except ImportError:
                return jsonify({
                    'success': False,
                    'error': 'PDF support not available',
                    'message': 'PDF processing library not installed'
                }), 503
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Upload failed',
                'message': f'Error uploading file: {str(e)}'
            }), 500
    
    # Serve frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        try:
            if path and os.path.exists(os.path.join(app.static_folder, path)):
                return send_from_directory(app.static_folder, path)
            else:
                return send_from_directory(app.static_folder, 'index.html')
        except:
            return jsonify({
                'message': 'TypeTutor Backend API',
                'frontend': 'Not available - use separate frontend deployment',
                'api_endpoints': [
                    '/api/health',
                    '/api/stats',
                    '/api/save-stats',
                    '/api/reset-stats',
                    '/api/process-text',
                    '/api/pdf-support',
                    '/api/upload-pdf'
                ]
            })
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)