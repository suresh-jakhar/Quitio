# QUITIO ML Service

Python FastAPI microservice for embeddings, vector search, and RAG.

## Setup

1. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your configuration:
   - `DATABASE_URL`: PostgreSQL connection string

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the server:
   ```bash
   python main.py
   ```

The server will start on `http://localhost:8000`

## Project Structure

```
├── main.py         - FastAPI app entry point
├── config.py       - Configuration & environment variables
├── extractors/     - Content extraction modules (will add later)
├── embeddings/     - Embedding generation & storage (will add later)
├── search/         - Search algorithms (will add later)
├── graph/          - Knowledge graph (will add later)
├── rag/            - RAG query engine (will add later)
└── utils/          - Helper utilities (will add later)
```

## API Routes

- `GET /health` - Health check endpoint

More endpoints added in later phases.
