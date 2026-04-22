import logging

logger = logging.getLogger(__name__)

class ModelLoader:
    def __init__(self, model_name: str, device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        self.model = None

    def load_model(self):
        # Stub for Phase 20
        logger.info(f"Loading model: {self.model_name} on {self.device}")
        return None
