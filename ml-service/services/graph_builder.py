import logging
import numpy as np
from typing import List, dict
from services.vector_store import VectorStore
from services.graph_store import GraphStore

logger = logging.getLogger(__name__)

class GraphBuilder:
    def __init__(self, vector_store: VectorStore, graph_store: GraphStore):
        self.vector_store = vector_store
        self.graph_store = graph_store

    def compute_cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        a = np.array(vec_a)
        b = np.array(vec_b)
        if np.all(a == 0) or np.all(b == 0):
            return 0.0
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def build_user_graph(self, 
                         user_id: str, 
                         semantic_threshold: float = 0.7,
                         min_shared_tags: int = 1):
        """
        Constructs a knowledge graph for a user based on semantic similarity and shared tags.
        """
        logger.info(f"Building knowledge graph for user {user_id}...")
        
        # 1. Fetch all user cards with embeddings and tags
        cards = self.vector_store.get_user_cards(user_id)
        if not cards:
            logger.info(f"No cards found for user {user_id}. Skipping graph build.")
            return
        
        # 2. Clear old edges for this user
        self.graph_store.delete_user_edges(user_id)
        
        edge_count = 0
        
        # 3. Compute relationships
        for i, card_a in enumerate(cards):
            for j, card_b in enumerate(cards):
                if i == j:
                    continue
                
                # Check semantic similarity
                semantic_score = self.compute_cosine_similarity(
                    card_a['embedding'], 
                    card_b['embedding']
                )
                
                # Check shared tags
                tags_a = set(card_a['tags'])
                tags_b = set(card_b['tags'])
                shared_tags = tags_a.intersection(tags_b)
                
                is_semantic = semantic_score >= semantic_threshold
                is_tag_based = len(shared_tags) >= min_shared_tags
                
                if is_semantic or is_tag_based:
                    reasons = []
                    edge_type = 'hybrid'
                    
                    if is_semantic and is_tag_based:
                        edge_type = 'hybrid'
                        reasons.append(f"Semantic similarity: {semantic_score:.2f}")
                        reasons.append(f"Shared tags: {', '.join(list(shared_tags))}")
                    elif is_semantic:
                        edge_type = 'semantic'
                        reasons.append(f"Semantic similarity: {semantic_score:.2f}")
                    else:
                        edge_type = 'tag_based'
                        reasons.append(f"Shared tags: {', '.join(list(shared_tags))}")
                    
                    # Store the edge
                    # Primary score is semantic similarity if available
                    final_score = float(semantic_score) if is_semantic else float(len(shared_tags) / max(len(tags_a), 1))
                    
                    self.graph_store.add_edge(
                        source_id=card_a['id'],
                        target_id=card_b['id'],
                        similarity=final_score,
                        edge_type=edge_type,
                        reason="; ".join(reasons)
                    )
                    edge_count += 1
        
        logger.info(f"Graph build complete for user {user_id}. Created {edge_count} edges.")
        return edge_count
