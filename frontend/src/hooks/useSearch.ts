import { useState, useCallback, useRef } from 'react';
import api from '../utils/api';
import { CardData } from './useCards';
import { FilterMode } from './useCardFilter';

interface UseSearchResult {
  query: string;
  results: CardData[];
  loading: boolean;
  error: string | null;
  isSearchActive: boolean;
  handleQueryChange: (q: string) => void;
  clearSearch: () => void;
}

const DEBOUNCE_DELAY = 300; // ms

/**
 * Debounced keyword search hook (Phase 17).
 * - Calls GET /search?q=... with optional tag filter integration
 * - 300 ms debounce so we don't fire on every keystroke
 * - isSearchActive = true while query is non-empty
 */
export default function useSearch(
  tagIds?: string[] | null,
  filterMode?: FilterMode
): UseSearchResult {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = {
          q: q.trim(),
        };

        // Pass active tag filter so search is scoped within selected tags
        if (tagIds && tagIds.length > 0) {
          params.tags = tagIds.join(',');
          params.mode = filterMode ?? 'OR';
        }

        const response = await api.get('/search', { params });
        setResults(response.data.results ?? []);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    // Re-create only when tag filter changes (ensures stale closure is avoided)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(tagIds), filterMode]
  );

  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q);

      // Clear previous debounce timer
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Debounce the actual API call
      debounceTimer.current = setTimeout(() => {
        runSearch(q);
      }, DEBOUNCE_DELAY);
    },
    [runSearch]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    isSearchActive: query.trim().length > 0,
    handleQueryChange,
    clearSearch,
  };
}
