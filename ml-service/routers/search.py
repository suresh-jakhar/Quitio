from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from functools import lru_cache
import logging

from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from services.db_service import DBService
from services.graph_store import GraphStore
from services.graph_query import GraphQuery

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependencies — cached singletons so objects are not re-created on every request
@lru_cache(maxsize=1)
def get_embedding_service():
    return EmbeddingService()

@lru_cache(maxsize=1)
def get_db_service():
    return DBService()

def get_vector_store():
    return VectorStore(get_db_service())

def get_graph_store():
    return GraphStore(get_db_service())

def get_graph_query():
    return GraphQuery(get_graph_store(), get_db_service())

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
        logger.info(f"[DEBUG-ML] Incoming semantic search for user {request.user_id}: \"{request.query}\"")
        
        # 1. Embed the query text
        query_embedding = embed_service.embed_text(request.query)
        logger.info(f"[DEBUG-ML] Query embedded successfully.")

        # 2. Search for similar cards in the vector store
        results = await vector_store.find_similar_cards(
            embedding=query_embedding,
            user_id=request.user_id,
            tags=request.tags,
            limit=request.top_k
        )
        logger.info(f"[DEBUG-ML] Found {len(results)} matches in database.")
        
        return SearchResponse(
            query=request.query,
            results=results,
            count=len(results)
        )
    except Exception as e:
        logger.error(f"Vector search endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Search operation failed.")

class KeywordSearchRequest(BaseModel):
    query: str = Field(..., description="The keyword query string.")
    user_id: str = Field(..., description="The UUID of the user performing the search.")
    top_k: int = Field(10, ge=1, le=100, description="Number of results to return.")

@router.post("/keyword", response_model=SearchResponse)
async def keyword_search(
    request: KeywordSearchRequest,
    vector_store: VectorStore = Depends(get_vector_store)
):
    """
    Perform a keyword-based search using PostgreSQL Full-Text Search.
    Results are ranked using ts_rank (BM25-like).
    """
    try:
        logger.info(f"[DEBUG-ML] Incoming keyword search for user {request.user_id}: \"{request.query}\"")
        
        results = await vector_store.bm25_search(
            query=request.query,
            user_id=request.user_id,
            limit=request.top_k
        )
        logger.info(f"[DEBUG-ML] Found {len(results)} keyword matches.")
        
        return SearchResponse(
            query=request.query,
            results=results,
            count=len(results)
        )
    except Exception as e:
        logger.error(f"Keyword search endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Keyword search failed.")

class HybridSearchRequest(BaseModel):
    query: str = Field(..., description="The search query string.")
    user_id: str = Field(..., description="The UUID of the user performing the search.")
    top_k: int = Field(10, ge=1, le=100, description="Number of results to return.")
    vector_weight: float = Field(0.5, ge=0.0, le=1.0, description="Weight for vector search results.")
    keyword_weight: float = Field(0.5, ge=0.0, le=1.0, description="Weight for keyword search results.")

def merge_and_rank_results(
    vector_results: List[dict], 
    keyword_results: List[dict], 
    vector_weight: float, 
    keyword_weight: float, 
    limit: int
) -> List[dict]:
    """
    Combine results from vector and keyword search, normalize scores, and re-rank.
    """
    score_map = {}
    
    # 1. Process Vector Results (already 0-1)
    for res in vector_results:
        card_id = res['id']
        score_map[card_id] = {
            'data': res,
            'vector_score': res['similarity'],
            'keyword_score': 0.0
        }
    
    # 2. Process Keyword Results (ts_rank needs normalization)
    # We'll use a simple max-normalization for this batch
    max_keyword_score = max([res['similarity'] for res in keyword_results]) if keyword_results else 1.0
    if max_keyword_score == 0: max_keyword_score = 1.0
    
    for res in keyword_results:
        card_id = res['id']
        normalized_keyword_score = res['similarity'] / max_keyword_score
        
        if card_id not in score_map:
            score_map[card_id] = {
                'data': res,
                'vector_score': 0.0,
                'keyword_score': normalized_keyword_score
            }
        else:
            score_map[card_id]['keyword_score'] = normalized_keyword_score
    
    # 3. Calculate Hybrid Score
    final_results = []
    for card_id, scores in score_map.items():
        hybrid_score = (vector_weight * scores['vector_score']) + (keyword_weight * scores['keyword_score'])
        
        # Update the similarity in the original data object
        result_item = scores['data']
        result_item['similarity'] = hybrid_score
        final_results.append(result_item)
    
    # 4. Sort and Limit
    final_results.sort(key=lambda x: x['similarity'], reverse=True)
    return final_results[:limit]

@router.post("/hybrid", response_model=SearchResponse)
async def hybrid_search(
    request: HybridSearchRequest,
    embed_service: EmbeddingService = Depends(get_embedding_service),
    vector_store: VectorStore = Depends(get_vector_store)
):
    """
    Perform a hybrid search combining vector similarity and keyword relevance.
    """
    try:
        logger.info(f"[DEBUG-ML] Incoming hybrid search for user {request.user_id}: \"{request.query}\"")
        
        # 1. Get Vector Results
        query_embedding = embed_service.embed_text(request.query)
        vector_results = await vector_store.find_similar_cards(
            embedding=query_embedding,
            user_id=request.user_id,
            limit=request.top_k * 2 # Get more to allow better merging
        )
        
        # 2. Get Keyword Results
        keyword_results = await vector_store.bm25_search(
            query=request.query,
            user_id=request.user_id,
            limit=request.top_k * 2
        )
        
        # 3. Merge and Rank
        merged_results = merge_and_rank_results(
            vector_results=vector_results,
            keyword_results=keyword_results,
            vector_weight=request.vector_weight,
            keyword_weight=request.keyword_weight,
            limit=request.top_k
        )
        
        logger.info(f"[DEBUG-ML] Hybrid search returned {len(merged_results)} unified results.")
        
        return SearchResponse(
            query=request.query,
            results=merged_results,
            count=len(merged_results)
        )
    except Exception as e:
        logger.error(f"Hybrid search endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Hybrid search failed.")

@router.post("/smart", response_model=SearchResponse)
async def smart_search(
    request: VectorSearchRequest,
    embed_service: EmbeddingService = Depends(get_embedding_service),
    vector_store: VectorStore = Depends(get_vector_store),
    query_service: GraphQuery = Depends(get_graph_query)
):
    """
    Advanced Query Engine: semantic search augmented by graph traversal.
    Finds seeds via vector search and then discovers related context via the graph.
    """
    try:
        logger.info(f"[DEBUG-ML] Incoming smart search for user {request.user_id}: \"{request.query}\"")
        
        # 1. Embed the query
        query_embedding = embed_service.embed_text(request.query)
        
        # 2. Use Query Engine for expansion and re-ranking
        results = await query_service.search_with_graph(
            query_embedding=query_embedding,
            user_id=request.user_id,
            vector_store=vector_store,
            top_k=request.top_k,
            query_text=request.query
        )
        
        logger.info(f"[DEBUG-ML] Smart search returned {len(results)} graph-augmented results.")
        
        return SearchResponse(
            query=request.query,
            results=results,
            count=len(results)
        )
    except Exception as e:
        logger.error(f"Smart search endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Smart search failed.")
