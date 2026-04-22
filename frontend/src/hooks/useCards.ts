import { useState, useEffect } from 'react';
import api from '../utils/api';

interface CardTag {
  id: string;
  name: string;
}

export interface CardData {
  id: string;
  user_id: string;
  title: string;
  content_type: 'social_link' | 'pdf' | 'docx' | string;
  metadata: Record<string, any>;
  raw_content?: string;
  extracted_text?: string;
  tags?: CardTag[];
  created_at: string;
  updated_at: string;
}

interface UseCardsResult {
  cards: CardData[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  loadMore: () => void;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
}

const useCards = (initialLimit = 20, tagId?: string | null): UseCardsResult => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(initialLimit);

  const fetchCards = async (currentPage: number, currentTagId?: string | null) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/cards', {
        params: {
          page: currentPage,
          limit,
          tag_id: currentTagId || undefined,
        },
      });

      const { cards: newCards, pagination } = response.data;

      if (currentPage === 1) {
        setCards(newCards);
      } else {
        setCards((prev) => [...prev, ...newCards]);
      }

      setTotal(pagination.total);
      setPageState(currentPage);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch cards';
      setError(errorMessage);
      console.error('Failed to fetch cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards(1, tagId);
  }, [tagId]);

  const loadMore = () => {
    fetchCards(page + 1, tagId);
  };

  const refetch = async () => {
    await fetchCards(1, tagId);
  };

  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    cards,
    loading,
    error,
    page,
    totalPages,
    total,
    hasMore,
    loadMore,
    setPage: (newPage) => fetchCards(newPage),
    refetch,
  };
};

export default useCards;
