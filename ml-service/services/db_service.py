import psycopg
from psycopg_pool import AsyncConnectionPool
from config import DATABASE_URL
import logging
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# Module-level connection pool — created once, shared across all requests.
_pool: AsyncConnectionPool | None = None


async def _get_pool() -> AsyncConnectionPool:
    global _pool
    if _pool is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not configured")
        _pool = AsyncConnectionPool(
            conninfo=DATABASE_URL,
            min_size=2,
            max_size=10,
            kwargs={"autocommit": False},
        )
        logger.info("Async DB connection pool initialized (min=2, max=10)")
    return _pool


class DBService:
    def __init__(self, connection_string: str = DATABASE_URL):
        self.connection_string = connection_string

    @asynccontextmanager
    async def get_connection(self):
        """
        Async context manager that yields a pooled connection.
        Registers pgvector on each connection so vector types are parsed correctly.
        The pool handles checkout/return automatically.
        """
        pool = await _get_pool()
        async with pool.connection() as conn:
            try:
                from pgvector.psycopg import register_vector_async
                await register_vector_async(conn)
            except Exception as e:
                logger.warning(f"Could not register pgvector on connection: {e}")
            yield conn

