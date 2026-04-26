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
 * Uses the unified /embed-and-store endpoint for maximum efficiency.
 */
export const generateAndStoreEmbedding = async (cardId: string, text: string): Promise<void> => {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      console.log(`[ML-Integration] Generating & storing embedding for card ${cardId} (Attempt ${attempt + 1})...`);
      
      await axios.post(`${ML_SERVICE_URL}/embed/embed-and-store`, { 
        card_id: cardId,
        text 
      }, { timeout: 20000 });

      console.log(`[ML-Integration] Unified embedding/storage successful for card ${cardId}`);
      return;
    } catch (err: any) {
      attempt++;
      console.error(`[ML-Integration] Attempt ${attempt} failed: ${err.message}`);
      if (attempt > maxRetries) {
        console.error(`[ML-Integration] All attempts failed for card ${cardId}. ML service might be down.`);
      } else {
        // Linear backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
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
    }, { timeout: 30000 });
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
    }, { timeout: 30000 });
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
    }, { timeout: 10000 });
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
    }, { timeout: 10000 });
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
    console.log(`[DEBUG-ML-PROXY] POST ${ML_SERVICE_URL}/rag/query for user ${userId}`);
    const response = await axios.post(`${ML_SERVICE_URL}/rag/query`, {
      query,
      user_id: userId,
      top_k: topK
    }, { timeout: 60000 });
    return response.data;
  } catch (err: any) {
    console.error(`[ML-Integration] RAG query failed: ${err.message}`);
    throw new Error('AI assistant is currently unavailable. Please try again later.');
  }
};
