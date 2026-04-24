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

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<SmartArrangeData>('/arrange/smart');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load smart arrangement');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetch };
};
