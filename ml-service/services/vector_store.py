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
                        "UPDATE cards SET embedding = %s WHERE id = %s",
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
                        SELECT c.id, c.title, c.content_type, 1 - (c.embedding <=> %s) as similarity
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
                    sql += " ORDER BY c.embedding <=> %s LIMIT %s"
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

    def init_index(self):
        """Ensure pgvector extension and index are present."""
        try:
            with self.db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_cards_embedding ON cards 
                        USING ivfflat (embedding vector_cosine_ops) 
                        WITH (lists = 100)
                    """)
                conn.commit()
            logger.info("pgvector index initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing pgvector index: {e}")
