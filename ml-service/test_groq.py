import os
import asyncio
import logging
from dotenv import load_dotenv
load_dotenv()
from utils.llm import llm_service

logging.basicConfig(level=logging.INFO)

async def test_groq():
    print("Testing Groq Migration...")
    # Test naming
    test_cards = [{"title": "Virat Kohli Stats"}, {"title": "RCB vs CSK Highlights"}]
    name = await llm_service.generate_cluster_name(["id1", "id2"], test_cards)
    print(f"Generated Name: {name}")
    
    # Test extraction
    meta = await llm_service.extract_semantic_metadata("Kieron Pollard Power Hitting", "Video showing massive sixes by Pollard in IPL.")
    print(f"Extracted Metadata: {meta}")

if __name__ == "__main__":
    asyncio.run(test_groq())
