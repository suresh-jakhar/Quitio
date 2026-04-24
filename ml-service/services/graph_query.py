import logging
import numpy as np
from typing import List, Dict, Set, Optional, Any
from services.graph_store import GraphStore
from services.db_service import DBService

logger = logging.getLogger(__name__)

class GraphQuery:
    def __init__(self, graph_store: GraphStore, db_service: DBService):
        self.graph_store = graph_store
        self.db_service = db_service

    def get_neighbors(
        self, 
        card_id: str, 
        depth: int = 2, 
        limit: int = 20,
        context_embedding: Optional[List[float]] = None,
        min_edge_weight: float = 0.6,
        intent: str = "exploratory"
    ) -> List[dict]:
        """
        Retrieves multi-hop neighbors for a given card using a depth-first traversal.
        
        Refined with:
        - Adaptive weights based on intent
        - Log-dampened centrality
        - Hop-based decay factor (0.7 per hop)
        - Path explanations with reasons
        """
        visited: Set[str] = set()
        results: Dict[str, dict] = {}
        
        # Adaptive Weights
        if intent == "lookup":
            ALPHA, BETA, GAMMA = 0.7, 0.2, 0.1
        else: # exploratory
            ALPHA, BETA, GAMMA = 0.3, 0.5, 0.2
            
        DECAY_FACTOR = 0.7

        def traverse(current_id: str, current_depth: int, path: List[dict]):
            # 1. STRICT DEPTH & LATENCY CONTROL
            if current_depth <= 0 or len(path) > 2 or len(visited) > 50:
                return
            
            visited.add(current_id)
            neighbors = self._get_neighbors_with_centrality(current_id, limit=15)
            
            for n in neighbors:
                target_id = n['id']
                edge_weight = n['similarity']
                
                if edge_weight < min_edge_weight:
                    continue
                
                # 2. PATH EXPLAINABILITY: store the 'why'
                new_path = path + [{
                    "id": target_id,
                    "reason": n['reason'],
                    "weight": edge_weight
                }]
                
                # 3. LOG-DAMPENED CENTRALITY
                dampened_centrality = np.log1p(n['centrality'])
                
                # 4. WEIGHTED SCORING
                query_sim = self._get_similarity(n.get('embedding'), context_embedding) if context_embedding else 1.0
                
                # node_score = alpha * query_sim + beta * relationship + gamma * log_centrality
                node_score = (ALPHA * query_sim) + (BETA * edge_weight) + (GAMMA * dampened_centrality)
                
                # 5. HOP-BASED DECAY
                hop_number = len(new_path)
                final_score = node_score * (DECAY_FACTOR ** (hop_number - 1))
                
                if target_id not in results or results[target_id]['score'] < final_score:
                    results[target_id] = {
                        'id': target_id,
                        'score': final_score,
                        'similarity': query_sim,
                        'path': new_path,
                        'edge_type': n['edge_type'],
                        'reason': n['reason'],
                        'embedding': n.get('embedding')
                    }
                
                if target_id not in visited:
                    traverse(target_id, current_depth - 1, new_path)

        traverse(card_id, depth, [])
        
        if card_id in results:
            del results[card_id]
            
        return list(results.values())

    def search_with_graph(
        self,
        query_embedding: List[float],
        user_id: str,
        vector_store: Any,
        top_k: int = 10,
        expansion_depth: int = 2,
        query_text: str = ""
    ) -> List[dict]:
        """
        Refined Query Engine logic with Intent Detection.
        """
        # 1. SIMPLE INTENT DETECTION
        # Lookup: short queries (<= 3 words) or specific keywords
        # Exploratory: long queries or natural language
        words = query_text.split()
        intent = "lookup" if len(words) <= 3 else "exploratory"
        logger.info(f"[QueryEngine] Detected intent: {intent} for query: {query_text}")

        # 2. Semantic Seed Nodes
        seeds = vector_store.find_similar_cards(query_embedding, user_id, limit=5)
        
        candidates: Dict[str, dict] = {}
        for s in seeds:
            candidates[s['id']] = {
                **s, 
                'origin': 'vector', 
                'path': [{"id": s['id'], "reason": "Initial semantic match", "weight": s['similarity']}],
                'score': s['similarity'],
                'similarity': s['similarity']
            }
        
        # 3. Graph Expansion
        for s in seeds:
            neighbors = self.get_neighbors(
                s['id'], 
                depth=expansion_depth, 
                limit=10, 
                context_embedding=query_embedding,
                intent=intent
            )
            for n in neighbors:
                nid = n['id']
                if nid not in candidates:
                    candidates[nid] = {**n, 'origin': 'graph', 'similarity': n['similarity']}
                else:
                    # Hybrid boost
                    candidates[nid]['similarity'] = max(candidates[nid]['similarity'], n['similarity']) + 0.05
                    candidates[nid]['origin'] = 'hybrid'
                    candidates[nid]['path'] = n['path']
        
        # 4. Diversity Control: MMR (lambda=0.7 for relevance bias)
        final_results = self._apply_mmr(list(candidates.values()), query_embedding, top_k, lambda_param=0.7)
        
        return self._enrich_card_details(final_results)

    def _apply_mmr(self, candidates: List[dict], query_embedding: List[float], k: int, lambda_param: float = 0.7) -> List[dict]:
        """
        Maximal Marginal Relevance (MMR) implementation for result diversity.
        lambda_param: higher = more relevance, lower = more diversity.
        """
        if not candidates:
            return []
            
        selected = []
        remaining = candidates.copy()
        
        while len(selected) < k and remaining:
            best_mmr = -1e10
            best_node = None
            
            for cand in remaining:
                relevance = cand['similarity']
                
                redundancy = 0.0
                if selected:
                    if 'embedding' in cand and cand['embedding']:
                        c_emb = np.array(cand['embedding'])
                        redundancy = max([
                            float(np.dot(c_emb, np.array(s['embedding']))) 
                            for s in selected if 'embedding' in s and s['embedding']
                        ])
                    else:
                        redundancy = 0.0
                
                mmr_score = (lambda_param * relevance) - ((1 - lambda_param) * redundancy)
                
                if mmr_score > best_mmr:
                    best_mmr = mmr_score
                    best_node = cand
            
            if best_node:
                selected.append(best_node)
                remaining.remove(best_node)
            else:
                break
                
        return selected

    def _get_neighbors_with_centrality(self, card_id: str, limit: int = 10) -> List[dict]:
        """Fetch neighbors along with their target node centrality and embedding."""
        try:
            with self.db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT e.target_card_id, e.similarity_score, e.edge_type, e.reason,
                               c.centrality, c.embedding
                        FROM graph_edges e
                        JOIN cards c ON e.target_card_id = c.id
                        WHERE e.source_card_id = %s::uuid
                        ORDER BY e.similarity_score DESC
                        LIMIT %s
                    """, (card_id, limit))
                    rows = cur.fetchall()
                    return [{
                        "id": str(row[0]),
                        "similarity": float(row[1]),
                        "edge_type": row[2],
                        "reason": row[3],
                        "centrality": float(row[4]),
                        "embedding": row[5]
                    } for row in rows]
        except Exception as e:
            logger.error(f"Error fetching neighbors with centrality: {e}")
            return []

    def _get_similarity(self, emb1: Optional[List[float]], emb2: Optional[List[float]]) -> float:
        """Helper to calculate cosine similarity (dot product for normalized vectors)."""
        if not emb1 or not emb2:
            return 0.0
        return float(np.dot(np.array(emb1), np.array(emb2)))

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
                    meta_map = {str(row[0]): {"title": row[1], "content_type": row[2]} for row in rows}
                    for r in results:
                        meta = meta_map.get(r['id'], {})
                        r.update(meta)
            return results
        except Exception as e:
            logger.error(f"Error enriching card details: {e}")
            return results
