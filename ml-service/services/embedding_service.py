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
        """
        Generate embedding for a single text string using chunking and mean pooling.
        Ensures long documents are fully represented.
        """
        if not text or not text.strip():
            logger.warning("Attempted to embed empty text.")
            raise ValueError("Text content is required for embedding.")
        
        try:
            # Issue 4 Fix: Chunking (300 words, 50 overlap)
            chunks = self._chunk_text(text.strip())
            
            if len(chunks) == 1:
                embedding = self.model.encode(chunks[0])
            else:
                logger.debug(f"Embedding long text in {len(chunks)} chunks.")
                chunk_embeddings = self.model.encode(chunks)
                
                # Issue 5 Fix: Weighted Mean Pooling (Phase 2)
                # Weight each chunk by its length (word count) to favor dense chunks
                weights = np.array([len(c.split()) for c in chunks])
                # Softmax-like normalization or simple linear? Linear is safer for density.
                weights = weights / np.sum(weights)
                
                embedding = np.average(chunk_embeddings, axis=0, weights=weights)

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

    def _chunk_text(self, text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks of words."""
        words = text.split()
        if len(words) <= chunk_size:
            return [text]
        
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i : i + chunk_size])
            chunks.append(chunk)
            if i + chunk_size >= len(words):
                break
        return chunks
