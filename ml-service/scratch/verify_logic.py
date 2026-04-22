import sys
import os
import asyncio
from unittest.mock import MagicMock

# 1. Mock dependencies that fail to install
sys.modules["sentence_transformers"] = MagicMock()
sys.modules["torch"] = MagicMock()
sys.modules["psycopg"] = MagicMock()
sys.modules["pgvector"] = MagicMock()
sys.modules["pgvector.psycopg"] = MagicMock()
sys.modules["numpy"] = MagicMock()

# 2. Add current dir to path
sys.path.append(os.path.join(os.getcwd(), "ml-service"))

# 3. Import routers and services
from routers import health, embed, search
from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from services.db_service import DBService

async def test_logic():
    print("\n--- Starting Direct Logic Verification ---")
    
    # 1. Verify Health Router
    print("Testing health router ...", end=" ")
    res = await health.health_check()
    assert res["status"] == "ok"
    print("PASS")
    
    # 2. Verify Embedding Service
    print("Testing embedding service ...", end=" ")
    # Mock the model behavior
    mock_model = MagicMock()
    mock_embedding = MagicMock()
    mock_embedding.tolist.return_value = [0.1] * 384
    mock_model.encode.return_value = mock_embedding
    
    from services.model_loader import ModelLoader
    ModelLoader._model = mock_model
    
    service = EmbeddingService()
    embedding = service.embed_text("test text")
    assert len(embedding) == 384
    print("PASS")
    
    # 3. Verify Vector Store Logic
    print("Testing vector store search logic ...", end=" ")
    db_service = DBService()
    v_store = VectorStore(db_service)
    
    # Mock DB connection and results
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    
    # Setup context managers
    db_service.get_connection = MagicMock()
    db_service.get_connection.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    mock_cur.fetchall.return_value = [
        ("uuid-1", "Test Title", "pdf", 0.05) # cosine distance
    ]
    
    results = v_store.find_similar_cards([0.1]*384, user_id="user-1")
    assert len(results) == 1
    assert results[0]["title"] == "Test Title"
    print("PASS")
    
    # 4. Verify Search Router integration
    print("Testing search router integration ...", end=" ")
    class MockRequest:
        query = "test"
        user_id = "user-1"
        top_k = 5
        tags = None
        
    # We call the function directly
    # Note: we need to bypass Depends() or mock the dependency injection
    res = await search.vector_search(
        request=MockRequest(),
        embed_service=service,
        vector_store=v_store
    )
    assert res.query == "test"
    assert len(res.results) == 1
    print("PASS")
    
    print("\n--- ALL CORE LOGIC VERIFIED SUCCESSFULLY ---")

if __name__ == "__main__":
    try:
        asyncio.run(test_logic())
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
