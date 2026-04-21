# QUITIO

A next-generation knowledge management app with ML-driven semantic query engine.

## Project Structure

```
quitio/
├── backend/         - Node.js + Express backend
├── ml-service/      - Python FastAPI ML microservice
├── frontend/        - React + Vite frontend
├── docker-compose.yml
├── .gitignore
└── README.md        - This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+ (with pgvector extension)
- Docker & Docker Compose (optional, for containerized database)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd quitio
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   cp ml-service/.env.example ml-service/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Configure `.env` files** with your database connection string and other settings.

4. **Start the backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

5. **Start the ML service** (in a new terminal)
   ```bash
   cd ml-service
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```

6. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The app will be available at `http://localhost:5173`

## Project Phases

This project is built in 35 phases:
- **Phases 0–5:** Foundation & Authentication (2–3 weeks)
- **Phases 6–18:** Card System & Ingestion (2–4 weeks)
- **Phases 19–24:** ML Backend & Search (1–2 weeks)
- **Phases 25–35:** Knowledge Graph & RAG (2–4 weeks)

See `claude-plan/README.md` for the complete plan.

## Current Phase

**Phase 0:** Project Initialization & Infrastructure ✅ COMPLETE

Next: Phase 1 - Backend Authentication System

## Development

### Backend Development
- See `backend/README.md`
- Start with `npm run dev`

### ML Service Development
- See `ml-service/README.md`
- Start with `python main.py`

### Frontend Development
- See `frontend/README.md`
- Start with `npm run dev`

## Git Workflow

### Branch Naming
- Feature: `feature/description`
- Bug fix: `bugfix/description`
- Phase work: `phase/N-description`

### Commit Convention
```
<type>(<scope>): <subject>

<body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Example:
```
feat(auth): Add JWT verification middleware

- Create middleware/auth.js
- Verify token in protected routes
- Attach user to req.user
```

### Pull Request
1. Create branch from `main`
2. Make changes and commit
3. Push to remote
4. Create PR with description
5. Code review & merge

## Database

PostgreSQL connection string format:
```
postgresql://user:password@host:port/database
```

The database schema will be created in later phases.

## Deployment

Deployment instructions will be added in Phase 35 (Polish & Optimization).

## Support

For questions or issues, refer to the relevant README:
- **Architecture:** `claude-plan/ARCHITECTURE.md`
- **Tech Stack:** `claude-plan/TECH_STACK_GUIDE.md`
- **Phase Details:** `claude-plan/PHASES_*.md`

---

**Project Start Date:** 2026-04-21  
**Current Phase:** 0 ✅  
**Status:** Initializing
