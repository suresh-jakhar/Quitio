import sys
import os
from unittest.mock import MagicMock

# 1. Mock heavy binary dependencies
sys.modules["sentence_transformers"] = MagicMock()
sys.modules["torch"] = MagicMock()
sys.modules["psycopg"] = MagicMock()
sys.modules["pgvector"] = MagicMock()
sys.modules["pgvector.psycopg"] = MagicMock()
sys.modules["numpy"] = MagicMock()

# 2. Mock the model behavior for embeddings
from unittest.mock import patch
mock_embedding = MagicMock()
mock_embedding.tolist.return_value = [0.1] * 384

# 3. Add path and run uvicorn
sys.path.append(os.path.join(os.getcwd(), "ml-service"))
import uvicorn
from main import app

if __name__ == "__main__":
    # We patch the model encode before starting
    with patch("services.model_loader.ModelLoader.load_model") as mock_load:
        mock_load.return_value.encode.return_value = mock_embedding
        print("\nStarting Mocked ML Service for Visual Verification...")
        print("Swagger UI: http://localhost:8000/docs\n")
        uvicorn.run(app, host="127.0.0.1", port=8000)
