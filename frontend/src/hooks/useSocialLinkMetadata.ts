import { useState } from 'react';
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

  const fetchMetadata = async (url: string) => {
    if (!url) {
      setMetadata(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/cards/ingest/social-link/preview', { url });
      setMetadata({
        og_title: response.data.og_title,
        og_description: response.data.og_description,
        og_image: response.data.og_image,
        platform: response.data.platform,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch preview');
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  return { metadata, loading, error, fetchMetadata };
};

export default useSocialLinkMetadata;
