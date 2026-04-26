import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RAGResponse {
  query: string;
  answer: string;
  context_count: number;
}

export const useRAGQuery = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryRag = async (query: string, topK: number = 5): Promise<RAGResponse | null> => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to use the AI assistant.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/rag/query`,
        { query, topK },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to get answer from AI assistant.';
      setError(message);
      console.error('[useRAGQuery] Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { queryRag, loading, error };
};
