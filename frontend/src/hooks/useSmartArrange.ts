import { useState, useCallback } from 'react';
import api from '../utils/api';

export interface ArrangedCard {
  id: string;
  title: string;
  content_type: string;
  extracted_text?: string;
  metadata?: Record<string, any>;
  tags: { id: string; name: string }[];
  relevance_score: number;
  appears_in_clusters: string[];
}

export interface ClusterRow {
  cluster_name: string;
  cluster_id: string;
  card_count: number;
  cards: ArrangedCard[];
}

export interface SmartArrangeData {
  user_id: string;
  total_cards: number;
  cluster_count: number;
  clusters: ClusterRow[];
}

export const useSmartArrange = () => {
  const [data, setData] = useState<SmartArrangeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (forceRefresh = false) => {
    const startTime = Date.now();
    try {
      setLoading(true);
      setError(null);
      console.log(`[DEBUG-FRONTEND] [SmartArrange] Request started at ${new Date().toLocaleTimeString()} (Force: ${forceRefresh})`);
      
      const endpoint = forceRefresh ? '/arrange/smart?forceRefresh=true' : '/arrange/smart';
      const res = await api.get<SmartArrangeData>(endpoint);
      
      const duration = Date.now() - startTime;
      console.log(`[DEBUG-FRONTEND] [SmartArrange] Success! Response received in ${duration}ms`);
      console.log(`[DEBUG-FRONTEND] [SmartArrange] Clusters received: ${res.data.clusters.length}`);
      
      setData(res.data);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      console.error(`[DEBUG-FRONTEND] [SmartArrange] FAILED after ${duration}ms:`, err);
      setError(err.response?.data?.message || err.message || 'Failed to load smart arrangement');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCard = useCallback(async (cardId: string) => {
    try {
      await api.delete(`/cards/${cardId}`);
      // Optimistically update local state by removing card from all clusters
      if (data) {
        const updatedClusters = data.clusters.map(cluster => ({
          ...cluster,
          cards: cluster.cards.filter(card => card.id !== cardId),
          card_count: cluster.cards.filter(card => card.id !== cardId).length
        })).filter(cluster => cluster.card_count > 0);
        
        setData({
          ...data,
          total_cards: data.total_cards - 1,
          cluster_count: updatedClusters.length,
          clusters: updatedClusters
        });
      }
      return true;
    } catch (err: any) {
      console.error('Failed to delete card from smart arrange:', err);
      return false;
    }
  }, [data]);

  return { data, loading, error, fetch, deleteCard };
};
