import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_embed_single():
    """Test single text embedding."""
    response = client.post("/embed", json={"text": "Hello world"})
    assert response.status_code == 200
    data = response.json()
    assert "embedding" in data
    assert "dimension" in data
    assert data["dimension"] == 384  # MiniLM-L6-v2 dimension
    assert data["model"] == "all-MiniLM-L6-v2"

def test_embed_batch():
    """Test batch text embedding."""
    response = client.post("/embed/batch", json={"texts": ["Hello", "World"]})
    assert response.status_code == 200
    data = response.json()
    assert "embeddings" in data
    assert len(data["embeddings"]) == 2
    assert data["count"] == 2
    assert data["dimension"] == 384

def test_embed_empty():
    """Test error handling for empty text."""
    response = client.post("/embed", json={"text": ""})
    assert response.status_code == 400
    assert "detail" in response.json()
