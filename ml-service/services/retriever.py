import logging
from typing import List, Dict, Any
from services.vector_store import VectorStore
from services.graph_query import GraphQuery
from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class Retriever:
    def __init__(self, vector_store: VectorStore, graph_query: GraphQuery, embed_service: EmbeddingService):
        self.vector_store = vector_store
        self.graph_query = graph_query
        self.embed_service = embed_service

    async def retrieve_context(self, query: str, user_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve relevant cards using a combination of hybrid search and graph traversal.
        """
        try:
            logger.info(f"Retrieving context for query: {query}")
            
            # 1. Embed the query
            query_embedding = self.embed_service.embed_text(query)
            
            # 2. Hybrid search for initial seeds
            seeds = await self.graph_query.search_with_graph(
                query_embedding=query_embedding,
                user_id=user_id,
                vector_store=self.vector_store,
                top_k=top_k,
                query_text=query
            )
            
            # 3. Fetch full card details for LLM context
            card_ids = [s['id'] for s in seeds]
            full_cards = await self.vector_store.get_cards(card_ids)
            
            # Merge similarity scores and origin
            score_map = {s['id']: (s['similarity'], s.get('origin')) for s in seeds}
            for card in full_cards:
                score, origin = score_map.get(card['id'], (0.0, None))
                card['similarity'] = score
                card['origin'] = origin
            
            # Sort by similarity
            full_cards.sort(key=lambda x: x['similarity'], reverse=True)
            
            return full_cards
            
        except Exception as e:
            logger.error(f"Error in retrieve_context: {e}")
            raise
