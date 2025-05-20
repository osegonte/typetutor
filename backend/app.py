from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import sys

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import pdf_parser  # Import the entire module

app = Flask(__name__, static_folder='../frontend/dist')
CORS(app)  # Enable CORS for all routes

# Create uploads directory if it doesn't exist
os.makedirs('uploads', exist_ok=True)

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
        # Try to instantiate PDFParser or use a function
        if hasattr(pdf_parser, 'PDFParser'):
            parser = pdf_parser.PDFParser(file_path)
            if hasattr(parser, 'extract_items'):
                items = parser.extract_items()
                processing_time = getattr(parser, 'processing_time', 0)
            elif hasattr(parser, 'extract_text'):
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
                raise Exception("Parser doesn't have extract_items or extract_text method")
        elif hasattr(pdf_parser, 'extract_content_from_pdf'):
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
            raise Exception("Could not find PDF parsing functionality")
        
        return jsonify({
            'success': True,
            'items': items,
            'processing_time': processing_time,
            'item_count': len(items)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Rest of the code remains the same
# ...

if __name__ == '__main__':
    app.run(debug=True, port=5000)