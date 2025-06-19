import re
from typing import List, Dict

class TextProcessor:
    """Enhanced text processing for creating study items"""
    
    def __init__(self):
        self.sentence_endings = r'[.!?]+\s+'
        self.paragraph_breaks = r'\n\s*\n'
    
    def create_smart_chunks(self, text: str, target_length: int = 300, 
                          max_length: int = 600, min_length: int = 50) -> List[Dict]:
        """Create smart text chunks for typing practice"""
        
        # Clean and normalize text
        cleaned_text = self._clean_text(text)
        
        # Split into paragraphs
        paragraphs = self._split_paragraphs(cleaned_text)
        
        # Create chunks
        chunks = []
        current_chunk = []
        current_length = 0
        
        for paragraph in paragraphs:
            para_length = len(paragraph)
            
            # Skip very short paragraphs
            if para_length < min_length:
                continue
            
            # If paragraph alone exceeds max length, split it
            if para_length > max_length:
                sentence_chunks = self._split_long_paragraph(paragraph, max_length)
                chunks.extend(sentence_chunks)
                continue
            
            # If adding this paragraph exceeds max length, save current chunk
            if current_length + para_length > max_length and current_chunk:
                chunk_text = '\n\n'.join(current_chunk)
                chunks.append(self._create_chunk_metadata(chunk_text))
                current_chunk = [paragraph]
                current_length = para_length
            else:
                current_chunk.append(paragraph)
                current_length += para_length
                
                # If we've reached target length, create chunk
                if current_length >= target_length:
                    chunk_text = '\n\n'.join(current_chunk)
                    chunks.append(self._create_chunk_metadata(chunk_text))
                    current_chunk = []
                    current_length = 0
        
        # Add remaining text as final chunk
        if current_chunk:
            chunk_text = '\n\n'.join(current_chunk)
            chunks.append(self._create_chunk_metadata(chunk_text))
        
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common PDF extraction issues
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Fix missing spaces
        text = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', text)  # Fix hyphenated words
        
        # Remove page markers and headers/footers
        text = re.sub(r'--- Page \d+ ---', '', text)
        text = re.sub(r'\[No text found on this page\]', '', text)
        
        return text.strip()
    
    def _split_paragraphs(self, text: str) -> List[str]:
        """Split text into meaningful paragraphs"""
        # Split on double newlines or paragraph indicators
        paragraphs = re.split(self.paragraph_breaks, text)
        
        # Further split very long paragraphs
        processed = []
        for para in paragraphs:
            para = para.strip()
            if len(para) > 1000:  # Very long paragraph
                sentences = re.split(self.sentence_endings, para)
                current_group = []
                current_length = 0
                
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    
                    if current_length + len(sentence) > 500 and current_group:
                        processed.append('. '.join(current_group) + '.')
                        current_group = [sentence]
                        current_length = len(sentence)
                    else:
                        current_group.append(sentence)
                        current_length += len(sentence)
                
                if current_group:
                    processed.append('. '.join(current_group) + '.')
            else:
                if para:
                    processed.append(para)
        
        return processed
    
    def _split_long_paragraph(self, paragraph: str, max_length: int) -> List[Dict]:
        """Split a long paragraph into smaller chunks"""
        sentences = re.split(self.sentence_endings, paragraph)
        chunks = []
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            sentence_length = len(sentence)
            
            if current_length + sentence_length > max_length and current_chunk:
                chunk_text = '. '.join(current_chunk) + '.'
                chunks.append(self._create_chunk_metadata(chunk_text))
                current_chunk = [sentence]
                current_length = sentence_length
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        if current_chunk:
            chunk_text = '. '.join(current_chunk) + '.'
            chunks.append(self._create_chunk_metadata(chunk_text))
        
        return chunks
    
    def _create_chunk_metadata(self, text: str) -> Dict:
        """Create metadata for a text chunk"""
        word_count = len(text.split())
        char_count = len(text)
        
        # Estimate difficulty based on word length and complexity
        avg_word_length = char_count / word_count if word_count > 0 else 0
        complexity_indicators = len(re.findall(r'[;:,()]', text))
        
        if avg_word_length > 6 or complexity_indicators > word_count * 0.1:
            difficulty = 'hard'
        elif avg_word_length > 4 or complexity_indicators > word_count * 0.05:
            difficulty = 'medium'
        else:
            difficulty = 'easy'
        
        # Estimate typing time (assuming 40 WPM average)
        estimated_time = max(1, word_count / 40 * 60)  # in seconds
        
        return {
            'text': text,
            'word_count': word_count,
            'char_count': char_count,
            'difficulty': difficulty,
            'estimated_time': int(estimated_time)
        }
