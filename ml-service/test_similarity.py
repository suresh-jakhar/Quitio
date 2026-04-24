import logging
from services.db_service import DBService
from services.vector_store import VectorStore
import numpy as np

logging.basicConfig(level=logging.INFO)

db = DBService()
vs = VectorStore(db)

user_id = '78f8a0c1-c308-4afa-837d-fe16344b4bfb'
cards = vs.get_user_cards(user_id)
print(f"Found {len(cards)} cards with embeddings")

if cards:
    test_card = cards[0]
    print(f"Testing neighbors for card {test_card['id']}")
    neighbors = vs.find_similar_cards(test_card['embedding'], user_id, limit=5)
    print(f"Found {len(neighbors)} neighbors")
    for n in neighbors:
        print(f" - {n['id']} (sim: {n['similarity']:.4f})")
else:
    print("No cards found to test")
