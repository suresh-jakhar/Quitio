import logging
import json
from typing import List, Dict, Any, Optional
from utils.llm import llm_service

logger = logging.getLogger(__name__)

class AnswerVerifier:
    async def verify_answer(self, query: str, answer: str, context_cards: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Verify if the LLM's answer is supported by the provided context cards.
        Detects potential hallucinations.
        """
        if not context_cards:
            return {
                "verified": False,
                "unsupported_claims": ["No context provided for verification."],
                "confidence": 0.0,
                "verification_notes": "Verification skipped due to lack of context."
            }

        # 1. Format context for verification
        context_text = ""
        for i, card in enumerate(context_cards):
            content = (card.get('extracted_text') or "")[:1000]
            context_text += f"Card {i+1} (Title: {card['title']}):\n{content}\n---\n"

        # 2. Call LLM to verify
        prompt = (
            f"Context Documents:\n{context_text}\n\n"
            f"Original Question: {query}\n"
            f"Generated Answer: {answer}\n\n"
            "You are a strict fact-checker. Verify if every major claim in the generated answer is directly supported by the context documents.\n"
            "Respond with a JSON object containing:\n"
            "1. 'verified': boolean (true if all major claims are supported)\n"
            "2. 'unsupported_claims': list of strings (claims not found in the documents)\n"
            "3. 'confidence': float (0.0 to 1.0, where 1.0 is perfectly supported)\n"
            "4. 'explanation': string (brief reasoning for your assessment)\n\n"
            "Output ONLY valid JSON."
        )

        try:
            logger.info("[AnswerVerifier] Verifying answer against context...")
            completion = await llm_service.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a professional fact-checker."},
                    {"role": "user", "content": prompt}
                ],
                model=llm_service.model,
                temperature=0.1,
                max_tokens=400,
                response_format={"type": "json_object"}
            )
            
            raw_res = completion.choices[0].message.content.strip()
            verification = json.loads(raw_res)
            
            logger.info(f"[AnswerVerifier] Verification complete. Confidence: {verification.get('confidence', 0)}")
            
            return {
                "verified": verification.get("verified", False),
                "unsupported_claims": verification.get("unsupported_claims", []),
                "confidence": float(verification.get("confidence", 0.0)),
                "verification_notes": verification.get("explanation", "")
            }

        except Exception as e:
            logger.error(f"[AnswerVerifier] Error during verification: {e}")
            return {
                "verified": False,
                "unsupported_claims": [f"Verification error: {str(e)}"],
                "confidence": 0.5,
                "verification_notes": "An error occurred during the verification process."
            }
