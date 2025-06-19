from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import sys
import time
from datetime import datetime, timedelta
import traceback  # Import for detailed error tracking
import math  # For better time calculations

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import pdf_parser  # Import the entire module

app = Flask(__name__, static_folder='../frontend/dist')

# Enable CORS only for specific origins
allowed_origins = [
    "http://localhost:5173",  # Development frontend
    "http://localhost:5000",  # Backend when served directly
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5000"
    # Add your production domain here when deploying
]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Create necessary directories if they don't exist
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

os.makedirs(uploads_dir, exist_ok=True)
os.makedirs(data_dir, exist_ok=True)

# Ensure directories are writable
if not os.access(uploads_dir, os.W_OK):
    app.logger.error(f"Uploads directory is not writable: {uploads_dir}")
    raise PermissionError(f"Uploads directory is not writable: {uploads_dir}")

if not os.access(data_dir, os.W_OK):
    app.logger.error(f"Data directory is not writable: {data_dir}")
    raise PermissionError(f"Data directory is not writable: {data_dir}")

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
        "lastSessionDate": None,
        "recentSessions": []
    }
    with open(STATS_FILE, 'w') as f:
        json.dump(default_stats, f, indent=2)

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
        
        if not file.filename.lower().endswith('.pdf'):
            app.logger.error("Uploaded file is not a PDF")
            return jsonify({'error': 'Uploaded file must be a PDF'}), 400
        
        # Debug information
        app.logger.info(f"Received file: {file.filename}")
        
        # Create full path with absolute directory
        file_path = os.path.join(uploads_dir, file.filename)
        app.logger.info(f"Saving file to: {file_path}")
        
        # Save the uploaded file
        try:
            file.save(file_path)
        except Exception as e:
            error_msg = f"Failed to save file: {str(e)}"
            app.logger.error(error_msg)
            return jsonify({'error': error_msg}), 500
        
        # Check if the file was saved successfully
        if not os.path.exists(file_path):
            error_msg = f"Failed to save file at {file_path}"
            app.logger.error(error_msg)
            return jsonify({'error': error_msg}), 500
        
        app.logger.info("File saved successfully")
        
        # Process the PDF - Simplified to use only the PDFParser class for consistency
        try:
            if hasattr(pdf_parser, 'PDFParser'):
                app.logger.info("Using PDFParser class")
                parser = pdf_parser.PDFParser(file_path)
                
                app.logger.info("Extracting items from PDF")
                items = parser.extract_items()
                processing_time = getattr(parser, 'processing_time', 0)
            else:
                err_msg = "PDFParser class not found in pdf_parser module"
                app.logger.error(err_msg)
                return jsonify({'error': err_msg}), 500
        except Exception as e:
            error_traceback = traceback.format_exc()
            error_msg = f"Error processing PDF: {str(e)}"
            app.logger.error(error_msg)
            app.logger.error(f"Traceback: {error_traceback}")
            
            # Try to remove the file if it exists to clean up
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    app.logger.info(f"Removed problematic file: {file_path}")
            except Exception as clean_error:
                app.logger.error(f"Error removing file: {str(clean_error)}")
            
            return jsonify({
                'error': str(e),
                'message': 'Error processing the PDF file. Please try a different PDF.'
            }), 500
        
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
        error_msg = f"Error in upload_pdf route: {str(e)}"
        app.logger.error(error_msg)
        app.logger.error(f"Traceback: {error_traceback}")
        
        return jsonify({
            'error': str(e),
            'message': 'Error processing the PDF file. Please try a different PDF.'
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
        
        app.logger.info(f"Received stats data: {data}")
        
        # Ensure numeric fields are valid numbers
        try:
            data['wpm'] = int(data['wpm'])
            data['accuracy'] = int(data['accuracy'])
            data['duration'] = float(data['duration'])  # Duration in seconds
        except (ValueError, TypeError) as e:
            app.logger.error(f"Invalid numeric data: {e}")
            return jsonify({'error': f'Invalid numeric data: {e}'}), 400
        
        # Read existing stats
        try:
            with open(STATS_FILE, 'r') as f:
                stats = json.load(f)
                app.logger.info(f"Loaded existing stats: {stats}")
        except (json.JSONDecodeError, FileNotFoundError) as e:
            app.logger.warning(f"Stats file issue: {e}, creating new stats object")
            # If file doesn't exist or is corrupted, create a new stats object
            stats = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": []
            }
        
        # Add the new session to recent sessions
        today = datetime.now().date()
        session_date = data.get('timestamp', datetime.now().isoformat())
        
        session_data = {
            'date': session_date,
            'duration': f"{int(data['duration'] / 60)}m {int(data['duration'] % 60)}s",
            'wpm': int(data['wpm']),
            'accuracy': int(data['accuracy']),
            'mode': data.get('itemType', 'Practice')
        }
        
        app.logger.info(f"Created session data: {session_data}")
        
        # Update recent sessions (keep last 5)
        stats['recentSessions'].insert(0, session_data)
        if len(stats['recentSessions']) > 5:
            stats['recentSessions'] = stats['recentSessions'][:5]
        
        # Update aggregate statistics
        total_sessions = stats.get('totalSessions', 0) + 1
        stats['totalSessions'] = total_sessions
        
        # Update average WPM with proper weighting
        current_avg_wpm = stats.get('averageWpm', 0)
        if current_avg_wpm == 0 and total_sessions == 1:
            # First session
            stats['averageWpm'] = data['wpm']
        else:
            # Apply proper weighted average formula
            total_wpm = (current_avg_wpm * (total_sessions - 1)) + data['wpm']
            stats['averageWpm'] = round(total_wpm / total_sessions)
        
        # Update average accuracy with proper weighting
        current_accuracy = stats.get('accuracy', 0)
        if current_accuracy == 0 and total_sessions == 1:
            # First session
            stats['accuracy'] = data['accuracy']
        else:
            # Apply proper weighted average formula
            total_accuracy = (current_accuracy * (total_sessions - 1)) + data['accuracy']
            stats['accuracy'] = round(total_accuracy / total_sessions)
        
        # Update practice minutes - using Math.ceil to ensure even very short sessions count
        # at least 1 minute (prevents rounding to 0)
        minutes_practiced = math.ceil(data['duration'] / 60)
        stats['practiceMinutes'] = stats.get('practiceMinutes', 0) + minutes_practiced
        
        # Update streak (improved logic for consecutive days)
        last_session_date = stats.get('lastSessionDate')
        if last_session_date:
            try:
                # Convert string date to datetime object
                last_date = datetime.fromisoformat(last_session_date).date()
                days_since_last = (today - last_date).days
                
                if days_since_last == 0:
                    # Same day, keep streak
                    pass
                elif days_since_last == 1:
                    # Consecutive day, increment streak
                    stats['currentStreak'] = stats.get('currentStreak', 0) + 1
                else:
                    # Not consecutive, reset streak
                    stats['currentStreak'] = 1
            except (ValueError, TypeError):
                # Date conversion failed, reset streak to be safe
                stats['currentStreak'] = 1
        else:
            # First session ever
            stats['currentStreak'] = 1
        
        # Save today's date for next streak calculation
        stats['lastSessionDate'] = today.isoformat()
        
        app.logger.info(f"Updated stats: {stats}")
        
        # Save updated stats with proper formatting
        try:
            with open(STATS_FILE, 'w') as f:
                json.dump(stats, f, indent=2)
                app.logger.info(f"Stats saved successfully to {STATS_FILE}")
        except Exception as e:
            app.logger.error(f"Error writing stats file: {e}")
            return jsonify({'error': f'Error writing stats file: {e}'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Statistics saved successfully',
            'updated_stats': stats  # Return the updated stats
        })
    except Exception as e:
        error_traceback = traceback.format_exc()
        app.logger.error(f"Error saving stats: {str(e)}")
        app.logger.error(f"Traceback: {error_traceback}")
        
        return jsonify({
            'error': str(e),
            'message': 'Error saving statistics.'
        }), 500

@app.route('/api/reset-stats', methods=['POST'])
def reset_stats():
    """Reset user statistics to default values (for testing/debugging purposes)"""
    try:
        data = request.json
        if not data:
            # Use default stats if no data provided
            data = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "lastSessionDate": None,
                "recentSessions": []
            }
            
        # Write the default stats to the file
        with open(STATS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        
        app.logger.info(f"Stats reset to default values: {data}")
        
        return jsonify({
            'success': True,
            'message': 'Statistics reset successfully',
            'stats': data
        })
    except Exception as e:
        error_traceback = traceback.format_exc()
        app.logger.error(f"Error resetting stats: {str(e)}")
        app.logger.error(f"Traceback: {error_traceback}")
        
        return jsonify({
            'error': str(e),
            'message': 'Error resetting statistics.'
        }), 500

@app.route('/api/debug-stats', methods=['GET'])
def debug_stats():
    """Return detailed information about the stats file and its contents"""
    try:
        stats_info = {
            'stats_file_path': STATS_FILE,
            'stats_file_exists': os.path.exists(STATS_FILE),
            'stats_file_size': os.path.getsize(STATS_FILE) if os.path.exists(STATS_FILE) else 0,
            'stats_file_permissions': oct(os.stat(STATS_FILE).st_mode & 0o777) if os.path.exists(STATS_FILE) else 'N/A',
            'stats_file_owner': os.stat(STATS_FILE).st_uid if os.path.exists(STATS_FILE) else 'N/A',
        }
        
        # Try to read the contents of the stats file
        if os.path.exists(STATS_FILE):
            try:
                with open(STATS_FILE, 'r') as f:
                    raw_content = f.read()
                    stats_info['raw_content'] = raw_content
                    
                    try:
                        parsed_content = json.loads(raw_content)
                        stats_info['parsed_content'] = parsed_content
                        stats_info['is_valid_json'] = True
                    except json.JSONDecodeError as e:
                        stats_info['is_valid_json'] = False
                        stats_info['json_error'] = str(e)
            except Exception as e:
                stats_info['read_error'] = str(e)
        
        # Check if the data directory is writable
        stats_info['data_dir_writable'] = os.access(os.path.dirname(STATS_FILE), os.W_OK)
        
        return jsonify(stats_info)
    except Exception as e:
        error_traceback = traceback.format_exc()
        app.logger.error(f"Error debugging stats: {str(e)}")
        app.logger.error(f"Traceback: {error_traceback}")
        
        return jsonify({
            'error': str(e),
            'message': 'Error debugging statistics.'
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
        'pdf_parser_available': hasattr(pdf_parser, 'PDFParser'),
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
    # Check if we're in development or production
    is_dev = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=is_dev, port=5000)