import pytest
from fastapi.testclient import TestClient
import numpy as np
from main import app

client = TestClient(app)

def test_health_endpoint():
    """Verify Phase 19: Health check works."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model" in data

def test_embedding_generation():
    """Verify Phase 20: Text embedding works."""
    text = "This is a test query for AI search."
    response = client.post("/embed", json={"text": text})
    assert response.status_code == 200
    data = response.json()
    assert "embedding" in data
    assert len(data["embedding"]) == 384
    assert isinstance(data["embedding"][0], float)

def test_batch_embedding():
    """Verify Phase 20: Batch processing works."""
    texts = ["First text", "Second text", "Third text"]
    response = client.post("/embed/batch", json={"texts": texts})
    assert response.status_code == 200
    data = response.json()
    assert len(data["embeddings"]) == 3
    for emb in data["embeddings"]:
        assert len(emb) == 384

def test_semantic_search_logic():
    """Verify Phase 22: Search returns structured results."""
    # Note: We use a dummy user_id that likely has no cards for a clean structure test
    payload = {
        "query": "test query",
        "user_id": "00000000-0000-0000-0000-000000000000",
        "top_k": 5
    }
    response = client.post("/search/vector", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "query" in data
    assert isinstance(data["results"], list)
