import logging
import numpy as np
import networkx as nx
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from services.vector_store import VectorStore
from services.graph_store import GraphStore

logger = logging.getLogger(__name__)


class GraphBuilder:
    def __init__(self, vector_store: VectorStore, graph_store: GraphStore):
        self.vector_store = vector_store
        self.graph_store = graph_store

    async def get_user_graph(self, user_id: str, card_ids: List[str]):
        """
        Fetches the existing knowledge graph for a user from the database.
        Returns: adjacency (Dict[str, Dict[str, float]]), edges_count (int)
        """
        adjacency = defaultdict(dict)
        edges_count = 0
        
        try:
            with self.graph_store.db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    # Filter for edges where both source and target are in the current card set
                    cur.execute("""
                        SELECT source_card_id, target_card_id, similarity_score
                        FROM graph_edges
                        WHERE source_card_id = ANY(%s::uuid[]) 
                          AND target_card_id = ANY(%s::uuid[])
                    """, (card_ids, card_ids))
                    
                    rows = cur.fetchall()
                    for src, tgt, score in rows:
                        adjacency[str(src)][str(tgt)] = float(score)
                        edges_count += 1
            
            logger.info(f"[GraphBuilder] Fetched subgraph with {edges_count} edges for {len(card_ids)} cards.")
            return adjacency, edges_count
        except Exception as e:
            logger.error(f"[GraphBuilder] Error fetching user graph: {e}")
            return {}, 0

    def build_user_graph(
        self,
        user_id: str,
        semantic_threshold: float = 0.5,
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

        # Increase K multiplier for better connectivity (Phase 4)
        if top_k is None:
            top_k = min(25, max(8, int(np.log(n) * 5))) if n > 1 else 8
        
        logger.info(f"[DEBUG-ML] [GraphBuilder] Dense K selected: {top_k} (N={n})")

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
        
        # LOG GRAPH STATS (Step 1)
        if n > 0:
            print(f"--- GRAPH STATS ---")
            print(f"Total nodes: {n}")
            print(f"Total edges: {len(all_edges)}")
            print(f"Avg edges per node: {len(all_edges)/n:.2f}")
            print(f"-------------------")

        return len(all_edges)

    def update_card_edges(self, card_id: str, user_id: str, semantic_threshold: float = 0.5):
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
        
        top_k = min(20, max(5, int(np.log(n) * 3))) if n > 1 else 5

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

    def _fused_similarity(self, card: dict, n: dict) -> dict:
        source_id = card["id"]
        target_id = n["id"]
        
        # 1. Component Scores
        text_sem_score = n["similarity"]
        
        concept_sim = 0.0
        if card.get("concept_embedding") is not None and n.get("concept_embedding") is not None:
            c1 = np.array(card["concept_embedding"])
            c2 = np.array(n["concept_embedding"])
            concept_sim = np.dot(c1, c2) / (np.linalg.norm(c1) * np.linalg.norm(c2) + 1e-9)
        
        # 2. Pattern Matching (Structural Signal)
        t1, t2 = card.get("title", "").lower(), n.get("title", "").lower()
        naming_pattern_match = 0.0
        # Check for Lab/Assignment/Chapter series (Lab 11 vs Lab 13)
        import re
        p1 = re.findall(r'(lab|assignment|chapter|part|day)\s*\d+', t1)
        p2 = re.findall(r'(lab|assignment|chapter|part|day)\s*\d+', t2)
        if p1 and p2 and p1[0] == p2[0]:
            naming_pattern_match = 0.40 # Strong structural link for document series
        
        # 3. Semantic Metadata (Functional Signal)
        meta_src = card.get("semantic_metadata") or {}
        meta_tgt = n.get("semantic_metadata") or {}
        
        def normalize_meta(val):
            if not val: return None
            return str(val).lower().strip().replace('_', ' ')

        src_intent = normalize_meta(meta_src.get("intent"))
        tgt_intent = normalize_meta(meta_tgt.get("intent"))
        src_domain = normalize_meta(meta_src.get("domain"))
        tgt_domain = normalize_meta(meta_tgt.get("domain"))

        intent_match = (src_intent == tgt_intent) and src_intent is not None
        
        # Robust Domain Match: Exact or starts with the same root word (e.g., 'food science' vs 'food')
        domain_match = False
        if src_domain and tgt_domain:
            if src_domain == tgt_domain:
                domain_match = True
            else:
                # Check for prefix match (at least 4 chars to avoid 'the', 'and', etc.)
                s1, s2 = src_domain.split()[0], tgt_domain.split()[0]
                if len(s1) > 3 and s1 == s2:
                    domain_match = True

        # 4. TOPOLOGY FUSION (Balanced Weights)
        # Final Score = Structural (20%) + Concept (25%) + Text (25%) + Intent (15%) + Domain (15%)
        # This increases the influence of semantic embeddings which were previously drowned out.
        
        intent_bonus = 0.15 if intent_match else 0
        domain_bonus = 0.15 if domain_match else 0
        
        final_score = (0.20 * naming_pattern_match) + (0.25 * concept_sim) + (0.25 * text_sem_score) + intent_bonus + domain_bonus
        
        if final_score > 0.25:
            logger.debug(f"[DEEP-ML] Fused Edge {t1[:10]}->{t2[:10]} | Score: {final_score:.3f} | Pattern: {naming_pattern_match:.2f}")

        edge_type = "structural" if naming_pattern_match > 0 else "conceptual" if (intent_match or domain_match) else "semantic"
        
        return {
            "source_id": source_id,
            "target_id": target_id,
            "final_score": min(1.0, final_score),
            "sem_score": text_sem_score,
            "edge_type": edge_type,
            "reason": f"structural: {naming_pattern_match:.2f} | concept: {concept_sim:.2f} | txt: {text_sem_score:.2f}"
        }

    def _compute_edges_for_card(self, card: dict, neighbors: List[dict], threshold: float) -> List[Tuple]:
        source_id = card["id"]
        candidates = []
        for n in neighbors:
            if source_id == n["id"]:
                continue
            edge_data = self._fused_similarity(card, n)
            candidates.append(edge_data)

        if not candidates:
            return []

        # 1. Sort by final fused score (not just raw semantic)
        candidates.sort(key=lambda x: x["final_score"], reverse=True)
        
        # 2. Keep Top 80% of candidates to maintain density
        keep_count = max(1, int(len(candidates) * 0.8))
        filtered_candidates = candidates[:keep_count]
        
        # 3. Apply a floor for edge inclusion
        edges = []
        for c in filtered_candidates:
            if c["final_score"] < 0.15:
                continue
            edges.append((c["source_id"], c["target_id"], c["final_score"], c["edge_type"], c["reason"]))
            
        return edges
