import logging
from typing import List
import numpy as np
from services.model_loader import ModelLoader
from config import MODEL_NAME, MODEL_DEVICE

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.loader = ModelLoader(model_name=MODEL_NAME, device=MODEL_DEVICE)
        self.model = self.loader.model

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text string."""
        if not text or not text.strip():
            logger.warning("Attempted to embed empty text.")
            raise ValueError("Text content is required for embedding.")
        
        try:
            # text.strip() to ensure no leading/trailing whitespace issues
            embedding = self.model.encode(text.strip())
            # Ensure L2 normalization for consistent cosine similarity
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of text strings (optimized)."""
        if not texts:
            return []
        
        # Filter out empty strings but keep track of indices if needed
        # For simplicity, we assume the caller sends valid texts
        valid_texts = [t.strip() for t in texts if t and t.strip()]
        
        if not valid_texts:
            logger.warning("All texts in batch were empty.")
            return []

        try:
            logger.debug(f"Generating embeddings for batch of {len(valid_texts)} texts.")
            embeddings = self.model.encode(valid_texts)
            # Ensure L2 normalization for each embedding in the batch
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1e-10, norms)
            normalized_embeddings = embeddings / norms
            return normalized_embeddings.tolist()
        except Exception as e:
            logger.error(f"Error in batch embedding: {e}")
            raise

    def get_dimension(self) -> int:
        """Return the dimension of the embeddings."""
        return self.model.get_sentence_embedding_dimension()
