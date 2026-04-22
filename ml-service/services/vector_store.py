import logging
import psycopg
from pgvector.psycopg import register_vector
from typing import List, Tuple, Any

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

    def find_similar_cards(self, embedding: List[float], user_id: str = None, limit: int = 10) -> List[Tuple[str, str, str, float]]:
        """
        Find similar cards by embedding.
        Returns: List of (id, title, content_type, similarity)
        """
        try:
            with self.db_service.get_connection() as conn:
                register_vector(conn)
                with conn.cursor() as cur:
                    query = """
                        SELECT id, title, content_type, 1 - (embedding <=> %s) as similarity
                        FROM cards
                        WHERE embedding IS NOT NULL
                    """
                    params = [embedding]

                    if user_id:
                        query += " AND user_id = %s"
                        params.append(user_id)

                    query += " ORDER BY embedding <=> %s LIMIT %s"
                    params.extend([embedding, limit])

                    cur.execute(query, params)
                    results = cur.fetchall()
            return results
        except Exception as e:
            logger.error(f"Error finding similar cards: {e}")
            raise

    def init_index(self):
        """Ensure pgvector extension and index are present."""
        try:
            with self.db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    # Enable pgvector extension
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
                    # Create IVFFlat index for cosine similarity
                    # Note: 'lists' parameter should be tuned based on dataset size
                    # For small datasets, 100 is a good starting point.
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_cards_embedding ON cards 
                        USING ivfflat (embedding vector_cosine_ops) 
                        WITH (lists = 100)
                    """)
                conn.commit()
            logger.info("pgvector index initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing pgvector index: {e}")
            # Don't raise here, as it might fail if already exists or during dev
