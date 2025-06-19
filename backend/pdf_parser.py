# Enhanced PDF parser using PyPDF2
import PyPDF2
import time
import os
import traceback
import logging
import sys
import re

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
        logger.info(f"Initializing PDFParser with file: {file_path}")
        
        # Verify file exists and is readable
        if not os.path.exists(self.file_path):
            error_msg = f"PDF file not found at path: {self.file_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Check if file is readable
        if not os.access(self.file_path, os.R_OK):
            error_msg = f"PDF file is not readable: {self.file_path}"
            logger.error(error_msg)
            raise PermissionError(error_msg)
            
        # Check if file is a valid PDF (sniff the first few bytes)
        try:
            with open(self.file_path, 'rb') as f:
                header = f.read(5)
                if header != b'%PDF-':
                    error_msg = f"File is not a valid PDF: {self.file_path}"
                    logger.error(error_msg)
                    raise ValueError(error_msg)
        except Exception as e:
            logger.error(f"Error checking PDF header: {str(e)}")
            raise ValueError(f"Error checking PDF format: {str(e)}")
        
    def extract_text(self):
        """Extract text content from a PDF file with timing measurement"""
        start_time = time.time()
        
        try:
            logger.info(f"Extracting text from PDF: {self.file_path}")
            
            with open(self.file_path, 'rb') as file:
                try:
                    logger.info("Creating PDF reader")
                    reader = PyPDF2.PdfReader(file)
                    
                    # Log document info
                    num_pages = len(reader.pages)
                    logger.info(f"PDF has {num_pages} pages")
                    
                    # Extract text from each page
                    page_texts = []
                    for page_num in range(num_pages):
                        logger.info(f"Processing page {page_num + 1}")
                        try:
                            page = reader.pages[page_num]
                            page_text = page.extract_text()
                            
                            if page_text:
                                # Add page number for better context
                                page_texts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                            else:
                                page_texts.append(f"--- Page {page_num + 1} ---\n[No text found on this page]")
                                logger.warning(f"No text found on page {page_num + 1}")
                        except Exception as e:
                            # Log the error but continue with other pages
                            logger.error(f"Error extracting text from page {page_num + 1}: {str(e)}")
                            page_texts.append(f"--- Page {page_num + 1} ---\n[Error extracting text from this page: {str(e)}]")
                    
                    # Join all page texts with double newlines
                    self.raw_text = "\n\n".join(page_texts)
                    
                except PyPDF2.errors.PdfReadError as e:
                    error_msg = f"PDF read error: {str(e)}. This may be a corrupted or password-protected PDF."
                    logger.error(error_msg)
                    raise ValueError(error_msg)
                except Exception as e:
                    error_traceback = traceback.format_exc()
                    logger.error(f"Error creating PDF reader: {str(e)}")
                    logger.error(f"Traceback: {error_traceback}")
                    raise ValueError(f"Error processing PDF: {str(e)}")
            
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
            raise ValueError(f"Error extracting PDF content: {str(e)}")
    
    def extract_items(self):
        """
        Extract study items from the PDF, breaking the content into meaningful chunks
        Returns a list of study items suitable for the TypeTutor app
        """
        try:
            logger.info("Extracting study items from PDF")
            
            # First, extract the raw text if not already done
            if not self.raw_text:
                self.extract_text()
            
            # Break the text into meaningful study items
            logger.info("Breaking text into paragraphs")
            paragraphs = self._split_into_paragraphs(self.raw_text)
            
            logger.info(f"Found {len(paragraphs)} potential paragraphs")
            
            # Group paragraphs into reasonable sized chunks (not too small, not too large)
            self.items = []
            current_chunk = []
            current_chunk_size = 0
            target_chunk_size = 200  # Target characters per chunk
            max_chunk_size = 500    # Maximum characters per chunk
            
            for i, paragraph in enumerate(paragraphs):
                paragraph = paragraph.strip()
                if len(paragraph) < 15:  # Skip very small paragraphs
                    continue
                    
                paragraph_size = len(paragraph)
                
                # If adding this paragraph would make the chunk too large,
                # or if it's a section heading (all caps, ends with colon),
                # start a new chunk
                is_heading = re.match(r'^[A-Z][A-Z\s\d:,.]+$', paragraph) is not None
                
                if (current_chunk_size + paragraph_size > max_chunk_size) or (is_heading and current_chunk):
                    # Save the current chunk
                    if current_chunk:
                        chunk_text = "\n\n".join(current_chunk)
                        self.items.append({
                            'id': f'pdf-item-{len(self.items)+1}',
                            'prompt': f'Type this paragraph from PDF (item {len(self.items)+1}):',
                            'content': chunk_text,
                            'type': 'text',
                            'context': f'PDF Content Section {len(self.items)+1}'
                        })
                    
                    # Start a new chunk
                    current_chunk = [paragraph]
                    current_chunk_size = paragraph_size
                else:
                    # Add to current chunk
                    current_chunk.append(paragraph)
                    current_chunk_size += paragraph_size
                    
                    # If we've reached a good size, create a new item
                    if current_chunk_size >= target_chunk_size:
                        chunk_text = "\n\n".join(current_chunk)
                        self.items.append({
                            'id': f'pdf-item-{len(self.items)+1}',
                            'prompt': f'Type this paragraph from PDF (item {len(self.items)+1}):',
                            'content': chunk_text,
                            'type': 'text',
                            'context': f'PDF Content Section {len(self.items)+1}'
                        })
                        current_chunk = []
                        current_chunk_size = 0
            
            # Add any remaining paragraphs
            if current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                self.items.append({
                    'id': f'pdf-item-{len(self.items)+1}',
                    'prompt': f'Type this paragraph from PDF (item {len(self.items)+1}):',
                    'content': chunk_text,
                    'type': 'text',
                    'context': f'PDF Content Section {len(self.items)+1}'
                })
            
            logger.info(f"Created {len(self.items)} study items")
            
            # If no items were created but we have raw text, create at least one item
            if not self.items and self.raw_text.strip():
                logger.info("No paragraphs met the criteria. Creating a single item with all text.")
                
                # Truncate if it's too long
                text = self.raw_text.strip()
                if len(text) > 2000:
                    logger.info(f"Text is too long ({len(text)} chars), truncating to 2000 chars")
                    text = text[:1997] + "..."
                    
                self.items.append({
                    'id': 'pdf-text-1',
                    'prompt': 'Type this text from PDF:',
                    'content': text,
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
        """Split text into paragraphs based on double newlines and other heuristics"""
        try:
            # Replace triple or more newlines with double newlines for consistency
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            # Split on double newlines
            paragraphs = text.split('\n\n')
            
            # Further process paragraphs
            processed_paragraphs = []
            for p in paragraphs:
                p = p.strip()
                
                # Skip empty paragraphs and page markers
                if not p or p.startswith('--- Page'):
                    continue
                
                # If the paragraph is very long and has single newlines,
                # it might be multiple paragraphs joined by single newlines
                if len(p) > 500 and '\n' in p:
                    # Split potentially into separate paragraphs
                    sub_paragraphs = p.split('\n')
                    for sub_p in sub_paragraphs:
                        sub_p = sub_p.strip()
                        if sub_p and len(sub_p) > 15:  # Reasonable minimum for paragraphs
                            processed_paragraphs.append(sub_p)
                else:
                    processed_paragraphs.append(p)
            
            return processed_paragraphs
            
        except Exception as e:
            logger.error(f"Error splitting paragraphs: {str(e)}")
            # Return the original text as a single paragraph if there's an error
            return [text] if text.strip() else []

def get_pdf_support_status():
    """Return information about PDF support"""
    try:
        import PyPDF2
        return {
            'pymupdf_available': False,  # Not using PyMuPDF
            'pypdf2_available': True,    # Using PyPDF2
            'pdf_support': True,
            'version': sys.version,
            'pypdf2_version': PyPDF2.__version__,
            'message': f'PDF support is available using PyPDF2 version {PyPDF2.__version__}'
        }
    except ImportError:
        return {
            'pymupdf_available': False,
            'pypdf2_available': False,
            'pdf_support': False,
            'version': sys.version,
            'message': 'PyPDF2 is not installed. PDF support is unavailable.'
        }