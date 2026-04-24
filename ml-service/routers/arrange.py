"""
Smart Arrange — Graph-native label propagation community detection.

Algorithm:
1. Build full weighted adjacency from ALL graph edges (semantic + tag_based + hybrid)
2. Seed labels from tags (anchored nodes — tagged cards keep their topic)
3. Run weighted label propagation: untagged cards inherit labels from their
   strongest-connected neighbors
4. Sort within each community by graph centrality (most connected card first)
5. Detect cross-cluster cards: strong edges to a DIFFERENT community
6. Isolated cards (no edges, no tags) → 'Other'
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Set
import logging
import random
import re
from collections import defaultdict, Counter
import networkx as nx
import numpy as np
from pgvector.psycopg import register_vector

from services.db_service import DBService

logger = logging.getLogger(__name__)
router = APIRouter()


class SmartArrangeRequest(BaseModel):
    user_id: str = Field(..., description="UUID of the user")
    cross_cluster_threshold: float = Field(
        0.4,
        description="Min avg cross-cluster similarity for a card to appear in a second row"
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
    card_count: int
    cards: List[ArrangedCard]


class SmartArrangeResponse(BaseModel):
    user_id: str
    total_cards: int
    cluster_count: int
    clusters: List[ClusterRow]


# ─────────────────────────────────────────────
# Graph community detection: label propagation
# ─────────────────────────────────────────────

# Graph community detection
# ─────────────────────────────────────────────

def compute_centrality(
    card_ids: List[str],
    cluster_set: Set[str],
    adjacency: Dict[str, Dict[str, float]],
) -> Dict[str, float]:
    """
    Intra-cluster centrality = average edge weight to all other cluster members.
    Higher = more connected to the rest of its community.
    """
    centrality: Dict[str, float] = {}
    for cid in card_ids:
        intra = [
            score for nid, score in adjacency.get(cid, {}).items()
            if nid in cluster_set and nid != cid
        ]
        centrality[cid] = sum(intra) / len(intra) if intra else 0.0
    return centrality

def clean_text_for_keywords(text: str) -> List[str]:
    """
    Remove emails, phone numbers, addresses, and number-heavy tokens.
    Returns a list of cleaned lowercase tokens.
    """
    if not text:
        return []
    
    # Lowercase
    text = text.lower()
    
    # 1. Remove emails
    text = re.sub(r'\S+@\S+', ' ', text)
    
    # 2. Remove phone numbers (simple patterns)
    text = re.sub(r'\+?\d[\d\-\s]{7,}\d', ' ', text)
    
    # 3. Remove web addresses
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
    
    # 4. Remove hex/hashes/long number strings
    text = re.sub(r'\b[0-9a-f]{8,}\b', ' ', text)
    text = re.sub(r'\b\d{5,}\b', ' ', text)
    
    # Tokenize: keep only alphabetic words of length 3+
    tokens = re.findall(r'\b[a-z]{3,}\b', text)
    
    # Strip common extensions if they are tokens
    extensions = {'pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg', 'csv', 'xlsx'}
    tokens = [t for t in tokens if t not in extensions]
    
    STOPWORDS = {
        "the", "and", "for", "with", "from", "that", "this", "these", "those",
        "which", "where", "when", "who", "how", "what", "why", "can", "will",
        "would", "should", "could", "been", "have", "has", "had", "are", "was",
        "were", "but", "not", "your", "their", "our", "all", "any", "some",
        "more", "most", "than", "very", "too", "also", "into", "onto", "upon",
        "about", "around", "between", "among", "through", "during", "before",
        "after", "page", "file", "untitled", "document", "click", "here", "read",
        "more", "link", "image", "photo", "copyright", "rights", "reserved",
        "author", "date", "time", "email", "phone", "contact", "address", "website"
    }
    
    return [t for t in tokens if t not in STOPWORDS]

def extract_tfidf_name(
    community_cids: Set[str],
    card_map: Dict[str, dict],
    corpus_freq: Counter,
    total_word_count: int
) -> str:
    """
    Extract a descriptive name using TF-IDF concepts and fallback heuristics.
    """
    # 1. Try tags first (most stable labels)
    tags = []
    for cid in community_cids:
        if cid in card_map:
            tags.extend([t["name"] for t in card_map[cid].get("tags", [])])
    
    if tags:
        tag_counts = Counter(tags)
        tag_name = tag_counts.most_common(1)[0][0]
        # Only use tag if it's common enough in the cluster
        if tag_counts[tag_name] >= max(2, len(community_cids) * 0.3):
             return tag_name
        
    # 2. Collect and clean texts
    cluster_words = []
    cluster_titles = []
    full_text_blob = ""
    
    for cid in community_cids:
        if cid not in card_map:
            continue
        card = card_map[cid]
        title = card.get("title", "")
        text = card.get("extracted_text", "") or ""
        
        # Is title generic?
        is_generic_title = bool(re.search(r'file-\d+|untitled|document\d*', title.lower()))
        
        if not is_generic_title:
            cluster_titles.append(title)
            # Give title words more weight by adding multiple times
            title_tokens = clean_text_for_keywords(title)
            cluster_words.extend(title_tokens * 3)
            
        content_tokens = clean_text_for_keywords(text[:2000])
        cluster_words.extend(content_tokens)
        full_text_blob += " " + text.lower()

    # 3. Category heuristics
    heuristics = [
        (r"\b(resume|cv|curriculum vitae|experience|skills|education|profile)\b", "Resumes"),
        (r"\b(exam|paper|question|marks|test|quiz|assignment|homework)\b", "Exams"),
        (r"\b(lab|experiment|report|project|proposal|abstract|methodology)\b", "Academic Work"),
        (r"\b(invoice|bill|receipt|payment|transaction|order|total)\b", "Financial Documents"),
        (r"\b(meeting|minutes|agenda|notes|discussion|sync|update)\b", "Meeting Notes"),
        (r"\b(contract|agreement|legal|terms|policy|clause|privacy)\b", "Legal Documents"),
    ]
    
    heuristic_counts = Counter()
    for pattern, label in heuristics:
        matches = len(re.findall(pattern, full_text_blob))
        if matches > 0:
            heuristic_counts[label] = matches
            
    if heuristic_counts:
        top_heuristic, count = heuristic_counts.most_common(1)[0]
        # Only use if strong evidence relative to cluster size
        if count >= len(community_cids) * 1.5:
            return top_heuristic

    # 4. TF-IDF Keyword Extraction
    if not cluster_words:
        return "Mixed Documents"

    cluster_freq = Counter(cluster_words)
    word_scores = {}
    for word, count in cluster_freq.items():
        # IDF calculation: log(Total Docs / Docs containing word)
        # Here we approximate with word counts
        idf = np.log((total_word_count + 1) / (corpus_freq.get(word, 0) + 1))
        word_scores[word] = count * idf
        
    top_keywords = sorted(word_scores.items(), key=lambda x: x[1], reverse=True)
    
    print(f"Cluster CIDs: {list(community_cids)[:3]}...")
    print(f"Extracted keywords: {[w for w, s in top_keywords[:10]]}")
    
    if top_keywords:
        # Use top 2 keywords
        k1 = top_keywords[0][0].capitalize()
        if len(top_keywords) > 1 and top_keywords[1][1] > top_keywords[0][1] * 0.6:
            k2 = top_keywords[1][0].capitalize()
            # Avoid redundant names
            if k1.lower() in k2.lower(): return k2
            if k2.lower() in k1.lower(): return k1
            return f"{k1} & {k2}"
        return k1

    return "Mixed Documents"



# ─────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────

@router.post("/smart-arrange", response_model=SmartArrangeResponse)
async def smart_arrange(request: SmartArrangeRequest):
    db = DBService()

    try:
        with db.get_connection() as conn:
            register_vector(conn)
            with conn.cursor() as cur:

                # ── 1. Fetch all cards ──────────────────────────────────────
                cur.execute("""
                    SELECT id, title, content_type, extracted_text, metadata, embedding
                    FROM cards
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                """, (request.user_id,))
                rows = cur.fetchall()

                if not rows:
                    return SmartArrangeResponse(
                        user_id=request.user_id,
                        total_cards=0, cluster_count=0, clusters=[]
                    )

                card_ids = [str(r[0]) for r in rows]
                card_map: Dict[str, dict] = {
                    str(r[0]): {
                        "id": str(r[0]),
                        "title": (r[1] or "").strip() or "Untitled",
                        "content_type": r[2],
                        "extracted_text": r[3],
                        "metadata": r[4] or {},
                        "embedding": r[5],
                        "tags": [],
                    }
                    for r in rows
                }

                # ── 2. Fetch tags ───────────────────────────────────────────
                cur.execute("""
                    SELECT ct.card_id, t.id, t.name
                    FROM card_tags ct
                    JOIN tags t ON ct.tag_id = t.id
                    WHERE ct.card_id = ANY(%s::uuid[])
                      AND t.user_id = %s
                    ORDER BY t.name
                """, (card_ids, request.user_id))
                for card_id, tag_id, tag_name in cur.fetchall():
                    cid = str(card_id)
                    if cid in card_map:
                        card_map[cid]["tags"].append({"id": str(tag_id), "name": tag_name})

                # ── 3. Fetch ALL graph edges ────────────────────────────────
                cur.execute("""
                    SELECT source_card_id, target_card_id, similarity_score, edge_type, reason
                    FROM graph_edges
                    WHERE source_card_id = ANY(%s::uuid[])
                      AND target_card_id = ANY(%s::uuid[])
                """, (card_ids, card_ids))
                edge_rows = cur.fetchall()

        # ── 4. Build weighted adjacency ─────────────────────────────────────
        adjacency: Dict[str, Dict[str, float]] = defaultdict(dict)
        # Store reasons for explainability
        edge_reasons: Dict[Tuple[str, str], str] = {}

        for src, tgt, score, etype, reason in edge_rows:
            src, tgt = str(src), str(tgt)
            val = float(score)
            adjacency[src][tgt] = max(adjacency[src].get(tgt, 0), val)
            adjacency[tgt][src] = max(adjacency[tgt].get(src, 0), val)
            # Store in both directions to ensure lookups succeed
            edge_reasons[(src, tgt)] = reason
            edge_reasons[(tgt, src)] = reason

        n_edges = sum(len(v) for v in adjacency.values()) // 2
        logger.info(
            f"[SmartArrange] user={request.user_id} | "
            f"cards={len(card_ids)} | edges={n_edges}"
        )

        # ── 5. Run Unsupervised Community Detection (Louvain) ───────────────
        G = nx.Graph()
        for cid in card_ids:
            G.add_node(cid)
            
        for src, targets in adjacency.items():
            for tgt, weight in targets.items():
                G.add_edge(src, tgt, weight=weight)
                
        # resolution < 1.0 favors fewer, larger communities.
        communities = list(nx.algorithms.community.louvain_communities(G, weight='weight', resolution=0.5))
        logger.info(f"[DEBUG-Arrange] Adjacency nodes: {list(G.nodes)}")
        logger.info(f"[DEBUG-Arrange] Adjacency edges: {list(G.edges(data=True))}")
        logger.info(f"[DEBUG-Arrange] Raw Louvain communities ({len(communities)}): {[list(c) for c in communities]}")

        # Step 5: Merge Logic (Fix Singleton Clusters)
        MIN_CLUSTER_SIZE = 3
        
        # Helper to compute centroid
        def get_centroid(cids: Set[str]) -> np.ndarray:
            embs = [np.array(card_map[cid]["embedding"]) for cid in cids if cid in card_map and card_map[cid].get("embedding") is not None]
            if not embs: return np.zeros(384) # Match all-MiniLM-L6-v2 dimension
            return np.mean(embs, axis=0)

        # 1. Separate large and small
        large_communities = [c for c in communities if len(c) >= MIN_CLUSTER_SIZE]
        small_communities = [c for c in communities if len(c) < MIN_CLUSTER_SIZE]
        
        final_communities = []
        
        if large_communities:
            # Merge small into closest large
            final_communities = [set(c) for c in large_communities]
            centroids = [get_centroid(c) for c in final_communities]
            
            for small in small_communities:
                small_centroid = get_centroid(small)
                # Find closest large cluster via cosine similarity (dot product of normalized)
                best_idx = -1
                best_sim = -1.0
                
                for idx, c_centroid in enumerate(centroids):
                    # Simple dot product for normalized embeddings
                    sim = np.dot(small_centroid, c_centroid) / (np.linalg.norm(small_centroid) * np.linalg.norm(c_centroid) + 1e-9)
                    if sim > best_sim:
                        best_sim = sim
                        best_idx = idx
                
                if best_idx != -1:
                    final_communities[best_idx].update(small)
        else:
            # No large clusters? Force merge singletons based on similarity
            if communities:
                logger.info(f"[DEBUG-Arrange] No large clusters found. Attempting aggressive merge on {len(communities)} small communities...")
                final_communities = []
                remaining = [set(c) for c in communities]
                
                while remaining:
                    base = remaining.pop(0)
                    base_centroid = get_centroid(base)
                    
                    to_merge = []
                    for i, other in enumerate(remaining):
                        other_centroid = get_centroid(other)
                        # Cosine similarity
                        norm_prod = (np.linalg.norm(base_centroid) * np.linalg.norm(other_centroid)) + 1e-9
                        sim = np.dot(base_centroid, other_centroid) / norm_prod
                        
                        logger.info(f"[DEBUG-Arrange] Similarity between '{list(base)[:1]}' and '{list(other)[:1]}': {sim:.4f}")
                        
                        if sim > 0.25: # Aggressive threshold for forced merge
                            to_merge.append(i)
                    
                    # Merge all matching ones into base
                    for i in sorted(to_merge, reverse=True):
                        base.update(remaining.pop(i))
                    
                    final_communities.append(base)
            else:
                final_communities = []

        logger.info(f"[DEBUG-Arrange] Final merged communities: {len(final_communities)}")
        
        # ── 6. Optimize: Pre-tokenize all cards once ────────────────────────
        tokenized_cards = {}
        corpus_words = []
        for cid, card in card_map.items():
            # Use smaller chunks for performance
            tokens = clean_text_for_keywords((card["title"] + " " + (card.get("extracted_text", "") or ""))[:1000])
            tokenized_cards[cid] = tokens
            corpus_words.extend(tokens)
            
        corpus_freq = Counter(corpus_words)
        total_word_count = sum(corpus_freq.values())

        all_labels: Dict[str, str] = {}
        cluster_name_cache: Dict[int, str] = {}

        for i, comm in enumerate(final_communities):
            # Pass pre-tokenized data if needed, or just let it use the current logic (which is now faster with smaller text)
            c_name = extract_tfidf_name(comm, card_map, corpus_freq, total_word_count)
            
            # Ensure unique names
            base_name = c_name
            counter = 2
            while c_name in list(cluster_name_cache.values()):
                c_name = f"{base_name} {counter}"
                counter += 1
                
            cluster_name_cache[i] = c_name
            for cid in comm:
                all_labels[cid] = c_name


        # ── 7. Group by community label ─────────────────────────────────────
        communities_map: Dict[str, List[str]] = defaultdict(list)
        for cid, label in all_labels.items():
            communities_map[label].append(cid)

        # ── 8. Build output rows ─────────────────────────────────────────────
        clusters_out: List[ClusterRow] = []


        for label, community_ids in communities_map.items():
            cluster_set = set(community_ids)
            centrality = compute_centrality(community_ids, cluster_set, adjacency)
            sorted_ids = sorted(community_ids, key=lambda c: centrality[c], reverse=True)

            arranged_cards: List[ArrangedCard] = []
            for cid in sorted_ids:
                cross_clusters: List[str] = []
                
                # Explainability: find the strongest reason for being in this cluster
                best_reason = "Uncategorized"
                max_score = -1.0
                for nid, score in adjacency.get(cid, {}).items():
                    if nid in cluster_set and nid != cid:
                        if score > max_score:
                            max_score = score
                            # Get reason from either direction
                            best_reason = edge_reasons.get((cid, nid)) or edge_reasons.get((nid, cid)) or "Semantic similarity"

                for other_label, other_ids in communities_map.items():
                    if other_label == label:
                        continue
                    other_set = set(other_ids)
                    cross_scores = [score for nid, score in adjacency.get(cid, {}).items() if nid in other_set]
                    if cross_scores:
                        avg_cross = sum(cross_scores) / len(cross_scores)
                        if avg_cross >= request.cross_cluster_threshold:
                            cross_clusters.append(other_label)

                card_data = card_map[cid]
                arranged_cards.append(ArrangedCard(
                    id=cid,
                    title=card_data["title"],
                    content_type=card_data["content_type"],
                    extracted_text=card_data["extracted_text"],
                    metadata={**(card_data["metadata"] or {}), "cluster_reason": best_reason},
                    tags=card_data["tags"],
                    relevance_score=round(centrality[cid], 4),
                    appears_in_clusters=cross_clusters,
                ))

            clusters_out.append(ClusterRow(
                cluster_name=label,
                cluster_id=label.lower().replace(" ", "_").replace("&", "and"),
                card_count=len(arranged_cards),
                cards=arranged_cards,
            ))

        # Sort: largest clusters first
        clusters_out.sort(key=lambda c: -c.card_count)


        logger.info(
            f"[SmartArrange] Done | "
            f"clusters={len(clusters_out)} | "
            f"sizes={[c.card_count for c in clusters_out]}"
        )

        return SmartArrangeResponse(
            user_id=request.user_id,
            total_cards=len(card_ids),
            cluster_count=len(clusters_out),
            clusters=clusters_out,
        )

    except Exception as e:
        logger.error(f"[SmartArrange] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Smart arrange failed: {str(e)}")
