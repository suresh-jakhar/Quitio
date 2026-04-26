import os
import logging
import time
import hashlib
import json
from typing import List, Optional
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        # Primary: Groq (Optimal Speed/Inference)
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = "llama-3.1-8b-instant"
        
        # Fallback: Hugging Face
        self.hf_token = os.environ.get("hf_auth")
        self.hf_model = "meta-llama/Llama-3.1-8B-Instruct"
        
        self.cache = {} # Simple in-memory cache for the session
        self.cool_off_until = 0 # Timestamp for 429 backoff
        
        if not self.api_key:
            logger.warning("LLM_API_KEY (Groq) not found in environment.")
            self.client = None
        else:
            try:
                self.client = AsyncGroq(api_key=self.api_key)
                logger.info(f"LLM initialized with AsyncGroq model: {self.model}")
            except Exception as e:
                logger.error(f"Failed to initialize AsyncGroq client: {e}")
                self.client = None

    async def _call_hf(self, prompt: str, system_prompt: str, is_json: bool = False) -> Optional[str]:
        # ... (rest of method unchanged)
        pass

    def _generate_cache_key(self, card_ids: List[str]) -> str:
        """Create a stable hash of the cluster content."""
        content_str = ",".join(sorted(card_ids))
        return hashlib.sha256(content_str.encode()).hexdigest()

    def _is_cooling_off(self) -> bool:
        if time.time() < self.cool_off_until:
            return True
        return False

    async def generate_cluster_name(self, card_ids: List[str], card_data: List[dict]) -> Optional[str]:
        """Generate a human-readable name for a cluster of cards with caching and backoff."""
        if not self.client or self._is_cooling_off():
            return None

        # 1. Check Cache
        cache_key = self._generate_cache_key(card_ids)
        if cache_key in self.cache:
            logger.info(f"[DEBUG-LLM] Cache HIT for cluster naming: {self.cache[cache_key]}")
            return self.cache[cache_key]

        # 2. Build minimal context
        titles = [c.get("title", "Untitled") for c in card_data[:10]]
        snippet = "\n".join([f"- {t}" for t in titles])
        
        prompt = f"Analyze these document titles and provide a 2-3 word thematic category name.\n\nTitles:\n{snippet}\n\nOutput ONLY the name (no quotes, no intro)."

        try:
            logger.debug(f"[DEEP-LLM] [Naming] Prompt:\n{prompt}")
            start_time = time.time()
            completion = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a concise taxonomy engine."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.3,
                max_tokens=20
            )
            
            duration = time.time() - start_time
            raw_res = completion.choices[0].message.content.strip()
            logger.debug(f"[DEEP-LLM] [Naming] Raw Response: {raw_res}")
            
            clean_name = raw_res.replace('"', '')
            logger.info(f"[DEBUG-LLM] Cluster Naming (Groq) completed in {duration:.4f}s: {clean_name}")
            
            self.cache[cache_key] = clean_name
            return clean_name

        except Exception as e:
            if "403" in str(e) or "blocked" in str(e).lower():
                logger.warning("[DEBUG-LLM] Groq blocked. Trying Hugging Face fallback...")
                hf_start = time.time()
                hf_res = await self._call_hf(prompt, "You are a concise taxonomy engine.")
                if hf_res:
                    hf_duration = time.time() - hf_start
                    clean_name = hf_res.strip().replace('"', '')
                    logger.info(f"[DEBUG-LLM] Cluster Naming (HF Fallback) completed in {hf_duration:.4f}s: {clean_name}")
                    self.cache[cache_key] = clean_name
                    return clean_name
            
            if "429" in str(e) or "rate_limit" in str(e).lower():
                logger.error("Groq Rate Limit (429). Cooling off for 60s.")
                self.cool_off_until = time.time() + 60
            else:
                logger.error(f"LLM Cluster Naming Error: {e}")
            return None

    async def extract_semantic_metadata(self, title: str, text: str) -> Optional[dict]:
        """
        Analyze document to extract concepts (Intent, Domain, Entities).
        Optimal for thematic clustering (Issue: Case 1, 2, 3).
        """
        if not self.client or self._is_cooling_off():
            return None
        
        snippet = (text or "")[:500]
        prompt = (
            "Perform a deep semantic analysis of the document to extract metadata for conceptual clustering.\n"
            f"Title: {title}\n"
            f"Content: {snippet}\n\n"
            "Identify:\n"
            "1. Structural Purpose: What is the functional role of this document? (e.g., the high-level intent/class).\n"
            "2. Semantic Domain: The primary subject matter or field of knowledge.\n"
            "3. Key Concepts: The most important entities or thematic topics.\n\n"
            "Output ONLY JSON: {\"intent\": \"str\", \"domain\": \"str\", \"entities\": [\"str\"]}"
        )

        try:
            logger.debug(f"[DEEP-LLM] [Extraction] Prompt: {title}")
            start_time = time.time()
            completion = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a semantic analysis engine."},
                    {"role": "user", "content": prompt},
                ],
                model=self.model,
                temperature=0.1,
                max_tokens=150,
                response_format={"type": "json_object"}
            )
            
            duration = time.time() - start_time
            raw_content = completion.choices[0].message.content.strip()
            logger.debug(f"[DEEP-LLM] [Extraction] Raw Response: {raw_content}")
            
            logger.info(f"[DEBUG-LLM] Semantic Extraction (Groq) completed in {duration:.4f}s")
            
            metadata = json.loads(raw_content)
            return metadata

        except Exception as e:
            if "403" in str(e) or "blocked" in str(e).lower():
                logger.warning("[DEBUG-LLM] Groq blocked. Trying Hugging Face fallback...")
                hf_start = time.time()
                hf_res = await self._call_hf(prompt, "You are a semantic analysis engine. Output ONLY JSON.")
                if hf_res:
                    hf_duration = time.time() - hf_start
                    logger.info(f"[DEBUG-LLM] Semantic Extraction (HF Fallback) completed in {hf_duration:.4f}s")
                    try:
                        # Extract JSON if wrapped in markdown
                        json_str = hf_res.strip()
                        if "```json" in json_str:
                            json_str = json_str.split("```json")[1].split("```")[0].strip()
                        elif "```" in json_str:
                            json_str = json_str.split("```")[1].split("```")[0].strip()
                        return json.loads(json_str)
                    except:
                        pass

            if "429" in str(e) or "rate_limit" in str(e).lower():
                logger.error("Groq Extraction Rate Limit (429). Cooling off for 60s.")
                self.cool_off_until = time.time() + 60
            else:
                logger.error(f"Semantic Extraction Error: {e}")
            return None

    async def summarize_cluster(self, titles: List[str], keywords: List[str]) -> Optional[str]:
        # Legacy method for backward compatibility
        return await self.generate_cluster_name([], [{"title": t, "text": ""} for t in titles])

# Singleton instance
llm_service = LLMService()
