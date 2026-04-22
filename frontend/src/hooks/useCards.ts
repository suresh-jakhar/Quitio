import { useState, useEffect } from 'react';
import api from '../utils/api';
import { FilterMode } from './useCardFilter';

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

/**
 * Fetches cards for the authenticated user.
 * Supports single tag (Phase 15) and multi-tag AND/OR filtering (Phase 16).
 */
const useCards = (
  initialLimit = 20,
  tagIds?: string[] | null,
  filterMode?: FilterMode
): UseCardsResult => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(initialLimit);

  const fetchCards = async (
    currentPage: number,
    currentTagIds?: string[] | null,
    currentMode?: FilterMode
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params: Record<string, any> = {
        page: currentPage,
        limit,
      };

      if (currentTagIds && currentTagIds.length > 0) {
        params.tags = currentTagIds.join(',');
        params.mode = currentMode || 'OR';
      }

      const response = await api.get('/cards', { params });

      const { cards: newCards, pagination } = response.data;

      if (currentPage === 1) {
        setCards(newCards);
      } else {
        setCards((prev) => [...prev, ...newCards]);
      }

      setTotal(pagination.total);
      setPageState(currentPage);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to fetch cards';
      setError(errorMessage);
      console.error('Failed to fetch cards:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever tagIds or filterMode changes; reset to page 1
  useEffect(() => {
    fetchCards(1, tagIds, filterMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tagIds), filterMode]);

  const loadMore = () => {
    fetchCards(page + 1, tagIds, filterMode);
  };

  const refetch = async () => {
    await fetchCards(1, tagIds, filterMode);
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
    setPage: (newPage) => fetchCards(newPage, tagIds, filterMode),
    refetch,
  };
};

export default useCards;
