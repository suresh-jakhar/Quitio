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
                    # Base query
                    sql = """
                        SELECT c.id, c.title, c.content_type, 1 - (c.embedding <=> %s::vector) as similarity
                        FROM cards c
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
                    sql += " ORDER BY c.embedding <=> %s::vector LIMIT %s"
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
                            "similarity": float(row[3])
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
                    # ts_rank calculates relevance based on keyword frequency and proximity
                    # we use weight: title (A) + extracted_text (B)
                    sql = """
                        SELECT 
                            id, title, content_type,
                            ts_rank(
                                setweight(to_tsvector('english', COALESCE(title, '')), 'A') || 
                                setweight(to_tsvector('english', COALESCE(extracted_text, '')), 'B'), 
                                plainto_tsquery('english', %s)
                            ) as rank
                        FROM cards
                        WHERE user_id = %s
                          AND (
                            to_tsvector('english', COALESCE(title, '')) || 
                            to_tsvector('english', COALESCE(extracted_text, ''))
                          ) @@ plainto_tsquery('english', %s)
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
                        SELECT c.id, c.embedding, array_agg(t.name) as tags
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
                            "embedding": row[1],
                            "tags": [tag for tag in row[2] if tag is not None]
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
                    
                    # 3. Create IVFFlat index for faster retrieval
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_cards_embedding ON cards 
                        USING ivfflat (embedding vector_cosine_ops) 
                        WITH (lists = 100)
                    """)

                    # 4. Create GIN index for Full-Text Search
                    # This speeds up the @@ operator queries
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_cards_fts ON cards 
                        USING gin ((
                            setweight(to_tsvector('english', COALESCE(title, '')), 'A') || 
                            setweight(to_tsvector('english', COALESCE(extracted_text, '')), 'B')
                        ))
                    """)

                    # 5. Ensure graph_edges has edge_type column
                    cur.execute("""
                        ALTER TABLE graph_edges 
                        ADD COLUMN IF NOT EXISTS edge_type VARCHAR(50)
                    """)

                    # 6. Ensure indices on graph_edges for fast retrieval
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_card_id)")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_card_id)")
                conn.commit()
            logger.info("pgvector and FTS database structure initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing database structure: {e}")
