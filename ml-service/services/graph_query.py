import logging
from typing import List, Dict, Set
from services.graph_store import GraphStore
from services.db_service import DBService

logger = logging.getLogger(__name__)

class GraphQuery:
    def __init__(self, graph_store: GraphStore, db_service: DBService):
        self.graph_store = graph_store
        self.db_service = db_service

    def get_neighbors(self, card_id: str, depth: int = 2, limit: int = 20) -> List[dict]:
        """
        Retrieves multi-hop neighbors for a given card using a depth-first traversal.
        Scores are decayed based on the distance from the source card.
        """
        visited: Set[str] = set()
        results: dict = {}
        
        def traverse(current_id: str, current_depth: int, accumulated_score: float):
            # Base case: max depth reached or already visited in this traversal path
            if current_depth <= 0:
                return
            
            visited.add(current_id)
            
            # Get immediate neighbors of current card
            # We fetch more than the limit to ensure we have enough candidates for multi-hop
            neighbors = self.graph_store.get_neighbors(current_id, limit=50)
            
            for n in neighbors:
                neighbor_id = n['target_id']
                similarity = n['similarity']
                edge_type = n['edge_type']
                reason = n['reason']
                
                # Decay score by distance (depth)
                # Distance = (original_depth - current_depth + 1)
                distance = (depth - current_depth + 1)
                combined_score = accumulated_score * similarity / distance
                
                # If we haven't seen this neighbor or found a better path to it
                if neighbor_id not in results or results[neighbor_id]['score'] < combined_score:
                    results[neighbor_id] = {
                        'id': neighbor_id,
                        'score': combined_score,
                        'distance': distance,
                        'edge_type': edge_type,
                        'reason': reason
                    }
                
                # Recurse if we haven't visited this node yet (to prevent cycles)
                if neighbor_id not in visited:
                    traverse(neighbor_id, current_depth - 1, combined_score)

        # Start traversal from the source card
        traverse(card_id, depth, 1.0)
        
        # Remove the source card itself if it ended up in results
        if card_id in results:
            del results[card_id]
            
        # Sort by combined score descending
        sorted_results = sorted(
            results.values(),
            key=lambda x: x['score'],
            reverse=True
        )[:limit]
        
        # Enrich results with card metadata (title, content_type)
        return self._enrich_card_details(sorted_results)

    def _enrich_card_details(self, results: List[dict]) -> List[dict]:
        """Fetch title and content_type for the final set of cards."""
        if not results:
            return []
            
        card_ids = [r['id'] for r in results]
        
        try:
            with self.db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, title, content_type FROM cards WHERE id = ANY(%s)",
                        (card_ids,)
                    )
                    rows = cur.fetchall()
                    
                    # Map metadata by ID
                    meta_map = {str(row[0]): {"title": row[1], "content_type": row[2]} for row in rows}
                    
                    # Update results
                    for r in results:
                        meta = meta_map.get(r['id'], {})
                        r.update(meta)
                        
            return results
        except Exception as e:
            logger.error(f"Error enriching card details for graph results: {e}")
            return results
