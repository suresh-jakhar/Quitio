import { useState, useCallback } from 'react';
import api from '../utils/api';

export interface GraphNeighbor {
  id: string;
  title: string;
  content_type: string;
  score: number;
  distance: number;
  edge_type: string;
  reason: string;
}

export const useGraph = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildGraph = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/graph/build', { user_id: userId });
      console.log('[Graph] Build triggered:', response.data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to trigger graph build');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getNeighbors = useCallback(async (cardId: string, depth: number = 2) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/graph/neighbors/${cardId}`, {
        params: { depth }
      });
      console.log(`[Graph] Neighbors for ${cardId}:`, response.data);
      return response.data.neighbors as GraphNeighbor[];
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch neighbors');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    buildGraph,
    getNeighbors,
    loading,
    error
  };
};
