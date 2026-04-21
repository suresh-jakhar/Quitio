# QUITIO Backend

Node.js + Express backend for the QUITIO knowledge management app.

## Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT signing

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

## Project Structure

```
src/
├── server.js       - Express app entry point
├── config.js       - Configuration & environment variables
├── middleware/     - Express middleware (auth, error handling)
├── utils/          - Helper utilities (database connection, validators)
├── routes/         - API routes
└── services/       - Business logic layer
```

## API Routes

- `GET /health` - Health check endpoint

More endpoints added in later phases.
