from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from functools import lru_cache
import logging

from services.retriever import Retriever
from services.citations import CitationTracker
from services.agentic_rag import AgenticRAG
from services.verification import AnswerVerifier
from services.no_results import NoResultsHandler
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

def get_citation_tracker():
    return CitationTracker()

def get_answer_verifier():
    return AnswerVerifier()

def get_no_results_handler():
    return NoResultsHandler(get_db_service())

def get_retriever():
    return Retriever(get_vector_store(), get_graph_query(), get_embedding_service())

def get_agentic_rag():
    return AgenticRAG(get_retriever(), get_citation_tracker())

class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="The natural language question.")
    user_id: str = Field(..., description="The UUID of the user.")
    top_k: int = Field(5, ge=1, le=20, description="Number of context cards per hop.")
    multi_hop: bool = Field(False, description="Enable recursive reasoning.")
    verify: bool = Field(True, description="Enable self-verification to reduce hallucinations.")

class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    context_count: int
    citations: Optional[dict] = None
    hops_used: int = 1
    is_multi_hop: bool = False
    verification: Optional[dict] = None
    suggestions: Optional[List[str]] = None

@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(
    request: RAGQueryRequest,
    retriever: Retriever = Depends(get_retriever),
    citation_tracker: CitationTracker = Depends(get_citation_tracker),
    agentic_rag: AgenticRAG = Depends(get_agentic_rag),
    verifier: AnswerVerifier = Depends(get_answer_verifier),
    no_results_handler: NoResultsHandler = Depends(get_no_results_handler)
):
    """
    RAG Query Pipeline:
    1. Retrieve context cards (Basic or Multi-Hop).
    2. Handle empty results (Phase 33).
    3. Generate synthesized answer.
    4. Extract citations.
    5. Verify answer.
    """
    try:
        logger.info(f"[RAG] Incoming query for user {request.user_id}: {request.query}")
        
        # 1. Context Retrieval
        all_context_cards = []
        hops_used = 1
        is_multi_hop = request.multi_hop
        
        if request.multi_hop:
            result = await agentic_rag.multi_hop_query(
                query=request.query,
                user_id=request.user_id,
                top_k=request.top_k,
                max_hops=2
            )
            
            if not result["answer"]:
                no_res = await no_results_handler.handle_no_results(request.query, request.user_id)
                return RAGQueryResponse(
                    query=request.query,
                    answer=no_res["answer"],
                    context_count=0,
                    suggestions=no_res.get("suggestions"),
                    verification=no_res.get("verification")
                )

            answer = result["answer"]
            hops_used = result["hops_used"]
            context_count = result["context_count"]
            # For simplicity, we assume multi-hop handles its own "no info" internally 
            # but we can still check the final answer
            if "I couldn't find any relevant documents" in answer or "I don't have information" in answer:
                all_context_cards = []
            else:
                return RAGQueryResponse(
                    query=request.query,
                    answer=answer,
                    context_count=context_count,
                    citations=result["citations"],
                    hops_used=hops_used,
                    is_multi_hop=True
                )
        else:
            all_context_cards = await retriever.retrieve_context(
                query=request.query,
                user_id=request.user_id,
                top_k=request.top_k
            )

        # 2. Handle No Results (Phase 33)
        if not all_context_cards:
            result = await no_results_handler.handle_no_results(request.query, request.user_id)
            return RAGQueryResponse(
                query=request.query,
                answer=result["answer"],
                context_count=0,
                suggestions=result.get("suggestions"),
                verification=result.get("verification")
            )

        # 3. Generate Answer
        answer = await llm_service.generate_answer(
            query=request.query,
            context_cards=all_context_cards
        )

        # 4. Extract Citations
        citations = citation_tracker.extract_citations(answer, all_context_cards)
        
        # 5. Self-Verification
        verification_result = None
        if request.verify:
            verification_result = await verifier.verify_answer(
                query=request.query,
                answer=answer,
                context_cards=all_context_cards
            )
            
            # Mitigation for low confidence
            if verification_result["confidence"] < 0.6:
                logger.warning(f"[RAG] Low confidence ({verification_result['confidence']}). Adding disclaimer.")
                answer = f"[Note: The system has low confidence in this answer.]\n\n{answer}"
        
        return RAGQueryResponse(
            query=request.query,
            answer=answer,
            context_count=len(all_context_cards),
            citations=citations,
            hops_used=hops_used,
            is_multi_hop=is_multi_hop,
            verification=verification_result
        )
        
    except Exception as e:
        logger.error(f"RAG query endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")
