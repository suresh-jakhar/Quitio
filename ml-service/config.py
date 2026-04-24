import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 8000))
ENV = os.getenv("ENV", "development")
DATABASE_URL = os.getenv("DATABASE_URL")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
MODEL_NAME = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")
MODEL_DEVICE = os.getenv("MODEL_DEVICE", "cpu")
API_TIMEOUT = int(os.getenv("API_TIMEOUT", 30))
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", 32))
