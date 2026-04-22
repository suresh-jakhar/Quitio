import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
