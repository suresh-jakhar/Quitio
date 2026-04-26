import logging
from typing import List, Dict, Any, Optional
from services.db_service import DBService

logger = logging.getLogger(__name__)

class NoResultsHandler:
    def __init__(self, db_service: DBService):
        self.db_service = db_service

    async def handle_no_results(self, query: str, user_id: str) -> Dict[str, Any]:
        """
        Handle cases where no relevant context is found for a RAG query.
        Suggests alternative topics or tags.
        """
        logger.info(f"[NoResults] Handling empty context for query: {query}")
        
        # 1. Fetch user's top tags to suggest
        try:
            # We'll use the DBService to get most used tags for this user
            tags = self.db_service.get_user_tags(user_id)
            # Take top 5 tags
            top_tags = [t['name'] for t in tags[:5]]
            
            suggestion_text = ""
            if top_tags:
                suggestion_text = f" I couldn't find any documents about '{query}' in your library. Try asking about your main topics like: {', '.join(top_tags)}."
            else:
                suggestion_text = f" I don't see any documents related to '{query}' in your current collection."

            return {
                "answer": f"I'm sorry, I couldn't find any relevant information to answer that question.{suggestion_text}",
                "suggestions": top_tags,
                "confidence": 0.0,
                "verification": {
                    "verified": False,
                    "unsupported_claims": ["No documents found."],
                    "confidence": 0.0,
                    "explanation": "Retrieval failed to find any relevant cards."
                }
            }
        except Exception as e:
            logger.error(f"[NoResults] Error fetching tags for suggestions: {e}")
            return {
                "answer": f"I couldn't find any documents related to '{query}' and encountered an error generating suggestions.",
                "suggestions": [],
                "confidence": 0.0
            }
