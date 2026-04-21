import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 8000))
NODE_ENV = os.getenv("NODE_ENV", "development")
DATABASE_URL = os.getenv("DATABASE_URL")
