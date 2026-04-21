# Environment Variables Setup Guide

**IMPORTANT: Security First!**
- NEVER commit `.env` files to version control
- NEVER share `.env` files with others
- NEVER hardcode secrets in source code
- Use `.env.example` as a template

---

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Copy the example file
cp .env.example .env

# Edit .env with your actual values
nano .env
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong random string (use: `openssl rand -base64 32`)
- `NODE_ENV` - Set to "development" or "production"

**Example for local development:**
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/quitio_dev
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRATION=24h
CORS_ORIGIN=http://localhost:5173
API_URL=http://localhost:5000
ML_SERVICE_URL=http://localhost:8000
```

### 2. Frontend Setup

```bash
cd frontend

# Copy the example file
cp .env.example .env.local

# Edit .env.local (optional - defaults to localhost)
nano .env.local
```

**Optional Variables:**
- `VITE_API_URL` - Backend API URL (default: http://localhost:5000)
- `VITE_ML_API_URL` - ML service URL (default: http://localhost:8000)

**Example for local development:**
```env
VITE_API_URL=http://localhost:5000
VITE_ML_API_URL=http://localhost:8000
```

### 3. ML Service Setup

```bash
cd ml-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy the example file
cp .env.example .env

# Edit .env with your actual values
nano .env
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string (same database as backend)
- `PORT` - ML service port (default: 8000)

**Example for local development:**
```env
PORT=8000
ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/quitio_dev
BACKEND_URL=http://localhost:5000
MODEL_NAME=all-MiniLM-L6-v2
MODEL_DEVICE=cpu
```

---

## Environment Variables Reference

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Backend server port |
| `NODE_ENV` | development | Environment: development, production, test |
| `DATABASE_URL` | - | PostgreSQL connection string (REQUIRED) |
| `JWT_SECRET` | - | Secret key for JWT tokens (REQUIRED, min 32 chars) |
| `JWT_EXPIRATION` | 24h | JWT token expiration time |
| `CORS_ORIGIN` | http://localhost:5173 | Frontend URL for CORS |
| `API_URL` | http://localhost:5000 | Backend API URL |
| `ML_SERVICE_URL` | http://localhost:8000 | ML service URL |

### Frontend (.env.local)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | http://localhost:5000 | Backend API URL |
| `VITE_ML_API_URL` | http://localhost:8000 | ML service URL |

### ML Service (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | ML service port |
| `ENV` | development | Environment: development, production |
| `DATABASE_URL` | - | PostgreSQL connection string (REQUIRED) |
| `BACKEND_URL` | http://localhost:5000 | Backend API URL |
| `MODEL_NAME` | all-MiniLM-L6-v2 | Embedding model name |
| `MODEL_DEVICE` | cpu | Device for model: cpu or cuda |
| `API_TIMEOUT` | 30 | Request timeout in seconds |
| `MAX_BATCH_SIZE` | 32 | Maximum batch size for processing |

---

## Database URL Format

### Local PostgreSQL
```
postgresql://username:password@localhost:5432/database_name
```

### With SSL (Neon, AWS RDS, etc.)
```
postgresql://username:password@host:5432/database_name?sslmode=require
```

### Docker PostgreSQL
```
postgresql://postgres:postgres@postgres:5432/quitio_dev
```

---

## Generating Secure Secrets

### JWT Secret (32+ character random string)
```bash
# macOS/Linux
openssl rand -base64 32

# Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Example output:
```
aBcDeF1234567890abcDeF1234567890aBcDeF==
```

---

## Development vs Production

### Development (.env)
```env
NODE_ENV=development
JWT_SECRET=dev-secret-change-in-production
DATABASE_URL=postgresql://postgres:password@localhost:5432/quitio_dev
CORS_ORIGIN=http://localhost:5173
```

### Production (.env.production)
```env
NODE_ENV=production
JWT_SECRET=<STRONG-RANDOM-SECRET-FROM-openssl>
DATABASE_URL=postgresql://user:password@prod-host:5432/quitio
CORS_ORIGIN=https://yourdomain.com
API_URL=https://api.yourdomain.com
ML_SERVICE_URL=https://ml.yourdomain.com
```

**Important:** Create separate `.env.production` and never commit it.

---

## Docker Environment

When running services in Docker, pass env vars to `docker run`:

```bash
docker run -e PORT=5000 \
  -e NODE_ENV=development \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  quitio-backend
```

Or use a `.env` file:
```bash
docker run --env-file .env quitio-backend
```

---

## CI/CD Environment Variables

### GitHub Actions
1. Go to Repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `VITE_API_URL` (for frontend builds)
3. Use in workflow: `${{ secrets.DATABASE_URL }}`

### Example workflow:
```yaml
env:
  NODE_ENV: production
  VITE_API_URL: https://api.yourdomain.com

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build backend
        run: |
          cd backend
          npm install
          npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

---

## Troubleshooting

### "DATABASE_URL is required"
- Ensure `.env` file exists
- Ensure `DATABASE_URL` is set in `.env`
- Check PostgreSQL is running

### "JWT_SECRET warning"
- Generate a secure secret: `openssl rand -base64 32`
- Add to `.env`: `JWT_SECRET=your-secret-here`

### CORS errors
- Check `CORS_ORIGIN` matches your frontend URL
- In development: `http://localhost:5173`
- In production: `https://yourdomain.com`

### ML Service connection errors
- Verify ML service is running on port 8000
- Check `ML_SERVICE_URL` in backend `.env`
- Check `BACKEND_URL` in ML service `.env`

---

## Security Checklist

✅ Never commit `.env` files  
✅ Use strong JWT secrets (32+ chars)  
✅ Different secrets for dev and production  
✅ Use `.env.example` as template  
✅ Update `.env.example` when adding new variables  
✅ Add `.env` to `.gitignore` (already done)  
✅ Review `.gitignore` before pushing  
✅ Rotate secrets regularly  
✅ Never hardcode secrets in code  
✅ Use environment variables for all configs  

---

## Reference Files

- `.env` - Your actual configuration (DO NOT COMMIT)
- `.env.example` - Template with documentation (safe to commit)
- `.env.local` - Frontend local overrides (DO NOT COMMIT)
- `.gitignore` - Configured to exclude all .env files

---

**Last Updated:** 2026-04-21
