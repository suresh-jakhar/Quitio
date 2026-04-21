# QUITIO Database Setup Guide

## Overview

QUITIO uses PostgreSQL (Neon) as the primary database. The schema is designed to be production-ready and scalable for all 35 project phases.

**Key Design Decisions:**
- UUID for all primary keys (global uniqueness)
- JSONB for flexible metadata storage
- Full-text search indexing on cards (GIN index)
- Cascading deletes for data integrity
- Automatic timestamp management with triggers
- Embeddings stored in ML service (not database) for flexibility

---

## Database Schema

### 1. Users Table (Phase 1: Authentication)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

**Purpose:** Store user accounts with authentication credentials

**Indexes:**
- `idx_users_email`: Fast email lookups for signin/signup
- UNIQUE constraint on email: Prevent duplicate emails

---

### 2. Cards Table (Phase 6+: Card System)

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  raw_content TEXT,
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Store all user-created content (social links, PDFs, DOCX, etc.)

**Fields:**
- `content_type`: "social_link", "pdf", "docx" (extensible for new types)
- `raw_content`: Original URL or file path
- `extracted_text`: Clean text extracted from content (for search)
- `metadata`: JSON for flexible per-type storage (og:image, page_count, etc.)

**Indexes:**
- `idx_cards_user_id`: Fast user card retrieval
- `idx_cards_content_type`: Query cards by type
- `idx_cards_text`: Full-text search (GIN index on title + extracted_text)

**Note:** Embeddings are stored in the ML service database (PostgreSQL with pgvector), not here, for separation of concerns.

---

### 3. Tags Table (Phase 14+: Tagging System)

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
```

**Purpose:** Store user-defined tags for organizing cards

**Uniqueness:** Each user can have only one tag with a given name

---

### 4. Card-Tag Junction Table (Phase 14+)

```sql
CREATE TABLE card_tags (
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);
```

**Purpose:** Many-to-many relationship between cards and tags

**Cascading:** Deleting a card removes all its tag associations

---

### 5. Knowledge Graph Edges Table (Phase 25+)

```sql
CREATE TABLE graph_edges (
  source_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  target_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_card_id, target_card_id)
);
```

**Purpose:** Store relationships between cards discovered by the ML service

**Fields:**
- `similarity_score`: 0-1, how similar the cards are
- `reason`: "shared_tags", "semantic_similarity", etc.

**Indexes:**
- Query by source: `idx_graph_edges_source`
- Query by target: `idx_graph_edges_target`

---

### 6. Migrations Table

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track database migrations to prevent running them multiple times

---

## Migrations System

### Concepts

- **Logical Migrations Only:** New migrations only when schema changes are needed
- **SQL Files:** `backend/migrations/*.sql`
- **TypeScript Runner:** `backend/src/utils/database.ts` handles execution
- **Atomic Transactions:** Each migration runs in BEGIN/COMMIT block

### Running Migrations

**Automatically on Server Start:**
```bash
npm run dev
```

**Manually:**
```bash
npm run db:migrate
```

**Check Status:**
```bash
npm run db:stats
```

**Health Check:**
```bash
npm run db:health
```

**Reset (Dev Only):**
```bash
npm run db:reset -- --force
```

---

## Database Connection

### Environment Variable

```env
DATABASE_URL=postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require
```

### Connection Pool

Managed by `backend/src/utils/db.ts`:
- Max connections: 20 (configurable)
- Idle timeout: 30s
- Statement timeout: 30s
- Error logging on idle client errors

---

## SQL Operations by Phase

### Phase 1: Authentication
- Insert user on signup
- Query user by email for signin
- Update user timestamps

### Phase 6+: Cards
- Insert cards
- Query cards by user_id
- Full-text search on extracted_text
- Update card timestamps

### Phase 14+: Tags & Filtering
- Insert tags
- Query tags by user_id
- Join cards and tags for filtering
- Multi-tag AND/OR queries

### Phase 25+: Knowledge Graph
- Insert graph edges
- Query neighbors (incoming/outgoing)
- Multi-hop traversal for related cards

---

## Best Practices

### ✅ DO

- Use parameterized queries (prevent SQL injection)
- Use transactions for multi-step operations
- Index frequently queried columns
- Use JSONB for flexible metadata
- Use CASCADE deletes for referential integrity
- Keep migrations idempotent (IF NOT EXISTS, etc.)

### ❌ DON'T

- Raw string concatenation in SQL
- Assume schema exists (use IF NOT EXISTS)
- Store binary files in database (use object storage)
- Store embeddings in main database (use ML service)

---

## Performance Tuning

### Current Indexes

| Table | Purpose | Index |
|-------|---------|-------|
| users | Lookup by email | idx_users_email (BTREE) |
| cards | Filter by user | idx_cards_user_id (BTREE) |
| cards | Filter by type | idx_cards_content_type (BTREE) |
| cards | Full-text search | idx_cards_text (GIN) |
| tags | Lookup by user | idx_tags_user_id (BTREE) |
| graph_edges | Query neighbors | idx_graph_edges_source/target (BTREE) |

### Future Optimizations

- Connection pooling tuning based on load
- Partitioning cards by user_id if > 100M rows
- Archive old graph_edges periodically
- Materialized views for common aggregations

---

## Backup & Recovery

### Neon Backups

- Automated daily backups (14-day retention)
- Point-in-time recovery available
- See: https://neon.tech/docs/manage/backups

### Manual Backup

```bash
export PGPASSWORD="password"
pg_dump -h HOST -U USER -d DATABASE > backup.sql
```

### Restore

```bash
psql -h HOST -U USER -d DATABASE < backup.sql
```

---

## Troubleshooting

### "Connection refused"

Check:
- DATABASE_URL in .env
- Network connectivity to Neon
- PostgreSQL server is running

### "Relation does not exist"

Check:
- Migrations have run: `npm run db:health`
- Correct table name
- Schema is "public"

### "Unique constraint violation"

Check:
- Email already exists (signup)
- Tag name already exists for user
- Card-tag association already exists

---

## Statistics & Monitoring

### Check Database Size

```bash
npm run db:stats
```

### Query Table Row Counts

```sql
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM cards) as cards,
  (SELECT COUNT(*) FROM tags) as tags,
  (SELECT COUNT(*) FROM card_tags) as card_tags,
  (SELECT COUNT(*) FROM graph_edges) as graph_edges;
```

### Active Migrations

```sql
SELECT * FROM migrations ORDER BY executed_at DESC;
```

---

## Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require&channel_binding=require
```

**Neon Example:**
```
postgresql://neondb_owner:npg_...@ep-....aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

**Last Updated:** 2026-04-21  
**Database System:** PostgreSQL (Neon)  
**Schema Version:** 001_core_schema  
**Status:** ✅ Production Ready
