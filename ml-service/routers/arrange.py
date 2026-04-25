from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Set
import logging
import random
import re
import time
import asyncio
from collections import defaultdict, Counter
import networkx as nx
import numpy as np

from services.vector_store import VectorStore
from services.db_service import DBService
from services.graph_store import GraphStore
from services.graph_builder import GraphBuilder
from services.semantic_enricher import SemanticEnricher
from services.embedding_service import EmbeddingService
from utils.llm import llm_service, LLMService
from functools import lru_cache
from fastapi import Depends

router = APIRouter()
logger = logging.getLogger(__name__)

# Dependencies
@lru_cache(maxsize=1)
def get_db_service():
    return DBService()

def get_vector_store():
    return VectorStore(get_db_service())

def get_graph_store():
    return GraphStore(get_db_service())

def get_embedding_service():
    return EmbeddingService()

def get_graph_builder():
    return GraphBuilder(get_vector_store(), get_graph_store())

def get_semantic_enricher():
    return SemanticEnricher(get_embedding_service(), get_vector_store())

class SmartArrangeRequest(BaseModel):
    user_id: str = Field(..., description="UUID of the user")
    force_refresh: bool = Field(False, description="Ignore cached metadata and rebuild everything")
    force_rebuild_graph: bool = Field(False, description="Rebuild graph edges without re-enriching")
    cross_cluster_threshold: float = Field(
        0.4,
        description="Min avg cross-cluster similarity for a card to appear in a second row"
    )
    resolution: float = Field(
        0.5, # Default to broader clusters
        description="Louvain resolution parameter. Higher = smaller clusters, Lower = larger clusters."
    )
    algorithm: str = Field(
        "louvain",
        description="Clustering algorithm to use: 'louvain' or 'hdbscan'"
    )


class ArrangedCard(BaseModel):
    id: str
    title: str
    content_type: str
    extracted_text: Optional[str] = None
    metadata: Optional[dict] = None
    tags: List[dict] = []
    relevance_score: float
    appears_in_clusters: List[str] = []


class ClusterRow(BaseModel):
    cluster_name: str
    cluster_id: str
    cards: List[ArrangedCard]


class SmartArrangeResponse(BaseModel):
    clusters: List[ClusterRow]


@router.post("/smart-arrange", response_model=SmartArrangeResponse)
async def smart_arrange(
    request: SmartArrangeRequest,
    vector_store: VectorStore = Depends(get_vector_store),
    graph_builder: GraphBuilder = Depends(get_graph_builder),
    semantic_enricher: SemanticEnricher = Depends(get_semantic_enricher)
):
    """
    Production-grade Knowledge Clustering Engine (Timed & Robust).
    """
    overall_start = time.time()
    logger.info(f"[SmartArrange] Request started for user {request.user_id}")
    

    try:
        # 1. Fetch Cards
        fetch_start = time.time()
        cards = vector_store.get_user_cards(request.user_id)
        if not cards:
            logger.info(f"[SmartArrange] No cards found for user {request.user_id}")
            return {"clusters": []}
        
        card_ids = [c["id"] for c in cards]
        card_map = {c["id"]: c for c in cards}
        logger.info(f"[DEBUG-ML] [1/6] Fetched {len(cards)} cards in {time.time() - fetch_start:.4f}s")

        # 2. Auto-Enrichment (Concurrent & Throttled)
        enrich_start = time.time()
        
        # STRONG REFRESH LOGIC
        if request.force_refresh:
            logger.info(f"[DEBUG-ML] [Force Refresh] Deleting existing graph for user {request.user_id}")
            graph_builder.graph_store.delete_user_edges(request.user_id)
            to_enrich = cards # Enrich ALL cards
        elif request.force_rebuild_graph:
            logger.info(f"[DEBUG-ML] [Force Rebuild] Deleting existing graph for user {request.user_id}")
            graph_builder.graph_store.delete_user_edges(request.user_id)
            to_enrich = [c for c in cards if not c.get("semantic_metadata")]
        else:
            to_enrich = [c for c in cards if not c.get("semantic_metadata")]

        if to_enrich:
            logger.info(f"[DEBUG-ML] [2/6] Enriching {len(to_enrich)} cards (Parallel)...")
            # Batch size 3 to stay under GitHub Models / Groq rate limits
            for i in range(0, len(to_enrich), 3):
                batch = to_enrich[i:i+3]
                logger.debug(f"[DEBUG-ML] Processing batch of {len(batch)} cards")
                await asyncio.gather(*[semantic_enricher.enrich_card(c["id"], c.get("title", ""), c.get("extracted_text", "")) for c in batch])
            # Refresh cards
            cards = vector_store.get_user_cards(request.user_id)
            card_map = {c["id"]: c for c in cards}
            logger.info(f"[DEBUG-ML] Enrichment completed in {time.time() - enrich_start:.4f}s")
        else:
            logger.info(f"[DEBUG-ML] [2/6] All {len(cards)} cards already enriched. Skipping.")

        # 3. Graph Retrieval
        graph_start = time.time()
        adjacency, edges_count = await graph_builder.get_user_graph(request.user_id, card_ids)
        logger.info(f"[DEBUG-ML] [3/6] Graph retrieved ({edges_count} edges) in {time.time() - graph_start:.4f}s")
        
        # 4. Clustering
        cluster_start = time.time()
        final_communities = []
        is_empty_graph = edges_count == 0

        if is_empty_graph or len(card_ids) < 5:
            logger.info(f"[DEBUG-ML] [4/6] Empty or small graph. Using domain-aware fallback clustering.")
            # Domain-Aware Fallback
            domain_groups = defaultdict(list)
            remaining = set(card_ids)
            for cid in card_ids:
                meta = card_map.get(cid, {}).get("semantic_metadata")
                if meta and meta.get("domain"):
                    domain_groups[meta["domain"]].append(cid)
                    remaining.discard(cid)
            
            final_communities = [list(c) for c in domain_groups.values()]
            
            # Distance-based for remaining
            rem_list = list(remaining)
            while rem_list:
                cid = rem_list.pop(0)
                comm = [cid]
                centroid = np.array(card_map[cid]["embedding"])
                for other in list(rem_list):
                    other_emb = np.array(card_map[other]["embedding"])
                    sim = np.dot(centroid, other_emb) / (np.linalg.norm(centroid) * np.linalg.norm(other_emb) + 1e-9)
                    if sim > 0.40:
                        comm.append(other)
                        rem_list.remove(other)
                final_communities.append(comm)
        else:
            logger.info(f"[DEBUG-ML] [4/6] Running Louvain community detection (resolution={request.resolution})...")
            # Louvain
            G = nx.Graph()
            G.add_nodes_from(card_ids)
            for src, targets in adjacency.items():
                for tgt, weight in targets.items():
                    G.add_edge(src, tgt, weight=weight)
            
            # 5. Dynamic Semantic Merging (Hierarchical Refinement)
            # Louvain can be over-granular; we merge clusters that are semantically 'touching'
            # We use an ultra-low resolution (0.2) for maximum consolidation
            communities = list(nx.algorithms.community.louvain_communities(G, weight='weight', resolution=0.2))
            logger.info(f"[DEBUG-ML] Initial Louvain count: {len(communities)}")
            
            final_communities = communities
            if len(communities) > 1:
                logger.info(f"[DEBUG-ML] [5/6] Performing maximum thematic consolidation...")
                merged = True
                while merged:
                    merged = False
                    centroids = []
                    for comm in final_communities:
                        embs = [card_map[cid]["embedding"] for cid in comm if cid in card_map]
                        centroids.append(np.mean(embs, axis=0) if embs else np.zeros(384))
                    
                    best_sim = -1
                    best_pair = None
                    for i in range(len(centroids)):
                        for j in range(i + 1, len(centroids)):
                            c1, c2 = centroids[i], centroids[j]
                            sim = np.dot(c1, c2) / (np.linalg.norm(c1) * np.linalg.norm(c2) + 1e-9)
                            
                            # Deep semantic bonus for intent/domain overlap during merge
                            m1 = [card_map[cid].get("semantic_metadata", {}) for cid in final_communities[i]]
                            m2 = [card_map[cid].get("semantic_metadata", {}) for cid in final_communities[j]]
                            d1 = set([m.get("domain") for m in m1 if m.get("domain")])
                            d2 = set([m.get("domain") for m in m2 if m.get("domain")])
                            if d1 & d2: sim += 0.20 # Force merge for shared domains
                            
                            # Extreme threshold (0.50) for maximum consolidation
                            if sim > 0.50: 
                                if sim > best_sim:
                                    best_sim = sim
                                    best_pair = (i, j)
                    
                    if best_pair:
                        i, j = best_pair
                        logger.info(f"Consolidating clusters {i} and {j} (sim={best_sim:.3f})")
                        new_comm = list(final_communities[i]) + list(final_communities[j])
                        new_communities = [c for idx, c in enumerate(final_communities) if idx not in [i, j]]
                        new_communities.append(new_comm)
                        final_communities = new_communities
                        merged = True

        logger.info(f"[DEBUG-ML] Clustering completed. Output: {len(final_communities)} clusters in {time.time() - cluster_start:.4f}s")

        # 5. Parallel Naming
        naming_start = time.time()
        logger.info(f"[DEBUG-ML] [5/6] Starting parallel LLM naming for {len(final_communities)} clusters...")
        naming_semaphore = asyncio.Semaphore(2)
        
        async def name_cluster(comm, idx):
            async with naming_semaphore:
                rep_data = []
                for cid in list(comm)[:10]:
                    c = card_map[cid]
                    meta = c.get("semantic_metadata") or {}
                    rep_data.append({
                        "title": c.get("title", "Untitled"),
                        "text": (c.get("extracted_text") or "")[:200],
                        "intent": meta.get("intent"),
                        "domain": meta.get("domain")
                    })
                
                try:
                    name = await asyncio.wait_for(llm_service.generate_cluster_name(list(comm)[:10], rep_data), timeout=4.0)
                    if name:
                        logger.debug(f"LLM Name for cluster {idx}: {name}")
                except Exception as e:
                    logger.warning(f"Naming timeout/error for cluster {idx}: {e}")
                    name = None
                
                if not name:
                    domains = [card_map[cid].get("semantic_metadata", {}).get("domain") for cid in comm if cid in card_map]
                    domains = [d for d in domains if d]
                    name = f"{max(set(domains), key=domains.count)} Topic" if domains else f"Topic {idx+1}"
                
                return name

        naming_tasks = [name_cluster(comm, i) for i, comm in enumerate(final_communities)]
        cluster_names = await asyncio.gather(*naming_tasks)
        logger.info(f"[DEBUG-ML] Naming completed in {time.time() - naming_start:.4f}s")

        # 6. Final UI Mapping
        mapping_start = time.time()
        logger.info(f"[DEBUG-ML] [6/6] Mapping clusters to response schema...")
        rows = []
        for i, (comm, name) in enumerate(zip(final_communities, cluster_names)):
            centroid = np.mean([card_map[cid]["embedding"] for cid in comm], axis=0)
            
            arranged_cards = []
            for cid in comm:
                c = card_map[cid]
                emb = np.array(c["embedding"])
                rel = np.dot(centroid, emb) / (np.linalg.norm(centroid) * np.linalg.norm(emb) + 1e-9)
                
                arranged_cards.append(ArrangedCard(
                    id=cid,
                    title=c["title"],
                    content_type=c["content_type"],
                    extracted_text=c.get("extracted_text"),
                    metadata=c.get("metadata"),
                    tags=c.get("tags", []),
                    relevance_score=float(rel)
                ))
            
            arranged_cards.sort(key=lambda x: x.relevance_score, reverse=True)
            rows.append(ClusterRow(cluster_name=name, cluster_id=f"cluster-{i}", cards=arranged_cards))

        rows.sort(key=lambda x: len(x.cards), reverse=True)
        
        duration = time.time() - overall_start
        logger.info(f"[DEBUG-ML] SMART ARRANGE COMPLETE. Total duration: {duration:.4f}s | Clusters: {len(rows)}")
        return {"clusters": rows}

    except Exception as e:
        logger.error(f"[SmartArrange] CRITICAL ERROR: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
