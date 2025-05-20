# Simple PDF parser using PyPDF2

import PyPDF2

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