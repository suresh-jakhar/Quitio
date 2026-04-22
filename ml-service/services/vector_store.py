class VectorStore:
    def __init__(self, db_service):
        self.db_service = db_service

    def store_embedding(self, card_id: str, embedding: list[float]):
        # Stub for Phase 21
        pass

    def find_similar_cards(self, embedding: list[float], limit: int = 10):
        # Stub for Phase 21
        return []
