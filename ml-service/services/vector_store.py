import logging
import psycopg
from pgvector.psycopg import register_vector
from typing import List, Tuple, Any, Optional

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self, db_service):
        self.db_service = db_service

    def store_embedding(self, card_id: str, embedding: List[float]):
        """Store embedding in pgvector."""
        try:
            with self.db_service.get_connection() as conn:
                register_vector(conn)
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE cards SET embedding = %s::vector WHERE id = %s",
                        (embedding, card_id)
                    )
                conn.commit()
            logger.info(f"Successfully stored embedding for card {card_id}")
        except Exception as e:
            logger.error(f"Error storing embedding for card {card_id}: {e}")
            raise

    def find_similar_cards(self, 
                           embedding: List[float], 
                           user_id: str, 
                           tags: Optional[List[str]] = None, 
                           limit: int = 10) -> List[dict]:
        """
        Find similar cards by embedding with optional filters.
        Returns: List of card dictionaries with similarity scores.
        """
        try:
            with self.db_service.get_connection() as conn:
                register_vector(conn)
                with conn.cursor() as cur:
                    # Base query with tags
                    sql = """
                        SELECT c.id, c.title, c.content_type, 1 - (c.embedding <=> %s::vector) as similarity,
                               ARRAY_AGG(t.name) as tags
                        FROM cards c
                        LEFT JOIN card_tags ct ON c.id = ct.card_id
                        LEFT JOIN tags t ON ct.tag_id = t.id
                        WHERE c.user_id = %s AND c.embedding IS NOT NULL
                    """
                    params = [embedding, user_id]

                    # Tag filter
                    if tags and len(tags) > 0:
                        sql += """
                            AND c.id IN (
                                SELECT DISTINCT ct.card_id 
                                FROM card_tags ct
                                JOIN tags t ON ct.tag_id = t.id
                                WHERE t.name = ANY(%s)
                            )
                        """
                        params.append(tags)

                    # Sorting and limit
                    sql += " GROUP BY c.id ORDER BY c.embedding <=> %s::vector LIMIT %s"
                    params.extend([embedding, limit])

                    cur.execute(sql, params)
                    rows = cur.fetchall()
                    
                    # Convert to list of dicts for API response
                    results = []
                    for row in rows:
                        results.append({
                            "id": str(row[0]),
                            "title": row[1],
                            "content_type": row[2],
                            "similarity": float(row[3]),
                            "tags": [tag for tag in row[4] if tag is not None]
                        })
            return results
        except Exception as e:
            logger.error(f"Error finding similar cards: {e}")
            raise

    def bm25_search(self, 
                    query: str, 
                    user_id: str, 
                    limit: int = 10) -> List[dict]:
        """
        Full-text search using PostgreSQL FTS (BM25-like ranking).
        Searches across titles and extracted_text.
        """
        try:
            with self.db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    # Use a single concatenated tsvector — must match the GIN index expression exactly
                    sql = """
                        SELECT 
                            id, title, content_type,
                            ts_rank(
                                to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(extracted_text, '')),
                                plainto_tsquery('english', %s)
                            ) as rank
                        FROM cards
                        WHERE user_id = %s
                          AND to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(extracted_text, ''))
                              @@ plainto_tsquery('english', %s)
                        ORDER BY rank DESC
                        LIMIT %s
                    """
                    params = [query, user_id, query, limit]

                    cur.execute(sql, params)
                    rows = cur.fetchall()
                    
                    results = []
                    for row in rows:
                        results.append({
                            "id": str(row[0]),
                            "title": row[1],
                            "content_type": row[2],
                            "similarity": float(row[3]) # Mapping rank to similarity for consistent UI
                        })
            return results
        except Exception as e:
            logger.error(f"Error performing BM25 search: {e}")
            raise

    def get_user_cards(self, user_id: str) -> List[dict]:
        """
        Fetch all cards for a user with their embeddings and tags.
        Used for Knowledge Graph construction.
        """
        try:
            with self.db_service.get_connection() as conn:
                register_vector(conn)
                with conn.cursor() as cur:
                    sql = """
                        SELECT c.id, c.title, c.extracted_text, c.content_type, 
                               c.embedding, c.semantic_metadata, c.concept_embedding, 
                               array_agg(t.name) as tags
                        FROM cards c
                        LEFT JOIN card_tags ct ON c.id = ct.card_id
                        LEFT JOIN tags t ON ct.tag_id = t.id
                        WHERE c.user_id = %s AND c.embedding IS NOT NULL
                        GROUP BY c.id
                    """
                    cur.execute(sql, (user_id,))
                    rows = cur.fetchall()
                    
                    results = []
                    for row in rows:
                        results.append({
                            "id": str(row[0]),
                            "title": row[1],
                            "extracted_text": row[2],
                            "content_type": row[3],
                            "embedding": row[4],
                            "semantic_metadata": row[5],
                            "concept_embedding": row[6],
                            "tags": [tag for tag in row[7] if tag is not None]
                        })
            return results
        except Exception as e:
            logger.error(f"Error fetching user cards for graph: {e}")
            raise

    def init_index(self):
        """Ensure pgvector extension, column, and indexes are present."""
        try:
            with self.db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Enable extension
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
                    
                    # 2. Add embedding column if it doesn't exist
                    cur.execute("""
                        ALTER TABLE cards 
                        ADD COLUMN IF NOT EXISTS embedding vector(384)
                    """)
                    
                    # 3. Create HNSW index for faster and more robust retrieval
                    cur.execute("DROP INDEX IF EXISTS idx_cards_embedding")
                    cur.execute("""
                        CREATE INDEX idx_cards_embedding ON cards 
                        USING hnsw (embedding vector_cosine_ops)
                    """)

                    # 4. Recreate GIN index for Full-Text Search with corrected expression.
                    # DROP first so IF NOT EXISTS doesn't silently keep the old mis-matched index.
                    cur.execute("DROP INDEX IF EXISTS idx_cards_fts")
                    cur.execute("""
                        CREATE INDEX idx_cards_fts ON cards 
                        USING gin (
                            to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(extracted_text, ''))
                        )
                    """)

                    # 5. Ensure graph_edges has edge_type column
                    cur.execute("""
                        ALTER TABLE graph_edges 
                        ADD COLUMN IF NOT EXISTS edge_type VARCHAR(50)
                    """)

                    # 6. Ensure indices on graph_edges for fast retrieval
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_card_id)")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_card_id)")

                    # 7. Add centrality column to cards for ranking
                    cur.execute("ALTER TABLE cards ADD COLUMN IF NOT EXISTS centrality FLOAT DEFAULT 0.0")

                    # 8. Add cluster_label column for stability (Phase 2)
                    cur.execute("ALTER TABLE cards ADD COLUMN IF NOT EXISTS cluster_label VARCHAR(255)")

                    # 9. Deep Semantic Layer (Phase 3)
                    # JSONB for structured concepts {intent, domain, entities}
                    cur.execute("ALTER TABLE cards ADD COLUMN IF NOT EXISTS semantic_metadata JSONB")
                    # Vector for CONCEPTUAL similarity (embedding of the LLM concept summary)
                    cur.execute("ALTER TABLE cards ADD COLUMN IF NOT EXISTS concept_embedding vector(384)")
                    
                    # Create index for concept retrieval
                    cur.execute("DROP INDEX IF EXISTS idx_cards_concept_embedding")
                    cur.execute("""
                        CREATE INDEX idx_cards_concept_embedding ON cards 
                        USING hnsw (concept_embedding vector_cosine_ops)
                    """)
                conn.commit()
            logger.info("pgvector and FTS database structure initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing database structure: {e}")
