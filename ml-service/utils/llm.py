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
        """
        Fallback to Hugging Face Inference API when Groq is blocked or rate-limited.
        Requires `hf_auth` env var set to a valid HF token.
        """
        if not self.hf_token:
            logger.warning("[LLM-HF] hf_auth token not set — HF fallback unavailable.")
            return None
        import requests as req
        api_url = f"https://api-inference.huggingface.co/models/{self.hf_model}"
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        payload = {
            "inputs": f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]",
            "parameters": {
                "max_new_tokens": 200 if not is_json else 300,
                "temperature": 0.2,
                "return_full_text": False,
            }
        }
        try:
            response = req.post(api_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            if isinstance(result, list) and result:
                return result[0].get("generated_text", "").strip()
            return None
        except Exception as e:
            logger.error(f"[LLM-HF] HuggingFace API call failed: {e}")
            return None

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

    async def generate_answer(self, query: str, context_cards: List[dict]) -> str:
        """Generate answer using RAG context."""
        if not self.client or self._is_cooling_off():
            return "I'm sorry, I cannot process your request right now due to LLM service unavailability."

        # Format context
        context_text = ""
        for i, card in enumerate(context_cards):
            content = (card.get('extracted_text') or "")[:1000]
            context_text += f"Card {i+1} (ID: {card['id']}):\nTitle: {card['title']}\nContent: {content}\n---\n"

        system_prompt = (
            "You are QUITIO, an intelligent knowledge management assistant.\n"
            "Answer the user's question based strictly on the provided context cards.\n"
            "If the information is not present in the context, clearly state that you don't know based on the provided documents.\n"
            "Keep your answers concise, accurate, and professional.\n"
            "Citations: Refer to the cards by their titles if relevant."
        )

        prompt = f"Context Cards:\n{context_text}\n\nUser Question: {query}\n\nAnswer:"

        try:
            logger.info(f"[DEBUG-LLM] [RAG] Generating answer for query: {query[:50]}...")
            start_time = time.time()
            completion = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.3,
                max_tokens=1024
            )
            
            duration = time.time() - start_time
            answer = completion.choices[0].message.content.strip()
            logger.info(f"[DEBUG-LLM] [RAG] Answer generated in {duration:.4f}s")
            
            return answer

        except Exception as e:
            logger.error(f"Error in generate_answer: {e}")
            if "429" in str(e):
                self.cool_off_until = time.time() + 60
            return "An error occurred while generating the answer. Please try again later."

# Singleton instance
llm_service = LLMService()
