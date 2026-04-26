-- 003_pgvector_and_graph.sql
-- Sets up the vector extension, embedding columns, and graph edges table properly.

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add vector and semantic columns to cards
ALTER TABLE cards ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS concept_embedding vector(384);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS semantic_metadata JSONB;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS centrality FLOAT DEFAULT 0.0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS cluster_label VARCHAR(255);

-- 3. Recreate Graph Edges table to ensure consistent schema (user_id, weight, edge_type)
-- We drop first because existing structure from 001 might lack these columns.
DROP TABLE IF EXISTS graph_edges CASCADE;

CREATE TABLE graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    target_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    weight FLOAT DEFAULT 0.5,
    edge_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_card_id, target_card_id)
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_cards_embedding ON cards USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_cards_concept_embedding ON cards USING hnsw (concept_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_graph_edges_user_id ON graph_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_card_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_card_id);

-- 5. Full Text Search Index (BM25)
DROP INDEX IF EXISTS idx_cards_fts;
CREATE INDEX idx_cards_fts ON cards 
USING gin (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(extracted_text, ''))
);
