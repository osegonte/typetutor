import pytest
import os
from unittest.mock import Mock, patch
from backend.services.pdf_service import PDFService, EnhancedPDFParser

class TestEnhancedPDFParser:
    def test_parser_initialization_with_invalid_file(self):
        """Test parser initialization with non-existent file"""
        with pytest.raises(FileNotFoundError):
            EnhancedPDFParser('nonexistent.pdf')
    
    @patch('backend.services.pdf_service.PyPDF2.PdfReader')
    def test_extract_text_success(self, mock_reader):
        """Test successful text extraction"""
        # Mock PDF reader
        mock_page = Mock()
        mock_page.extract_text.return_value = "Sample text from PDF"
        
        mock_reader_instance = Mock()
        mock_reader_instance.pages = [mock_page]
        mock_reader_instance.metadata = {'/Title': 'Test PDF', '/Author': 'Test Author'}
        mock_reader.return_value = mock_reader_instance
        
        # Create a temporary file for testing
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(b'%PDF-1.4\nTest content')
            temp_file_path = temp_file.name
        
        try:
            parser = EnhancedPDFParser(temp_file_path)
            result = parser.extract_text()
            
            assert 'pages_text' in result
            assert 'metadata' in result
            assert len(result['pages_text']) == 1
            assert result['pages_text'][0]['text'] == "Sample text from PDF"
        finally:
            os.unlink(temp_file_path)
    
    def test_create_study_items_with_empty_data(self):
        """Test study item creation with no extracted text"""
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(b'%PDF-1.4\nTest content')
            temp_file_path = temp_file.name
        
        try:
            parser = EnhancedPDFParser(temp_file_path)
            extracted_data = {'pages_text': [], 'failed_pages': [], 'metadata': {}}
            items = parser.create_study_items(extracted_data)
            
            assert len(items) == 1
            assert 'error' in items[0]['id']
        finally:
            os.unlink(temp_file_path)

class TestPDFService:
    def test_pdf_service_initialization(self):
        """Test PDF service can be initialized"""
        service = PDFService()
        assert service is not None
    
    @patch('backend.services.pdf_service.EnhancedPDFParser')
    def test_process_upload_success(self, mock_parser_class):
        """Test successful PDF upload processing"""
        # Mock file
        mock_file = Mock()
        mock_file.filename = 'test.pdf'
        mock_file.save = Mock()
        
        # Mock parser
        mock_parser = Mock()
        mock_parser.extract_items.return_value = [
            {'id': 'test-1', 'content': 'Test content', 'type': 'text'}
        ]
        mock_parser_class.return_value = mock_parser
        
        service = PDFService()
        
        with patch('os.remove'):
            result = service.process_upload(mock_file)
        
        assert result['success'] is True
        assert 'items' in result
        assert len(result['items']) == 1
