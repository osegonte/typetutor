import PyPDF2
import time
import os
import traceback
from typing import List, Dict, Optional
from utils.logging_config import get_logger
from utils.text_processor import TextProcessor
from utils.cache import cache_pdf_extraction

class EnhancedPDFParser:
    """Enhanced PDF parser with better error handling and caching"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.logger = get_logger(__name__)
        self.text_processor = TextProcessor()
        self.metadata = {}
        self.processing_time = 0
        
        # Validate file
        self._validate_file()
    
    def _validate_file(self):
        """Validate PDF file before processing"""
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"PDF file not found: {self.file_path}")
        
        if not os.access(self.file_path, os.R_OK):
            raise PermissionError(f"PDF file is not readable: {self.file_path}")
        
        # Check PDF header
        try:
            with open(self.file_path, 'rb') as f:
                header = f.read(5)
                if header != b'%PDF-':
                    raise ValueError(f"Invalid PDF file: {self.file_path}")
        except Exception as e:
            raise ValueError(f"Error validating PDF: {e}")
    
    @cache_pdf_extraction
    def extract_text(self) -> Dict:
        """Extract text with caching and timing"""
        start_time = time.time()
        
        try:
            self.logger.info(f"Extracting text from PDF: {self.file_path}")
            
            with open(self.file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                
                # Extract metadata
                self.metadata = {
                    'pages': len(reader.pages),
                    'title': 'Unknown',
                    'author': 'Unknown',
                    'parser_used': 'PyPDF2'
                }
                
                # Try to get metadata
                if reader.metadata:
                    self.metadata.update({
                        'title': reader.metadata.get('/Title', 'Unknown'),
                        'author': reader.metadata.get('/Author', 'Unknown')
                    })
                
                # Extract text from pages
                pages_text = []
                failed_pages = []
                
                for page_num, page in enumerate(reader.pages):
                    try:
                        text = page.extract_text()
                        if text and text.strip():
                            pages_text.append({
                                'page': page_num + 1,
                                'text': text.strip(),
                                'char_count': len(text)
                            })
                        else:
                            self.logger.warning(f"No text on page {page_num + 1}")
                    except Exception as e:
                        failed_pages.append(page_num + 1)
                        self.logger.error(f"Failed to extract page {page_num + 1}: {e}")
                
                self.processing_time = time.time() - start_time
                
                result = {
                    'pages_text': pages_text,
                    'failed_pages': failed_pages,
                    'metadata': self.metadata,
                    'processing_time': self.processing_time
                }
                
                self.logger.info(f"Extracted {len(pages_text)} pages in {self.processing_time:.2f}s")
                return result
                
        except PyPDF2.errors.PdfReadError as e:
            raise ValueError(f"PDF read error: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            raise ValueError(f"Error processing PDF: {e}")
    
    def create_study_items(self, extracted_data: Dict) -> List[Dict]:
        """Create optimized study items"""
        if not extracted_data['pages_text']:
            return [{
                'id': 'pdf-error-1',
                'prompt': 'No text could be extracted from this PDF',
                'content': 'This PDF may be image-based or password protected. Try a different file or copy/paste text directly.',
                'type': 'text',
                'context': 'PDF Processing Error'
            }]
        
        # Combine all text
        all_text = "\n\n".join([page['text'] for page in extracted_data['pages_text']])
        
        # Create smart chunks
        chunks = self.text_processor.create_smart_chunks(all_text)
        
        # Convert to study items
        items = []
        for i, chunk in enumerate(chunks):
            items.append({
                'id': f'pdf-item-{i+1}',
                'prompt': f'Type this text from the PDF (section {i+1}/{len(chunks)}):',
                'content': chunk['text'],
                'type': 'text',
                'context': f'PDF Section {i+1}',
                'difficulty': chunk.get('difficulty', 'medium'),
                'word_count': chunk.get('word_count', 0),
                'estimated_time': chunk.get('estimated_time', 0),
                'metadata': {
                    'source': 'pdf',
                    'total_sections': len(chunks),
                    'pdf_title': extracted_data['metadata'].get('title', 'Unknown')
                }
            })
        
        self.logger.info(f"Created {len(items)} study items")
        return items
    
    def extract_items(self) -> List[Dict]:
        """Main method to extract study items from PDF"""
        try:
            extracted_data = self.extract_text()
            return self.create_study_items(extracted_data)
        except Exception as e:
            self.logger.error(f"Error in extract_items: {e}")
            return [{
                'id': 'pdf-error-1',
                'prompt': 'Error processing PDF:',
                'content': f"Error: {str(e)}. Please try a different file.",
                'type': 'text',
                'context': 'PDF Processing Error'
            }]

class PDFService:
    """Service class for handling PDF operations"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
    
    def process_upload(self, file) -> Dict:
        """Process uploaded PDF file"""
        start_time = time.time()
        
        try:
            # Save file temporarily
            temp_path = os.path.join('uploads', file.filename)
            file.save(temp_path)
            
            # Process with enhanced parser
            parser = EnhancedPDFParser(temp_path)
            items = parser.extract_items()
            
            processing_time = time.time() - start_time
            
            # Clean up temporary file
            try:
                os.remove(temp_path)
            except OSError:
                self.logger.warning(f"Could not remove temp file: {temp_path}")
            
            return {
                'success': True,
                'items': items,
                'processing_time': processing_time,
                'item_count': len(items),
                'metadata': getattr(parser, 'metadata', {})
            }
            
        except Exception as e:
            # Clean up on error
            try:
                if 'temp_path' in locals():
                    os.remove(temp_path)
            except OSError:
                pass
            
            self.logger.error(f"Error processing upload: {e}")
            raise

def get_pdf_support_status():
    """Get PDF support status"""
    try:
        import PyPDF2
        return {
            'pymupdf_available': False,
            'pypdf2_available': True,
            'pdf_support': True,
            'version': PyPDF2.__version__,
            'message': f'PDF support available using PyPDF2 v{PyPDF2.__version__}'
        }
    except ImportError:
        return {
            'pymupdf_available': False,
            'pypdf2_available': False,
            'pdf_support': False,
            'message': 'PyPDF2 not available'
        }
