import logging
from sentence_transformers import SentenceTransformer
import torch
from utils.errors import ModelLoadError

logger = logging.getLogger(__name__)

class ModelLoader:
    _instance = None
    _model = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ModelLoader, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", device: str = None):
        if not hasattr(self, 'initialized'):
            self.model_name = model_name
            # Auto-detect device if not specified
            if device is None:
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
            else:
                self.device = device
            self.initialized = True

    def load_model(self) -> SentenceTransformer:
        """Load and cache the model in memory."""
        if self._model is None:
            try:
                logger.info(f"Loading sentence-transformer model: {self.model_name} on {self.device}")
                self._model = SentenceTransformer(self.model_name, device=self.device)
                logger.info("Model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load model {self.model_name}: {e}")
                raise ModelLoadError(self.model_name)
        return self._model

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            return self.load_model()
        return self._model
