# backend/pdf_parser.py
import PyPDF2
import re

def extract_content_from_pdf(file_path):
    """Extract text content from a PDF file"""
    try:
        content = ""
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            
            # Extract text from each page
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                content += page.extract_text() + "\n"
                
        return content
    except Exception as e:
        raise Exception(f"Error extracting PDF content: {str(e)}")

def extract_study_items(text):
    """
    Extract study items from text content
    This is a simplified version - the actual implementation would be more sophisticated
    """
    study_items = []
    
    # Split text into paragraphs
    paragraphs = re.split(r'\n\s*\n', text)
    
    for i, paragraph in enumerate(paragraphs):
        if paragraph.strip():
            study_items.append({
                'id': i,
                'content': paragraph.strip(),
                'type': 'paragraph'
            })
    
    return study_items