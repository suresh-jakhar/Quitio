import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RelatedCard {
  id: string;
  title: string;
  content_type: string;
  score: number;
}

export const useRelatedCards = (cardId: string) => {
  const [relatedCards, setRelatedCards] = useState<RelatedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;

    const fetchRelatedCards = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/graph/neighbors/${cardId}`, {
          params: { depth: 2, limit: 6 },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Transform neighbor edges into flat card list
        // Assuming backend returns { source_card_id, neighbors: [...] }
        setRelatedCards(response.data.neighbors || []);
      } catch (err: any) {
        console.error('Error fetching related cards:', err);
        setError('Could not load related cards');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedCards();
  }, [cardId]);

  return { relatedCards, loading, error };
};
