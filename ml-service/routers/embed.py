from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)
router = APIRouter()

# Singleton-like dependency for the service
_embedding_service = None

def get_embedding_service():
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service

class EmbedRequest(BaseModel):
    text: str = Field(..., description="The text to generate an embedding for.")

class EmbedBatchRequest(BaseModel):
    texts: List[str] = Field(..., description="A list of texts to generate embeddings for.")

class EmbedResponse(BaseModel):
    embedding: List[float]
    dimension: int
    model: str

class EmbedBatchResponse(BaseModel):
    embeddings: List[List[float]]
    count: int
    dimension: int
    model: str

@router.post("", response_model=EmbedResponse)
async def embed(
    request: EmbedRequest, 
    service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Generate a semantic embedding for a single piece of text.
    Used during card creation and for query embedding.
    """
    try:
        embedding = service.embed_text(request.text)
        return EmbedResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=service.loader.model_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Embedding endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate embedding.")

@router.post("/batch", response_model=EmbedBatchResponse)
async def embed_batch(
    request: EmbedBatchRequest,
    service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Generate embeddings for multiple texts in a single request.
    Optimized for bulk processing.
    """
    try:
        embeddings = service.embed_batch(request.texts)
        if not embeddings:
            raise ValueError("No valid text provided in batch.")
            
        return EmbedBatchResponse(
            embeddings=embeddings,
            count=len(embeddings),
            dimension=len(embeddings[0]),
            model=service.loader.model_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch embedding endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate batch embeddings.")
