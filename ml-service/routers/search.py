from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from services.db_service import DBService

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependencies
def get_embedding_service():
    return EmbeddingService()

def get_vector_store():
    db_service = DBService()
    return VectorStore(db_service)

class VectorSearchRequest(BaseModel):
    query: str = Field(..., description="The natural language query string.")
    user_id: str = Field(..., description="The UUID of the user performing the search.")
    top_k: int = Field(10, ge=1, le=100, description="Number of results to return.")
    tags: Optional[List[str]] = Field(None, description="Optional list of tags to filter by.")

class SearchResult(BaseModel):
    id: str
    title: str
    content_type: str
    similarity: float

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    count: int

@router.post("/vector", response_model=SearchResponse)
async def vector_search(
    request: VectorSearchRequest,
    embed_service: EmbeddingService = Depends(get_embedding_service),
    vector_store: VectorStore = Depends(get_vector_store)
):
    """
    Perform a semantic similarity search using pgvector.
    The query is first embedded into a vector, then used to find the most 
    similar cards in the database.
    """
    try:
        # 1. Embed the query text
        query_embedding = embed_service.embed_text(request.query)
        
        # 2. Search for similar cards in the vector store
        results = vector_store.find_similar_cards(
            embedding=query_embedding,
            user_id=request.user_id,
            tags=request.tags,
            limit=request.top_k
        )
        
        return SearchResponse(
            query=request.query,
            results=results,
            count=len(results)
        )
    except Exception as e:
        logger.error(f"Vector search endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Search operation failed.")

@router.post("/keyword")
async def keyword_search():
    # Stub for Phase 23
    return {"message": "Keyword search endpoint stub"}

@router.post("/hybrid")
async def hybrid_search():
    # Stub for Phase 24
    return {"message": "Hybrid search endpoint stub"}
