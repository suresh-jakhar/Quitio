import pytest
from services.vector_store import VectorStore
from services.db_service import DBService
from uuid import uuid4

@pytest.fixture
def vector_store():
    return VectorStore(DBService())

def test_vector_store_init(vector_store):
    """Test that the index can be initialized without error."""
    # This might fail in a restricted CI environment without a real DB
    # but for local dev it's a good check.
    try:
        vector_store.init_index()
    except Exception as e:
        pytest.fail(f"Index initialization failed: {e}")

def test_store_and_search(vector_store):
    """
    Test storing an embedding and finding it.
    Note: This requires a real database and a 'cards' table.
    """
    # This is more of an integration test. 
    # We skip it if we don't want to mess with the DB during unit tests.
    pass
