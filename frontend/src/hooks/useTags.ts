import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export interface Tag {
  id: string;
  name: string;
  cardCount?: number;
}

export default function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/tags');
      setTags(response.data.tags || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch tags');
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTag = async (name: string): Promise<Tag> => {
    try {
      const response = await api.post('/tags', { name });
      const newTag = response.data;
      setTags((prev) => {
        // Prevent duplicates in state
        if (prev.find(t => t.id === newTag.id || t.name === newTag.name)) {
          return prev;
        }
        return [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name));
      });
      return newTag;
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Tag already exists. Refresh the list for the UI, 
        // and return a placeholder so the caller can proceed.
        fetchTags(); 
        return { id: 'existing', name }; 
      }
      throw new Error(err.response?.data?.message || err.message || 'Failed to create tag');
    }
  };

  const getAutoSuggestedTags = (contentType: string, url?: string): string[] => {
    const suggestions: Record<string, string[]> = {
      'social_link': ['social'],
      'pdf': ['pdf', 'document'],
      'docx': ['docx', 'document'],
      'doc': ['docx', 'document']
    };
    
    const tags = [...(suggestions[contentType] || [])];
    
    if (contentType === 'social_link' && url) {
      try {
        const hostname = new URL(url).hostname;
        if (hostname.includes('youtube')) tags.push('youtube');
        else if (hostname.includes('twitter') || hostname.includes('x.com')) tags.push('twitter');
        else if (hostname.includes('linkedin')) tags.push('linkedin');
        else if (hostname.includes('instagram')) tags.push('instagram');
      } catch {
        // invalid URL, ignore
      }
    }
    
    return tags;
  };

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    createTag,
    getAutoSuggestedTags,
    refreshTags: fetchTags,
  };
}
