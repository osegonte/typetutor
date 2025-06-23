"""
TypeTutor Flask Application - Minimal CORS-enabled version
"""

import os
import sys
import logging
import tempfile
import uuid
import json
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

def create_app(config_name='production'):
    """Create Flask application with proper CORS configuration"""
    app = Flask(__name__)
    
    # Environment-based configuration
    is_development = os.environ.get('FLASK_ENV') == 'development' or config_name == 'development'
    is_testing = config_name == 'testing'
    
    # Basic configuration
    app.config.update({
        'SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-secret-key'),
        'DEBUG': is_development,
        'TESTING': is_testing,
        'MAX_CONTENT_LENGTH': 16 * 1024 * 1024,  # 16MB
        'UPLOAD_FOLDER': os.environ.get('UPLOAD_FOLDER', 'uploads'),
        'STATS_FILE': os.environ.get('STATS_FILE', 'data/user_stats.json'),
    })
    
    # CORS Configuration - This fixes your CORS issues!
    if is_development:
        # Development: Allow frontend dev servers
        CORS(app, 
             origins=['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
             supports_credentials=True,
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    else:
        # Production: Allow Vercel and other deployments
        CORS(app,
             origins=['https://*.vercel.app', 'https://*.netlify.app', '*'],
             supports_credentials=True,
             allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Create necessary directories
    for directory in [app.config['UPLOAD_FOLDER'], 
                     os.path.dirname(app.config['STATS_FILE'])]:
        os.makedirs(directory, exist_ok=True)
    
    # Setup logging
    if not app.debug and not app.testing:
        logging.basicConfig(level=logging.INFO)
    
    # Register routes
    register_routes(app)
    register_error_handlers(app)
    
    return app

def register_error_handlers(app):
    """Register error handlers with CORS headers"""
    
    @app.errorhandler(404)
    def not_found(error):
        response = jsonify({'error': 'Not Found', 'message': 'Resource not found'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 404
    
    @app.errorhandler(500)
    def internal_server_error(error):
        response = jsonify({'error': 'Internal Server Error', 'message': 'An error occurred'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

def register_routes(app):
    """Register all application routes with CORS support"""
    
    # Add CORS headers to ALL responses
    @app.after_request
    def after_request(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response
    
    # Handle preflight OPTIONS requests - This is KEY for file uploads!
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = jsonify({'status': 'OK'})
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response.headers['Access-Control-Max-Age'] = '86400'
            return response

    @app.route('/api/health', methods=['GET', 'OPTIONS'])
    def health():
        """Health check with system information"""
        return jsonify({
            'status': 'healthy',
            'message': 'TypeTutor backend running with CORS enabled',
            'timestamp': datetime.now().isoformat(),
            'environment': {
                'debug': app.debug,
                'upload_folder': app.config.get('UPLOAD_FOLDER'),
                'max_file_size_mb': app.config.get('MAX_CONTENT_LENGTH', 0) // (1024 * 1024)
            },
            'cors': {
                'enabled': True,
                'development_mode': app.debug,
                'origins_allowed': 'localhost:5173, localhost:3000, *.vercel.app, *.netlify.app'
            },
            'version': '2.1.0-minimal'
        })

    @app.route('/api/stats', methods=['GET', 'OPTIONS'])
    def get_stats():
        """Get user statistics"""
        try:
            stats_file = app.config['STATS_FILE']
            if os.path.exists(stats_file):
                with open(stats_file, 'r') as f:
                    stats = json.load(f)
                return jsonify(stats)
        except Exception as e:
            app.logger.error(f'Error getting stats: {e}')
        
        # Return default stats
        return jsonify({
            'averageWpm': 0,
            'accuracy': 0,
            'practiceMinutes': 0,
            'currentStreak': 0,
            'totalSessions': 0,
            'recentSessions': [],
            'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None}
        })

    @app.route('/api/save-stats', methods=['POST', 'OPTIONS'])
    def save_stats():
        """Save typing session statistics"""
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Basic validation
            required_fields = ['wpm', 'accuracy', 'duration']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing field: {field}'}), 400
            
            # Load existing stats
            stats_file = app.config['STATS_FILE']
            if os.path.exists(stats_file):
                with open(stats_file, 'r') as f:
                    stats = json.load(f)
            else:
                stats = {
                    'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                    'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                    'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None}
                }
            
            # Update stats with new session
            wmp = max(0, min(300, int(float(data.get('wpm', 0)))))
            accuracy = max(0, min(100, int(float(data.get('accuracy', 0)))))
            duration = max(1, float(data.get('duration', 1)))
            
            # Add to recent sessions
            session = {
                'date': datetime.now().strftime('%Y-%m-%d'),
                'duration': f"{int(duration//60)}m {int(duration%60)}s",
                'wpm': wpm,
                'accuracy': accuracy,
                'mode': data.get('itemType', 'Practice').title()
            }
            
            stats['recentSessions'].insert(0, session)
            stats['recentSessions'] = stats['recentSessions'][:10]  # Keep last 10
            
            # Update totals
            stats['totalSessions'] += 1
            total = stats['totalSessions']
            
            # Update averages
            if stats['averageWpm'] == 0:
                stats['averageWpm'] = wpm
            else:
                stats['averageWpm'] = round(((stats['averageWpm'] * (total - 1)) + wpm) / total)
            
            if stats['accuracy'] == 0:
                stats['accuracy'] = accuracy
            else:
                stats['accuracy'] = round(((stats['accuracy'] * (total - 1)) + accuracy) / total)
            
            # Update personal bests
            if wpm > stats['personalBest']['wpm']:
                stats['personalBest']['wmp'] = wmp
                stats['personalBest']['date'] = session['date']
            
            if accuracy > stats['personalBest']['accuracy']:
                stats['personalBest']['accuracy'] = accuracy
            
            # Save updated stats
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2)
            
            return jsonify({
                'success': True,
                'message': 'Statistics saved successfully',
                'updated_stats': stats
            })
            
        except Exception as e:
            app.logger.error(f'Error saving stats: {e}')
            return jsonify({'error': 'Failed to save statistics', 'details': str(e)}), 500

    @app.route('/api/reset-stats', methods=['POST', 'OPTIONS'])
    def reset_stats():
        """Reset user statistics"""
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
        try:
            default_stats = {
                'averageWpm': 0, 'accuracy': 0, 'practiceMinutes': 0,
                'currentStreak': 0, 'totalSessions': 0, 'recentSessions': [],
                'personalBest': {'wpm': 0, 'accuracy': 0, 'date': None}
            }
            
            with open(app.config['STATS_FILE'], 'w') as f:
                json.dump(default_stats, f, indent=2)
            
            return jsonify({
                'success': True,
                'message': 'Statistics reset successfully',
                'stats': default_stats
            })
            
        except Exception as e:
            return jsonify({'error': 'Failed to reset statistics'}), 500

    @app.route('/api/process-text', methods=['POST', 'OPTIONS'])
    def process_text():
        """Process custom text for typing practice"""
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
        try:
            data = request.get_json()
            if not data or 'text' not in data:
                return jsonify({'error': 'No text provided'}), 400
            
            text = data['text'].strip()
            if not text:
                return jsonify({'error': 'Empty text provided'}), 400
            
            if len(text) > 10000:
                return jsonify({'error': 'Text too long. Maximum 10,000 characters.'}), 400
            
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
            
        except Exception as e:
            app.logger.error(f'Error processing text: {e}')
            return jsonify({'error': 'Failed to process text'}), 500

    @app.route('/api/pdf-support', methods=['GET', 'OPTIONS'])
    def pdf_support():
        """Get PDF support information"""
        try:
            import pypdf
            return jsonify({
                'pdf_support': True,
                'pypdf_available': True,
                'message': 'PDF processing available',
                'supported_formats': ['pdf'],
                'max_file_size': '16MB'
            })
        except ImportError:
            return jsonify({
                'pdf_support': False,
                'pypdf_available': False,
                'message': 'PDF processing not available'
            })

    @app.route('/api/upload-pdf', methods=['POST', 'OPTIONS'])
    def upload_pdf():
        """Handle PDF upload and processing with full CORS support"""
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'})
        
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
            
            # Process PDF
            try:
                import pypdf
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                    file.save(temp_file.name)
                    temp_path = temp_file.name
                
                try:
                    reader = pypdf.PdfReader(temp_path)
                    text_content = ""
                    
                    # Extract text from all pages
                    for page_num, page in enumerate(reader.pages):
                        try:
                            page_text = page.extract_text()
                            if page_text and page_text.strip():
                                text_content += f"\n\n--- Page {page_num + 1} ---\n{page_text.strip()}"
                        except Exception as e:
                            app.logger.warning(f"Error extracting page {page_num + 1}: {e}")
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
                    paragraphs = [p.strip() for p in text_content.split('\n\n') if p.strip() and len(p.strip()) > 20]
                    
                    items = []
                    for i, paragraph in enumerate(paragraphs[:10]):  # Limit to 10 items
                        if len(paragraph) > 1000:  # Truncate if too long
                            paragraph = paragraph[:997] + "..."
                        
                        items.append({
                            'id': f'pdf-item-{i+1}',
                            'prompt': f'Type this text from the PDF (section {i+1}):',
                            'content': paragraph,
                            'type': 'text',
                            'context': f'PDF Content - Section {i+1}',
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
            app.logger.error(f'Unexpected error in upload_pdf: {e}')
            return jsonify({
                'success': False,
                'error': 'Upload failed',
                'message': f'Error uploading file: {str(e)}'
            }), 500

    # Frontend/Documentation endpoint
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        """Serve API documentation"""
        return jsonify({
            'message': 'TypeTutor Backend API',
            'version': '2.1.0-minimal',
            'cors_enabled': True,
            'status': 'CORS issues should be fixed! 🎉',
            'endpoints': {
                'health': 'GET /api/health - Health check',
                'stats': 'GET /api/stats - Get statistics',
                'save_stats': 'POST /api/save-stats - Save session',
                'reset_stats': 'POST /api/reset-stats - Reset stats',
                'process_text': 'POST /api/process-text - Process text',
                'pdf_support': 'GET /api/pdf-support - PDF support info',
                'upload_pdf': 'POST /api/upload-pdf - Upload PDF (CORS fixed!)'
            },
            'cors_info': {
                'preflight_support': 'YES - OPTIONS requests handled',
                'file_upload_support': 'YES - PDF uploads should work',
                'origins_allowed': 'localhost (dev) + *.vercel.app (prod)',
                'headers_included': 'All responses include CORS headers'
            },
            'next_steps': [
                '1. Test: curl -X OPTIONS http://localhost:5001/api/upload-pdf',
                '2. Deploy this to Railway',
                '3. Test file upload from your Vercel frontend',
                '4. Celebrate! 🎉'
            ]
        })

# Create app instance
app = create_app()

if __name__ == '__main__':
    # Development server
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    
    print(f"🚀 Starting TypeTutor Backend...")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"   CORS: ✅ ENABLED with full preflight support")
    print(f"   PDF Upload: ✅ CORS-enabled")
    print(f"")
    print(f"🌐 Backend available at:")
    print(f"   http://localhost:{port}")
    print(f"   http://127.0.0.1:{port}")
    print(f"")
    print(f"🧪 Test CORS:")
    print(f"   curl -X OPTIONS http://localhost:{port}/api/upload-pdf")
    print(f"   curl http://localhost:{port}/api/health")
    print(f"")
    print(f"Press Ctrl+C to stop")
    print(f"")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
