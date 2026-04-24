from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from services.db_service import DBService
from services.vector_store import VectorStore
from services.graph_store import GraphStore
from services.graph_builder import GraphBuilder

from services.graph_query import GraphQuery

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependencies
def get_graph_builder():
    db_service = DBService()
    vector_store = VectorStore(db_service)
    graph_store = GraphStore(db_service)
    return GraphBuilder(vector_store, graph_store)

def get_graph_query():
    db_service = DBService()
    graph_store = GraphStore(db_service)
    return GraphQuery(graph_store, db_service)

class GraphBuildRequest(BaseModel):
    user_id: str = Field(..., description="The UUID of the user to rebuild the graph for.")
    semantic_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum similarity score to create a semantic edge.")
    top_k: Optional[int] = Field(None, description="Number of neighbors per node.")

@router.post("/build")
async def build_graph(
    request: GraphBuildRequest,
    background_tasks: BackgroundTasks,
    builder: GraphBuilder = Depends(get_graph_builder)
):
    """
    Triggers a rebuild of the knowledge graph for a user.
    This is an expensive operation and is performed in the background.
    """
    try:
        logger.info(f"Received graph build request for user: {request.user_id}")
        
        # We run it as a background task because it can be slow for many cards
        background_tasks.add_task(
            builder.build_user_graph,
            user_id=request.user_id,
            semantic_threshold=request.semantic_threshold,
            top_k=request.top_k
        )
        
        return {
            "status": "accepted",
            "message": "Graph building task started in background",
            "user_id": request.user_id
        }
    except Exception as e:
        logger.error(f"Error starting graph build: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate graph build.")

@router.get("/neighbors/{card_id}")
async def get_neighbors(
    card_id: str,
    depth: int = 2,
    limit: int = 20,
    query_service: GraphQuery = Depends(get_graph_query)
):
    """
    Retrieve related cards for a given card ID by traversing the knowledge graph.
    Supports multi-hop traversal with score decay.
    """
    try:
        logger.info(f"Fetching neighbors for card {card_id} with depth {depth}")
        neighbors = query_service.get_neighbors(card_id, depth=depth, limit=limit)
        
        return {
            "source_card_id": card_id,
            "neighbors": neighbors,
            "count": len(neighbors)
        }
    except Exception as e:
        logger.error(f"Error fetching neighbors for card {card_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch neighbors.")

@router.post("/incremental-update")
async def incremental_update(
    card_id: str,
    user_id: str,
    background_tasks: BackgroundTasks,
    builder: GraphBuilder = Depends(get_graph_builder)
):
    """
    Triggers an incremental update of the knowledge graph for a single card.
    """
    try:
        logger.info(f"Received incremental graph update request for card: {card_id}")
        background_tasks.add_task(builder.update_card_edges, card_id=card_id, user_id=user_id)
        return {"status": "accepted", "message": "Incremental graph update started"}
    except Exception as e:
        logger.error(f"Error starting incremental update: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate incremental update.")

@router.delete("/card/{card_id}")
async def delete_card_edges(
    card_id: str,
    builder: GraphBuilder = Depends(get_graph_builder)
):
    """
    Removes a card and its associated edges from the knowledge graph.
    """
    try:
        builder.graph_store.delete_card_edges(card_id)
        return {"status": "success", "message": f"Edges for card {card_id} deleted"}
    except Exception as e:
        logger.error(f"Error deleting card edges: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete card edges.")
