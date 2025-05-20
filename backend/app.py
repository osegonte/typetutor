# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from pdf_parser import extract_content_from_pdf

app = Flask(__name__, static_folder='../frontend/dist')
CORS(app)  # Enable CORS for all routes

# Create uploads directory if it doesn't exist
os.makedirs('uploads', exist_ok=True)

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    # Save the uploaded file
    file_path = os.path.join('uploads', file.filename)
    file.save(file_path)
    
    # Process the PDF
    try:
        content = extract_content_from_pdf(file_path)
        return jsonify({
            'success': True,
            'content': content
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-text', methods=['POST'])
def process_text():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
        
    text = data['text']
    
    # Simple processing here - this would be expanded in a full implementation
    words = len(text.split())
    characters = len(text)
    
    return jsonify({
        'success': True,
        'stats': {
            'words': words,
            'characters': characters
        },
        'content': text
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    # Mock statistics - in a real app, these would come from a database
    return jsonify({
        'averageWpm': 65,
        'accuracy': 92,
        'practiceMinutes': 240,
        'currentStreak': 5,
        'recentSessions': [
            {
                'date': '2025-05-19',
                'duration': '15 min',
                'wpm': 67,
                'accuracy': 94,
                'mode': 'Custom Text'
            },
            {
                'date': '2025-05-18',
                'duration': '20 min',
                'wpm': 64,
                'accuracy': 91,
                'mode': 'PDF Study'
            }
        ]
    })

# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)