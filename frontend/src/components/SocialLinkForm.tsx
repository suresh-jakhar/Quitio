import { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';
import MetadataPreview from './MetadataPreview';
import useSocialLinkMetadata from '../hooks/useSocialLinkMetadata';

interface SocialLinkFormProps {
  onSubmit: (data: { url: string; tags: string[] }) => Promise<void>;
  isLoading?: boolean;
}

export default function SocialLinkForm({
  onSubmit,
  isLoading = false,
}: SocialLinkFormProps): JSX.Element {
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const { metadata, loading: metadataLoading, error: metadataError, fetchMetadata } = useSocialLinkMetadata();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (url) {
        fetchMetadata(url);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [url, fetchMetadata]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    if (!metadata) {
      setError('Please wait for preview to load');
      return;
    }

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await onSubmit({ url, tags: tagList });
    } catch (err: any) {
      setError(err.message || 'Failed to add card');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-card-form">
      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {metadataError && (
        <div className="form-error">
          {metadataError}
        </div>
      )}

      <div className="form-group">
        <label>URL</label>
        <Input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {url && (
        <MetadataPreview
          metadata={metadata || undefined}
          isLoading={metadataLoading}
        />
      )}

      <div className="form-group">
        <label>Tags (comma-separated)</label>
        <Input
          type="text"
          placeholder="tech, article, research"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="form-actions">
        <Button
          label={isLoading ? 'Adding...' : 'Add Card'}
          variant="primary"
          disabled={isLoading || !url.trim() || !metadata || metadataLoading}
        />
      </div>
    </form>
  );
}
