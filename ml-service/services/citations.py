import logging
import re
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class CitationTracker:
    def extract_citations(self, answer: str, context_cards: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Identify which context cards are actually referenced in the LLM's answer.
        Returns a structured list of citations.
        """
        citations = []
        answer_lower = answer.lower()
        
        for card in context_cards:
            # 1. Direct title mention (case-insensitive)
            title = card.get('title', '')
            # Escape special characters for regex
            safe_title = re.escape(title.lower())
            
            # 2. Check for numeric citations if we used them in prompt (e.g. [1], [Card 1])
            # Our prompt in generate_answer mentioned: "Citations: Refer to the cards by their titles if relevant."
            # But users often use numbers. We'll check titles mainly.
            
            # Fuzzy match: check if a significant part of the title is mentioned
            # or if the title itself is mentioned.
            is_cited = False
            if safe_title and len(safe_title) > 3:
                if safe_title in answer_lower:
                    is_cited = True
                else:
                    # Check for partial matches (e.g. "Project Quitio" mentioned as "Quitio")
                    words = title.split()
                    long_words = [w.lower() for w in words if len(w) > 4]
                    if long_words and all(w in answer_lower for w in long_words):
                        is_cited = True
            
            if is_cited:
                citations.append({
                    "id": card["id"],
                    "title": card["title"],
                    "content_type": card.get("content_type", "unknown"),
                    "similarity": card.get("similarity", 0.0)
                })
        
        # If no explicit citations found, but the answer was generated, 
        # we might want to return the top 1-2 most relevant cards as "likely sources"
        # but the spec says "Track which cards were used". 
        # For now, we'll only return explicit ones to maintain high accuracy.
        
        return {
            "card_ids": [c["id"] for c in citations],
            "card_details": citations
        }
