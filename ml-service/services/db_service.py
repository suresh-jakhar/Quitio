import psycopg
from config import DATABASE_URL
import logging

logger = logging.getLogger(__name__)

class DBService:
    def __init__(self, connection_string: str = DATABASE_URL):
        self.connection_string = connection_string

    def get_connection(self):
        try:
            conn = psycopg.connect(self.connection_string)
            return conn
        except Exception as e:
            logger.error(f"Error connecting to database: {e}")
            raise
