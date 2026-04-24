import logging
import numpy as np
import networkx as nx
from typing import List, Dict, Tuple, Optional
from services.vector_store import VectorStore
from services.graph_store import GraphStore

logger = logging.getLogger(__name__)


class GraphBuilder:
    def __init__(self, vector_store: VectorStore, graph_store: GraphStore):
        self.vector_store = vector_store
        self.graph_store = graph_store

    def build_user_graph(
        self,
        user_id: str,
        semantic_threshold: float = 0.7,
        top_k: Optional[int] = None,
    ):
        """
        Constructs a knowledge graph for a user using ANN search (HNSW).
        Uses dynamic K to balance density and performance.
        """
        logger.info(f"[GraphBuilder] Building graph for user {user_id}...")

        # 1. Fetch all cards for the user
        cards = self.vector_store.get_user_cards(user_id)
        n = len(cards)
        if n == 0:
            return 0

        # Dynamic K: scales with N, but capped for performance
        # 100 cards -> K=10, 1000 cards -> K=23, 10000 cards -> K=45
        if top_k is None:
            top_k = int(min(max(10, np.log(n) * 5), 50))
        
        logger.info(f"[GraphBuilder] Using dynamic K={top_k} for N={n} cards")

        # 2. For each card, find its top_k neighbors
        all_edges = []
        for card in cards:
            neighbors = self.vector_store.find_similar_cards(
                embedding=card["embedding"],
                user_id=user_id,
                limit=top_k + 1
            )
            
            # Symmetric edges are naturally handled here because each card 
            # in the collection eventually acts as a 'source'.
            card_edges = self._compute_edges_for_card(card, neighbors, semantic_threshold)
            all_edges.extend(card_edges)

        # 3. Clear old edges + batch insert
        self.graph_store.delete_user_edges(user_id)
        if all_edges:
            self.graph_store.batch_add_edges(all_edges)
            
        # 4. COMPUTE PAGERANK (Node Centrality/Importance)
        # We build a temporary graph in memory to compute scores
        G = nx.DiGraph()
        for src, tgt, score, etype, reason in all_edges:
            G.add_edge(src, tgt, weight=score)
            
        try:
            # Use PageRank as a proxy for 'centrality'
            pagerank = nx.pagerank(G, weight='weight')
            # Normalize scores to 0-1 range for consistency
            if pagerank:
                max_pr = max(pagerank.values())
                centrality_updates = [(float(score / max_pr), cid) for cid, score in pagerank.items()]
                
                with self.vector_store.db_service.get_connection() as conn:
                    with conn.cursor() as cur:
                        cur.executemany(
                            "UPDATE cards SET centrality = %s WHERE id = %s",
                            centrality_updates
                        )
                    conn.commit()
            logger.info(f"[GraphBuilder] Updated centrality (PageRank) for {len(pagerank)} cards.")
        except Exception as e:
            logger.error(f"[GraphBuilder] Error computing PageRank: {e}")

        logger.info(f"[GraphBuilder] Done. Created {len(all_edges)} directed edges.")
        return len(all_edges)

    def update_card_edges(self, card_id: str, user_id: str, semantic_threshold: float = 0.7):
        """
        Incremental update: compute edges only for a single card.
        Ensures SYMMETRY by storing bidirectional edges.
        """
        logger.info(f"[GraphBuilder] Symmetric incremental update for card {card_id}...")
        
        # 1. Get the card's embedding and tags
        with self.vector_store.db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, embedding, 
                           ARRAY(SELECT t.name FROM card_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.card_id = cards.id) as tags
                    FROM cards WHERE id = %s AND user_id = %s
                """, (card_id, user_id))
                row = cur.fetchone()
                if not row: return
                
                card = {"id": str(row[0]), "embedding": row[1], "tags": row[2]}

        # 2. Find total count to calculate dynamic K
        with self.vector_store.db_service.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT count(*) FROM cards WHERE user_id = %s", (user_id,))
                n = cur.fetchone()[0]
        
        top_k = int(min(max(10, np.log(n) * 5), 50))

        # 3. Find top_k neighbors
        neighbors = self.vector_store.find_similar_cards(
            embedding=card["embedding"],
            user_id=user_id,
            limit=top_k + 1
        )

        # 4. Compute edges (Source -> Neighbor)
        edges = self._compute_edges_for_card(card, neighbors, semantic_threshold)
        
        # IMPROVEMENT: Add Neighbor -> Source edges for symmetry
        symmetric_edges = []
        for src, tgt, score, etype, reason in edges:
            symmetric_edges.append((tgt, src, score, etype, reason))
        
        all_new_edges = edges + symmetric_edges

        # 5. Update graph store
        # First, delete any old edges where this card is source OR target to prevent duplicates/stale links
        self.graph_store.delete_card_edges(card_id)
        if all_new_edges:
            self.graph_store.batch_add_edges(all_new_edges)

    def _compute_edges_for_card(self, card: dict, neighbors: List[dict], threshold: float) -> List[Tuple]:
        edges = []
        source_id = card["id"]
        source_tags = set(card["tags"])
        
        rejected_count = 0
        sim_scores = []

        for n in neighbors:
            target_id = n["id"]
            if source_id == target_id:
                continue

            sem_score = n["similarity"]
            sim_scores.append(sem_score)
            
            # STRICT CONTROL: No edge if below semantic threshold
            if sem_score < threshold:
                rejected_count += 1
                continue

            target_tags = set(n.get("tags", []))
            shared = source_tags & target_tags
            
            tag_boost = min(0.1, len(shared) * 0.05) if shared else 0.0
            final_score = min(1.0, sem_score + tag_boost)
            
            edge_type = "hybrid" if tag_boost > 0 else "semantic"
            reason = f"sem_score: {sem_score:.3f}, shared_tags: {list(shared)}, boost: {tag_boost:.3f}"
            
            edges.append((source_id, target_id, final_score, edge_type, reason))
        
        if sim_scores:
            avg_sim = sum(sim_scores) / len(sim_scores)
            logger.info(
                f"[DEBUG-Graph] Card {source_id[:8]} | neighbors={len(neighbors)} | "
                f"avg_sim={avg_sim:.3f} | min={min(sim_scores):.3f} | max={max(sim_scores):.3f} | "
                f"rejected={rejected_count} (threshold={threshold}) | edges={len(edges)}"
            )
            
        return edges
