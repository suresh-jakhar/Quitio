from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

import config
from utils.logging import setup_logging
from services.model_loader import ModelLoader
from services.vector_store import VectorStore
from services.db_service import DBService
from routers import health, embed, search, graph, rag, arrange

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("Starting QUITIO ML Service...")
    
    # Pre-load the embedding model
    try:
        loader = ModelLoader(model_name=config.MODEL_NAME, device=config.MODEL_DEVICE)
        loader.load_model()
        
        # Initialize vector index
        db_service = DBService()
        vector_store = VectorStore(db_service)
        vector_store.init_index()
    except Exception as e:
        logger.error(f"Critical error during startup: {e}")
        # In production, you might want to exit here
        
    yield
    # Shutdown logic
    logger.info("Shutting down QUITIO ML Service...")

app = FastAPI(
    title="QUITIO ML Service",
    description="ML-powered semantic engine for Quitio",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.BACKEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(embed.router, prefix="/embed", tags=["Embeddings"])
app.include_router(search.router, prefix="/search", tags=["Search"])
app.include_router(graph.router, prefix="/graph", tags=["Graph"])
app.include_router(rag.router, prefix="/rag", tags=["RAG"])
app.include_router(arrange.router, prefix="/arrange", tags=["Arrange"])

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Running ML service on port {config.PORT}")
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=(config.ENV == "development"))
