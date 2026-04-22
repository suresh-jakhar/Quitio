class MLServiceError(Exception):
    """Base class for exceptions in this module."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ModelLoadError(MLServiceError):
    """Raised when a model fails to load."""
    def __init__(self, model_name: str):
        super().__init__(f"Failed to load model: {model_name}", 500)

class DatabaseError(MLServiceError):
    """Raised when a database operation fails."""
    def __init__(self, detail: str):
        super().__init__(f"Database error: {detail}", 500)
