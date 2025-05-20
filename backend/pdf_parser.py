# Enhanced PDF parser using PyPDF2
import PyPDF2
import time
import os
import traceback
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('pdf_parser')

class PDFParser:
    """
    A class to handle PDF parsing with more robust features
    """
    def __init__(self, file_path):
        self.file_path = file_path
        self.raw_text = ""
        self.items = []
        self.processing_time = 0
        
    def extract_text(self):
        """Extract text content from a PDF file with timing measurement"""
        start_time = time.time()
        
        try:
            logger.info(f"Opening PDF file: {self.file_path}")
            
            # Check if file exists
            if not os.path.exists(self.file_path):
                raise FileNotFoundError(f"PDF file not found at path: {self.file_path}")
            
            # Check if file is readable
            if not os.access(self.file_path, os.R_OK):
                raise PermissionError(f"PDF file is not readable: {self.file_path}")
            
            with open(self.file_path, 'rb') as file:
                try:
                    logger.info("Creating PDF reader")
                    reader = PyPDF2.PdfReader(file)
                    
                    # Log document info
                    num_pages = len(reader.pages)
                    logger.info(f"PDF has {num_pages} pages")
                    
                    # Extract text from each page
                    for page_num in range(num_pages):
                        logger.info(f"Processing page {page_num + 1}")
                        try:
                            page = reader.pages[page_num]
                            page_text = page.extract_text()
                            
                            # Add page number for better context
                            self.raw_text += f"--- Page {page_num + 1} ---\n{page_text}\n\n"
                        except Exception as e:
                            # Log the error but continue with other pages
                            logger.error(f"Error extracting text from page {page_num + 1}: {str(e)}")
                            self.raw_text += f"--- Page {page_num + 1} ---\n[Error extracting text from this page]\n\n"
                except Exception as e:
                    error_traceback = traceback.format_exc()
                    logger.error(f"Error creating PDF reader: {str(e)}")
                    logger.error(f"Traceback: {error_traceback}")
                    raise Exception(f"Error processing PDF: {str(e)}")
            
            self.processing_time = time.time() - start_time
            logger.info(f"PDF processing completed in {self.processing_time:.2f} seconds")
            
            # If no text was extracted but no errors were raised, add a message
            if not self.raw_text.strip():
                logger.warning("No text was extracted from the PDF")
                self.raw_text = "No text could be extracted from this PDF. The file might be scanned/image-based or protected."
                
            return self.raw_text
        except Exception as e:
            error_traceback = traceback.format_exc()
            logger.error(f"Error in extract_text: {str(e)}")
            logger.error(f"Traceback: {error_traceback}")
            raise Exception(f"Error extracting PDF content: {str(e)}")
    
    def extract_items(self):
        """
        Extract study items from the PDF, breaking the content into meaningful chunks
        Returns a list of study items suitable for the TypeTutor app
        """
        try:
            logger.info("Extracting study items from PDF")
            
            # First, extract the raw text
            if not self.raw_text:
                self.extract_text()
            
            # Break the text into meaningful study items
            logger.info("Breaking text into paragraphs")
            paragraphs = self._split_into_paragraphs(self.raw_text)
            
            logger.info(f"Found {len(paragraphs)} potential paragraphs")
            
            self.items = []
            for i, paragraph in enumerate(paragraphs):
                if len(paragraph.strip()) > 20:  # Only include paragraphs with meaningful content
                    self.items.append({
                        'id': f'pdf-item-{i+1}',
                        'prompt': f'Type this paragraph from PDF (item {i+1}):',
                        'content': paragraph.strip(),
                        'type': 'text',
                        'context': f'PDF Content Section {i+1}'
                    })
            
            logger.info(f"Created {len(self.items)} study items")
            
            # If no items were created but we have raw text, create at least one item
            if not self.items and self.raw_text.strip():
                logger.info("No paragraphs met the criteria. Creating a single item with all text.")
                self.items.append({
                    'id': 'pdf-text-1',
                    'prompt': 'Type this text from PDF:',
                    'content': self.raw_text.strip(),
                    'type': 'text',
                    'context': 'PDF Content'
                })
            
            return self.items
            
        except Exception as e:
            error_traceback = traceback.format_exc()
            logger.error(f"Error in extract_items: {str(e)}")
            logger.error(f"Traceback: {error_traceback}")
            
            # Return at least one item with the error information
            return [{
                'id': 'pdf-error-1',
                'prompt': 'An error occurred while processing the PDF:',
                'content': f"Error: {str(e)}. Please try a different file or copy/paste your text directly.",
                'type': 'text',
                'context': 'PDF Processing Error'
            }]
    
    def _split_into_paragraphs(self, text):
        """Split text into paragraphs based on double newlines"""
        try:
            # Replace triple or more newlines with double newlines for consistency
            import re
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            # Split on double newlines
            paragraphs = text.split('\n\n')
            
            # Filter out empty paragraphs and those that are just page markers
            filtered_paragraphs = []
            for p in paragraphs:
                p = p.strip()
                if p and not p.startswith('--- Page') and len(p) > 10:
                    filtered_paragraphs.append(p)
            
            return filtered_paragraphs
            
        except Exception as e:
            logger.error(f"Error splitting paragraphs: {str(e)}")
            # Return the original text as a single paragraph if there's an error
            return [text] if text.strip() else []

def extract_content_from_pdf(file_path):
    """Legacy function for backward compatibility"""
    logger.info(f"Using legacy extract_content_from_pdf function with file: {file_path}")
    try:
        parser = PDFParser(file_path)
        return parser.extract_text()
    except Exception as e:
        logger.error(f"Error in extract_content_from_pdf: {str(e)}")
        raise Exception(f"Error extracting PDF content: {str(e)}")

def get_pdf_support_status():
    """Return information about PDF support"""
    try:
        import PyPDF2
        return {
            'pymupdf_available': False,  # Not using PyMuPDF in this implementation
            'pypdf2_available': True,    # Using PyPDF2
            'pdf_support': True,
            'message': f'PDF support is available using PyPDF2 version {PyPDF2.__version__}'
        }
    except ImportError:
        return {
            'pymupdf_available': False,
            'pypdf2_available': False,
            'pdf_support': False,
            'message': 'PyPDF2 is not installed. PDF support is unavailable.'
        }