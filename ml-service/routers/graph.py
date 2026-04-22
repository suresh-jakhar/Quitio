from fastapi import APIRouter

router = APIRouter()

@router.post("/build")
async def build_graph():
    # Stub for Phase 25
    return {"message": "Graph build endpoint stub"}
