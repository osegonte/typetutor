from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import sys
import time
from datetime import datetime, timedelta
import traceback  # Import for detailed error tracking

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import pdf_parser  # Import the entire module

app = Flask(__name__, static_folder='../frontend/dist')
CORS(app)  # Enable CORS for all routes

# Create necessary directories if they don't exist
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

os.makedirs(uploads_dir, exist_ok=True)
os.makedirs(data_dir, exist_ok=True)

# Path to store user statistics
STATS_FILE = os.path.join(data_dir, 'user_stats.json')

# Initialize stats file if it doesn't exist
if not os.path.exists(STATS_FILE):
    default_stats = {
        "averageWpm": 0,
        "accuracy": 0,
        "practiceMinutes": 0,
        "currentStreak": 0,
        "totalSessions": 0,
        "recentSessions": []
    }
    with open(STATS_FILE, 'w') as f:
        json.dump(default_stats, f)

@app.route('/api/pdf-support', methods=['GET'])
def get_pdf_support():
    """Return PDF parser support information"""
    if hasattr(pdf_parser, 'get_pdf_support_status'):
        return jsonify(pdf_parser.get_pdf_support_status())
    elif hasattr(pdf_parser, 'PDFParser') and hasattr(pdf_parser.PDFParser, 'get_pdf_support_status'):
        return jsonify(pdf_parser.PDFParser.get_pdf_support_status())
    else:
        return jsonify({
            'pymupdf_available': False,
            'pypdf2_available': False,
            'pdf_support': False,
            'message': 'PDF support status function not found'
        })

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload and process a PDF file"""
    try:
        # Debug information
        app.logger.info("PDF upload request received")
        
        if 'file' not in request.files:
            app.logger.error("No file part in the request")
            return jsonify({'error': 'No file part in the request'}), 400
            
        file = request.files['file']
        if file.filename == '':
            app.logger.error("No selected file")
            return jsonify({'error': 'No selected file'}), 400
        
        # Debug information
        app.logger.info(f"Received file: {file.filename}")
        
        # Create full path with absolute directory
        file_path = os.path.join(uploads_dir, file.filename)
        app.logger.info(f"Saving file to: {file_path}")
        
        # Save the uploaded file
        file.save(file_path)
        
        # Check if the file was saved successfully
        if not os.path.exists(file_path):
            app.logger.error(f"Failed to save file at {file_path}")
            return jsonify({'error': 'Failed to save the uploaded file'}), 500
        
        app.logger.info("File saved successfully")
        
        # Process the PDF
        # Try to instantiate PDFParser
        if hasattr(pdf_parser, 'PDFParser'):
            app.logger.info("Using PDFParser class")
            parser = pdf_parser.PDFParser(file_path)
            
            if hasattr(parser, 'extract_items'):
                app.logger.info("Extracting items from PDF")
                items = parser.extract_items()
                processing_time = getattr(parser, 'processing_time', 0)
            elif hasattr(parser, 'extract_text'):
                app.logger.info("Extracting text from PDF")
                parser.extract_text()
                # Create simple items from raw text
                text = parser.raw_text
                items = [{
                    'id': 'pdf-text-1',
                    'prompt': 'Type this text from PDF:',
                    'content': text,
                    'type': 'text',
                    'context': 'PDF Content'
                }]
                processing_time = getattr(parser, 'processing_time', 0)
            else:
                err_msg = "Parser doesn't have extract_items or extract_text method"
                app.logger.error(err_msg)
                return jsonify({'error': err_msg}), 500
        elif hasattr(pdf_parser, 'extract_content_from_pdf'):
            app.logger.info("Using extract_content_from_pdf function")
            # If it's a direct function instead of a class
            content = pdf_parser.extract_content_from_pdf(file_path)
            items = [{
                'id': 'pdf-text-1',
                'prompt': 'Type this text from PDF:',
                'content': content,
                'type': 'text',
                'context': 'PDF Content'
            }]
            processing_time = 0
        else:
            err_msg = "Could not find PDF parsing functionality"
            app.logger.error(err_msg)
            return jsonify({'error': err_msg}), 500
        
        app.logger.info(f"Successfully processed PDF. Extracted {len(items)} items.")
        
        return jsonify({
            'success': True,
            'items': items,
            'processing_time': processing_time,
            'item_count': len(items)
        })
    except Exception as e:
        # Get detailed traceback
        error_traceback = traceback.format_exc()
        app.logger.error(f"Error processing PDF: {str(e)}")
        app.logger.error(f"Traceback: {error_traceback}")
        
        return jsonify({
            'error': str(e),
            'traceback': error_traceback,
            'message': 'Error processing the PDF file. See detailed error information.'
        }), 500

@app.route('/api/process-text', methods=['POST'])
def process_text():
    """Process text input submitted directly by user"""
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
            
        # Process the text into study items
        text = data['text']
        
        # Simple implementation: just create one study item
        items = [{
            'id': 'custom-text-1',
            'prompt': 'Type this custom text:',
            'content': text,
            'type': 'text',
            'context': 'Custom Text'
        }]
        
        return jsonify({
            'success': True,
            'items': items,
            'item_count': len(items)
        })
    except Exception as e:
        error_traceback = traceback.format_exc()
        app.logger.error(f"Error processing text: {str(e)}")
        app.logger.error(f"Traceback: {error_traceback}")
        
        return jsonify({
            'error': str(e),
            'traceback': error_traceback,
            'message': 'Error processing the text input.'
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get user statistics"""
    try:
        # Read the stats file
        with open(STATS_FILE, 'r') as f:
            stats = json.load(f)
        return jsonify(stats)
    except Exception as e:
        error_traceback = traceback.format_exc()
        app.logger.error(f"Error getting stats: {str(e)}")
        app.logger.error(f"Traceback: {error_traceback}")
        
        return jsonify({
            'error': str(e),
            'traceback': error_traceback,
            'message': 'Error retrieving statistics.'
        }), 500

@app.route('/api/save-stats', methods=['POST'])
def save_user_stats():
    """Save user typing session statistics"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Validate required fields
        required_fields = ['wpm', 'accuracy', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Read existing stats
        with open(STATS_FILE, 'r') as f:
            stats = json.load(f)
        
        # Add the new session to recent sessions
        session_data = {
            'date': data.get('timestamp', datetime.now().isoformat()),
            'duration': f"{int(data['duration'] / 60)}m {int(data['duration'] % 60)}s",
            'wpm': data['wpm'],
            'accuracy': data['accuracy'],
            'mode': data.get('itemType', 'Practice')
        }
        
        # Update recent sessions (keep last 5)
        stats['recentSessions'].insert(0, session_data)
        if len(stats['recentSessions']) > 5:
            stats['recentSessions'] = stats['recentSessions'][:5]
        
        # Update aggregate statistics
        total_sessions = stats.get('totalSessions', 0) + 1
        stats['totalSessions'] = total_sessions
        
        # Update average WPM
        current_avg_wpm = stats.get('averageWpm', 0)
        total_wpm = (current_avg_wpm * (total_sessions - 1)) + data['wpm']
        stats['averageWpm'] = round(total_wpm / total_sessions)
        
        # Update average accuracy
        current_accuracy = stats.get('accuracy', 0)
        total_accuracy = (current_accuracy * (total_sessions - 1)) + data['accuracy']
        stats['accuracy'] = round(total_accuracy / total_sessions)
        
        # Update practice minutes
        stats['practiceMinutes'] = stats.get('practiceMinutes', 0) + round(data['duration'] / 60)
        
        # Update streak (simplified logic)
        stats['currentStreak'] = stats.get('currentStreak', 0) + 1
        
        # Save updated stats
        with open(STATS_FILE, 'w') as f:
            json.dump(stats, f)
        
        return jsonify({
            'success': True,
            'message': 'Statistics saved successfully'
        })
    except Exception as e:
        error_traceback = traceback.format_exc()
        app.logger.error(f"Error saving stats: {str(e)}")
        app.logger.error(f"Traceback: {error_traceback}")
        
        return jsonify({
            'error': str(e),
            'traceback': error_traceback,
            'message': 'Error saving statistics.'
        }), 500

# Add a debug endpoint to check file paths and permissions
@app.route('/api/debug-info', methods=['GET'])
def debug_info():
    """Return debug information about the application setup"""
    info = {
        'uploads_dir': uploads_dir,
        'uploads_dir_exists': os.path.exists(uploads_dir),
        'uploads_dir_writable': os.access(uploads_dir, os.W_OK),
        'data_dir': data_dir,
        'data_dir_exists': os.path.exists(data_dir),
        'data_dir_writable': os.access(data_dir, os.W_OK),
        'stats_file': STATS_FILE,
        'stats_file_exists': os.path.exists(STATS_FILE),
        'python_version': sys.version,
        'pdf_parser_available': hasattr(pdf_parser, 'PDFParser') or hasattr(pdf_parser, 'extract_content_from_pdf'),
        'current_working_directory': os.getcwd()
    }
    return jsonify(info)

# Serve frontend static files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)