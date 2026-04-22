from fastapi import APIRouter

router = APIRouter()

@router.post("/query")
async def rag_query():
    # Stub for Phase 28
    return {"message": "RAG query endpoint stub"}
