from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from functools import lru_cache
import logging

from services.retriever import Retriever
from services.vector_store import VectorStore
from services.db_service import DBService
from services.graph_store import GraphStore
from services.graph_query import GraphQuery
from services.embedding_service import EmbeddingService
from utils.llm import llm_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependencies
@lru_cache(maxsize=1)
def get_db_service():
    return DBService()

@lru_cache(maxsize=1)
def get_embedding_service():
    return EmbeddingService()

def get_vector_store():
    return VectorStore(get_db_service())

def get_graph_store():
    return GraphStore(get_db_service())

def get_graph_query():
    return GraphQuery(get_graph_store(), get_db_service())

def get_retriever():
    return Retriever(get_vector_store(), get_graph_query(), get_embedding_service())

class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="The natural language question.")
    user_id: str = Field(..., description="The UUID of the user.")
    top_k: int = Field(5, ge=1, le=20, description="Number of context cards to retrieve.")

class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    context_count: int

@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(
    request: RAGQueryRequest,
    retriever: Retriever = Depends(get_retriever)
):
    """
    RAG Query Pipeline:
    1. Retrieve context cards via graph-augmented hybrid search.
    2. Format context and query for LLM.
    3. Generate synthesized answer.
    """
    try:
        logger.info(f"[RAG] Incoming query for user {request.user_id}: {request.query}")
        
        # 1. Retrieve Context
        context_cards = retriever.retrieve_context(
            query=request.query,
            user_id=request.user_id,
            top_k=request.top_k
        )
        
        if not context_cards:
            return RAGQueryResponse(
                query=request.query,
                answer="I couldn't find any relevant documents to answer your question. Try adding more cards or rephrasing your query.",
                context_count=0
            )
            
        # 2. Generate Answer
        answer = await llm_service.generate_answer(
            query=request.query,
            context_cards=context_cards
        )
        
        return RAGQueryResponse(
            query=request.query,
            answer=answer,
            context_count=len(context_cards)
        )
        
    except Exception as e:
        logger.error(f"RAG query endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")
