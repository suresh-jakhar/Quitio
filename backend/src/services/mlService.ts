import axios from 'axios';
import config from '../config';

const ML_SERVICE_URL = config.ML_SERVICE_URL;


export interface VectorSearchResponse {
  query: string;
  results: Array<{
    id: string;
    title: string;
    content_type: string;
    similarity: number;
  }>;
  count: number;
}

/**
 * Generate an embedding for text and store it for a specific card.
 */
export const generateAndStoreEmbedding = async (cardId: string, text: string): Promise<void> => {
  try {
    console.log(`[ML-Integration] Generating embedding for card ${cardId}...`);
    
    // 1. Get embedding from ML service
    const embedRes = await axios.post(`${ML_SERVICE_URL}/embed`, { text });
    const { embedding } = embedRes.data;

    // 2. Store it in pgvector via ML service storage endpoint
    await axios.post(`${ML_SERVICE_URL}/embed/store`, {
      card_id: cardId,
      embedding: embedding
    });

    console.log(`[ML-Integration] Embedding stored successfully for card ${cardId}`);
  } catch (err: any) {
    console.error(`[ML-Integration] Error generating/storing embedding: ${err.message}`);
    // We don't throw here to avoid failing card creation if ML service is down
  }
};

/**
 * Perform semantic similarity search via ML service.
 */
export const vectorSearch = async (
  query: string, 
  userId: string, 
  topK: number = 10,
  tags?: string[]
): Promise<VectorSearchResponse> => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/search/vector`, {
      query,
      user_id: userId,
      top_k: topK,
      tags
    });
    return response.data;
  } catch (err: any) {
    console.error(`[ML-Integration] Vector search failed: ${err.message}`);
    throw new Error('Semantic search service is currently unavailable.');
  }
};
export const hybridSearch = async (
  query: string,
  userId: string,
  topK: number = 10,
  vectorWeight: number = 0.5,
  keywordWeight: number = 0.5
): Promise<VectorSearchResponse> => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/search/hybrid`, {
      query,
      user_id: userId,
      top_k: topK,
      vector_weight: vectorWeight,
      keyword_weight: keywordWeight
    });
    return response.data;
  } catch (err: any) {
    console.error(`[ML-Integration] Hybrid search failed: ${err.message}`);
    throw new Error('Hybrid search service is currently unavailable.');
  }
};

export const triggerGraphBuild = async (userId: string): Promise<void> => {
  try {
    await axios.post(`${ML_SERVICE_URL}/graph/build`, {
      user_id: userId,
      semantic_threshold: 0.7,
      top_k: 20
    });
    console.log(`[ML-Integration] Full graph build triggered for user ${userId}`);
  } catch (err: any) {
    console.error(`[ML-Integration] Failed to trigger graph build: ${err.message}`);
  }
};

/**
 * Trigger an incremental graph update for a single card.
 */
export const triggerIncrementalGraphUpdate = async (cardId: string, userId: string): Promise<void> => {
  try {
    await axios.post(`${ML_SERVICE_URL}/graph/incremental-update`, {
      card_id: cardId,
      user_id: userId
    });
    console.log(`[ML-Integration] Incremental graph update triggered for card ${cardId}`);
  } catch (err: any) {
    console.error(`[ML-Integration] Failed to trigger incremental update: ${err.message}`);
  }
};

/**
 * Delete edges for a card from the knowledge graph.
 */
export const deleteCardEdges = async (cardId: string): Promise<void> => {
  try {
    await axios.delete(`${ML_SERVICE_URL}/graph/card/${cardId}`);
    console.log(`[ML-Integration] Edges deleted for card ${cardId}`);
  } catch (err: any) {
    console.error(`[ML-Integration] Failed to delete card edges: ${err.message}`);
  }
};

/**
 * Perform a RAG (Retrieval-Augmented Generation) query.
 */
export const queryRag = async (
  query: string,
  userId: string,
  topK: number = 5
): Promise<{ query: string; answer: string; context_count: number }> => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/rag/query`, {
      query,
      user_id: userId,
      top_k: topK
    });
    return response.data;
  } catch (err: any) {
    console.error(`[ML-Integration] RAG query failed: ${err.message}`);
    throw new Error('AI assistant is currently unavailable. Please try again later.');
  }
};
