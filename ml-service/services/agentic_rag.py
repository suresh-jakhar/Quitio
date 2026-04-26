import logging
import asyncio
from typing import List, Dict, Any, Optional
from services.retriever import Retriever
from services.citations import CitationTracker
from utils.llm import llm_service

logger = logging.getLogger(__name__)

class AgenticRAG:
    def __init__(self, retriever: Retriever, citation_tracker: CitationTracker):
        self.retriever = retriever
        self.citation_tracker = citation_tracker

    async def multi_hop_query(
        self, 
        query: str, 
        user_id: str, 
        max_hops: int = 2, 
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Performs a multi-hop RAG query.
        If the initial retrieval doesn't provide enough info, it generates sub-queries to find more.
        """
        logger.info(f"[AgenticRAG] Starting multi-hop query: {query}")
        
        all_context_cards = []
        seen_card_ids = set()
        hops_taken = 0
        current_query = query
        final_answer = ""
        
        while hops_taken < max_hops:
            hops_taken += 1
            logger.info(f"[AgenticRAG] Hop {hops_taken}/{max_hops} | Query: {current_query}")
            
            # 1. Retrieve context for current query
            new_cards = await self.retriever.retrieve_context(
                query=current_query,
                user_id=user_id,
                top_k=top_k
            )
            
            if not new_cards and hops_taken == 1:
                logger.info("[AgenticRAG] No info found on first hop. Returning empty context.")
                return {
                    "answer": "", # Let the router handle no-results
                    "citations": {"card_details": [], "count": 0},
                    "context_count": 0,
                    "hops_used": 1,
                    "is_multi_hop": True
                }

            # 2. Add unique cards to global context
            added_new = False
            for card in new_cards:
                if card['id'] not in seen_card_ids:
                    all_context_cards.append(card)
                    seen_card_ids.add(card['id'])
                    added_new = True
            
            if not added_new and hops_taken > 1:
                logger.info("[AgenticRAG] No new info found in this hop. Stopping.")
                break
                
            # 3. Generate intermediate answer/assessment
            # We use a special prompt to see if we have enough info
            assessment_answer = await llm_service.generate_answer(
                query=query, # Always evaluate against original query
                context_cards=all_context_cards
            )
            
            # 4. Check if we need more info
            if hops_taken < max_hops and self._needs_more_info(assessment_answer):
                sub_query = await self._generate_sub_query(query, assessment_answer)
                if not sub_query or sub_query == current_query:
                    logger.info("[AgenticRAG] Could not generate a better sub-query. Stopping.")
                    final_answer = assessment_answer
                    break
                current_query = sub_query
            else:
                final_answer = assessment_answer
                break
                
        # 5. Final Citations
        citations = self.citation_tracker.extract_citations(final_answer, all_context_cards)
        
        return {
            "answer": final_answer,
            "citations": citations,
            "context_count": len(all_context_cards),
            "hops_used": hops_taken,
            "is_multi_hop": True
        }

    def _needs_more_info(self, answer: str) -> bool:
        """Heuristic check if the LLM admitted it doesn't have enough info."""
        indicators = [
            "don't have enough information",
            "not mentioned in the provided context",
            "I don't know",
            "I'm sorry, but",
            "does not contain information about",
            "insufficient information"
        ]
        answer_lower = answer.lower()
        return any(ind in answer_lower for ind in indicators)

    async def _generate_sub_query(self, original_query: str, current_answer: str) -> Optional[str]:
        """Ask the LLM to generate a search query to find the missing information."""
        prompt = (
            f"Original Question: {original_query}\n"
            f"Current Answer Attempt: {current_answer}\n\n"
            "The current answer is incomplete because some information is missing from the local database.\n"
            "Generate a concise search query (3-6 words) that would help find the missing facts to complete the answer.\n"
            "Output ONLY the search query text."
        )
        
        try:
            completion = await llm_service.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a search optimization agent."},
                    {"role": "user", "content": prompt}
                ],
                model=llm_service.model,
                temperature=0.4,
                max_tokens=50
            )
            sub_query = completion.choices[0].message.content.strip()
            # Clean up potential quotes
            sub_query = sub_query.replace('"', '').replace("'", "")
            logger.info(f"[AgenticRAG] Generated sub-query: {sub_query}")
            return sub_query
        except Exception as e:
            logger.error(f"[AgenticRAG] Error generating sub-query: {e}")
            return None
