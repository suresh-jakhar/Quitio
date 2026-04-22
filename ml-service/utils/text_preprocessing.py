import re
import unicodedata

def normalize_text(text: str) -> str:
    """
    Normalize text for better embedding consistency.
    - Trims whitespace
    - Normalizes unicode characters
    - Removes extra newlines/tabs
    """
    if not text:
        return ""
    
    # Unicode normalization (NFKC)
    text = unicodedata.normalize('NFKC', text)
    
    # Replace multiple spaces/newlines/tabs with a single space
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def clean_for_embedding(text: str, max_length: int = 2000) -> str:
    """
    More aggressive cleaning for embedding purposes.
    Can be used to truncate text if it's too long for the model context.
    """
    text = normalize_text(text)
    
    # Truncate to reasonable length (MiniLM has a 256/512 token limit anyway)
    # We truncate by characters here as a rough approximation
    if len(text) > max_length:
        text = text[:max_length]
        
    return text
