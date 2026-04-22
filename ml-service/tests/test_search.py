import pytest
from fastapi.testclient import TestClient
from main import app
from unittest.mock import MagicMock, patch

client = TestClient(app)

@pytest.fixture
def mock_embedding():
    return [0.1] * 384

def test_vector_search_endpoint(mock_embedding):
    """Test the vector search endpoint with mocked services."""
    with patch("services.embedding_service.EmbeddingService.embed_text") as mock_embed:
        with patch("services.vector_store.VectorStore.find_similar_cards") as mock_search:
            # Setup mocks
            mock_embed.return_value = mock_embedding
            mock_search.return_value = [
                {"id": "1", "title": "Test Card", "content_type": "pdf", "similarity": 0.95}
            ]
            
            # Make request
            payload = {
                "query": "test query",
                "user_id": "user-123",
                "top_k": 5,
                "tags": ["work"]
            }
            response = client.post("/search/vector", json=payload)
            
            # Verify
            assert response.status_code == 200
            data = response.json()
            assert data["query"] == "test query"
            assert len(data["results"]) == 1
            assert data["results"][0]["similarity"] == 0.95
            
            # Verify calls
            mock_embed.assert_called_once_with("test query")
            mock_search.assert_called_once()
            args, kwargs = mock_search.call_args
            assert kwargs["user_id"] == "user-123"
            assert kwargs["tags"] == ["work"]
            assert kwargs["limit"] == 5

def test_vector_search_validation():
    """Test validation errors for search endpoint."""
    # Missing query
    response = client.post("/search/vector", json={"user_id": "123"})
    assert response.status_code == 422
    
    # Invalid top_k
    response = client.post("/search/vector", json={
        "query": "test", 
        "user_id": "123", 
        "top_k": 0
    })
    assert response.status_code == 422
