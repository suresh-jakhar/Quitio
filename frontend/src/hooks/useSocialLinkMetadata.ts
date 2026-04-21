import { useState, useRef, useCallback } from 'react';
import api from '../utils/api';

interface SocialMetadata {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  platform?: string;
}

interface UseSocialLinkMetadataResult {
  metadata: SocialMetadata | null;
  loading: boolean;
  error: string | null;
  fetchMetadata: (url: string) => Promise<void>;
}

const useSocialLinkMetadata = (): UseSocialLinkMetadataResult => {
  const [metadata, setMetadata] = useState<SocialMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchMetadata = useCallback(async (url: string) => {
    if (!url) {
      setMetadata(null);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/cards/ingest/social-link/preview', { url });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setMetadata({
        og_title: response.data.og_title,
        og_description: response.data.og_description,
        og_image: response.data.og_image,
        platform: response.data.platform,
      });
    } catch (err: any) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(err.response?.data?.message || 'Failed to fetch preview');
      setMetadata(null);
    } finally {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoading(false);
    }
  }, []);

  return { metadata, loading, error, fetchMetadata };
};

export default useSocialLinkMetadata;
