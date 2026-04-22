import { useState, useCallback } from 'react';
import { Tag } from './useTags';

export type FilterMode = 'AND' | 'OR';

export interface CardFilterState {
  selectedTags: Tag[];
  filterMode: FilterMode;
  toggleTag: (tag: Tag) => void;
  removeTag: (tagId: string) => void;
  setFilterMode: (mode: FilterMode) => void;
  clearAll: () => void;
  isTagSelected: (tagId: string) => boolean;
}

/**
 * Manages multi-tag filter state and AND/OR mode for Phase 16.
 */
export default function useCardFilter(): CardFilterState {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('OR');

  const toggleTag = useCallback((tag: Tag) => {
    setSelectedTags((prev) => {
      const exists = prev.find((t) => t.id === tag.id);
      if (exists) {
        return prev.filter((t) => t.id !== tag.id);
      }
      return [...prev, tag];
    });
  }, []);

  const removeTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const isTagSelected = useCallback(
    (tagId: string) => selectedTags.some((t) => t.id === tagId),
    [selectedTags]
  );

  return {
    selectedTags,
    filterMode,
    toggleTag,
    removeTag,
    setFilterMode,
    clearAll,
    isTagSelected,
  };
}
