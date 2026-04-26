import logging
from typing import List, Tuple
from services.db_service import DBService

logger = logging.getLogger(__name__)

class GraphStore:
    def __init__(self, db_service: DBService):
        self.db_service = db_service

    async def add_edge(self, source_id: str, target_id: str,
                       similarity: float, edge_type: str, reason: str):
        """Add or update a single edge (kept for backward compat)."""
        await self.batch_add_edges([(source_id, target_id, similarity, edge_type, reason)])

    async def batch_add_edges(self, edges: list):
        """
        Batch-insert a list of (source_id, target_id, score, edge_type, reason) tuples
        in a SINGLE transaction. Much faster than one INSERT per edge.
        """
        if not edges:
            return
        try:
            async with self.db_service.get_connection() as conn:
                async with conn.cursor() as cur:
                    await cur.executemany(
                        """
                        INSERT INTO graph_edges
                        (source_card_id, target_card_id, similarity_score, edge_type, reason)
                        VALUES (%s::uuid, %s::uuid, %s, %s, %s)
                        ON CONFLICT (source_card_id, target_card_id)
                        DO UPDATE SET
                            similarity_score = EXCLUDED.similarity_score,
                            edge_type        = EXCLUDED.edge_type,
                            reason           = EXCLUDED.reason,
                            created_at       = NOW()
                        """,
                        edges
                    )
                await conn.commit()
            logger.info(f"[GraphStore] Batch inserted {len(edges)} edges.")
        except Exception as e:
            logger.error(f"[GraphStore] Error in batch_add_edges: {e}")
            raise

    async def delete_user_edges(self, user_id: str):
        """
        Delete all edges where the source card belongs to the specified user.
        """
        try:
            async with self.db_service.get_connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        DELETE FROM graph_edges
                        WHERE source_card_id IN (
                            SELECT id FROM cards WHERE user_id = %s
                        )
                        """,
                        (user_id,)
                    )
                await conn.commit()
            logger.info(f"Deleted old graph edges for user {user_id}")
        except Exception as e:
            logger.error(f"Error deleting edges for user {user_id}: {e}")
            raise

    async def delete_user_graph(self, user_id: str):
        """Alias for delete_user_edges for backward compatibility."""
        return await self.delete_user_edges(user_id)

    async def delete_card_edges(self, card_id: str):
        """
        Delete all edges associated with a specific card (both as source and target).
        Used for incremental updates.
        """
        try:
            async with self.db_service.get_connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "DELETE FROM graph_edges WHERE source_card_id = %s OR target_card_id = %s",
                        (card_id, card_id)
                    )
                await conn.commit()
            logger.info(f"Deleted edges for card {card_id}")
        except Exception as e:
            logger.error(f"Error deleting edges for card {card_id}: {e}")
            raise

    async def get_neighbors(self, card_id: str, limit: int = 10) -> List[dict]:
        """
        Fetch the most related cards for a given card ID.
        """
        try:
            logger.info(f"[GraphStore] get_neighbors called for card_id={card_id!r} limit={limit}")
            async with self.db_service.get_connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        SELECT target_card_id, similarity_score, edge_type, reason
                        FROM graph_edges
                        WHERE source_card_id = %s::uuid
                        ORDER BY similarity_score DESC
                        LIMIT %s
                        """,
                        (card_id, limit)
                    )
                    rows = await cur.fetchall()
                    logger.info(f"[GraphStore] Query returned {len(rows)} rows for card_id={card_id!r}")
                    
                    results = []
                    for row in rows:
                        results.append({
                            "target_id": str(row[0]),
                            "similarity": float(row[1]),
                            "edge_type": row[2],
                            "reason": row[3]
                        })
            return results
        except Exception as e:
            logger.error(f"[GraphStore] Error fetching neighbors for card {card_id}: {e}")
            raise
