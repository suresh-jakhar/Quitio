import logging
import json
import numpy as np
from typing import Optional, Dict, Any
from utils.llm import llm_service
from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore

logger = logging.getLogger(__name__)

class SemanticEnricher:
    def __init__(self, embedding_service: EmbeddingService, vector_store: VectorStore):
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    async def enrich_card(self, card_id: str, title: str, text: str) -> Optional[Dict[str, Any]]:
        """
        Full Phase 3 Enrichment:
        1. Extract Intent/Domain/Entities (LLM)
        2. Generate Concept Summary
        3. Embed Concept Summary
        4. Store in DB
        """
        logger.info(f"[SemanticEnricher] Enriching card {card_id}: {title}")
        
        try:
            # 1. Extract Semantic Metadata
            metadata = await llm_service.extract_semantic_metadata(title, text)
            if not metadata:
                logger.warning(f"Failed to extract metadata for card {card_id}")
                return None
            
            # 2. Create Concept Summary for Embedding
            # We want an embedding that represents the CONCEPT, not just the keywords.
            entities_str = ", ".join(metadata.get("entities", []))
            concept_summary = f"Domain: {metadata.get('domain')}. Intent: {metadata.get('intent')}. Entities: {entities_str}."
            
            # 3. Generate Concept Embedding
            concept_emb = self.embedding_service.embed_text(concept_summary)
            
            # 4. Store in DB
            with self.vector_store.db_service.get_connection() as conn:
                from pgvector.psycopg import register_vector
                register_vector(conn)
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE cards 
                        SET semantic_metadata = %s,
                            concept_embedding = %s::vector
                        WHERE id = %s
                    """, (json.dumps(metadata), concept_emb, card_id))
                conn.commit()
            
            logger.info(f"Successfully enriched card {card_id} with semantic metadata.")
            return metadata

        except Exception as e:
            logger.error(f"Error during semantic enrichment of card {card_id}: {e}")
            return None

    async def batch_enrich_missing(self, user_id: str):
        """Find cards missing metadata and enrich them."""
        try:
            with self.vector_store.db_service.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, title, extracted_text 
                        FROM cards 
                        WHERE user_id = %s 
                          AND (semantic_metadata IS NULL OR concept_embedding IS NULL)
                    """, (user_id,))
                    rows = cur.fetchall()
            
            if not rows:
                return 0
            
            count = 0
            for card_id, title, text in rows:
                success = await self.enrich_card(str(card_id), title or "", text or "")
                if success:
                    count += 1
            
            return count
        except Exception as e:
            logger.error(f"Batch enrichment error: {e}")
            return 0
