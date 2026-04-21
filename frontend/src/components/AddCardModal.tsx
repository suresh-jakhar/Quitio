import { useState } from 'react';
import Modal from './Modal';
import CardTypeSelector from './CardTypeSelector';
import SocialLinkForm from './SocialLinkForm';
import PdfUploadForm from './PdfUploadForm';
import DocxUploadForm from './DocxUploadForm';
import api from '../utils/api';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdded?: () => void;
}

export default function AddCardModal({
  isOpen,
  onClose,
  onCardAdded,
}: AddCardModalProps): JSX.Element {
  const [contentType, setContentType] = useState('social_link');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSocialLinkSubmit = async (data: {
    url: string;
    tags: string[];
  }) => {
    setIsLoading(true);
    setError('');

    try {
      await api.post('/cards/ingest/social-link', {
        url: data.url,
        tags: data.tags,
      });

      onCardAdded?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfSubmit = async (data: { file: File; tags: string[] }) => {
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('tags', JSON.stringify(data.tags));

      await api.post('/cards/ingest/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onCardAdded?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocxSubmit = async (data: { file: File; tags: string[] }) => {
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('tags', JSON.stringify(data.tags));

      await api.post('/cards/ingest/docx', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onCardAdded?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  const formComponents: Record<string, JSX.Element> = {
    social_link: (
      <SocialLinkForm
        onSubmit={handleSocialLinkSubmit}
        isLoading={isLoading}
      />
    ),
    pdf: <PdfUploadForm onSubmit={handlePdfSubmit} isLoading={isLoading} />,
    docx: <DocxUploadForm onSubmit={handleDocxSubmit} isLoading={isLoading} />,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Card">
      {error && (
        <div
          style={{
            marginBottom: 'var(--space-lg)',
            padding: 'var(--space-md)',
            backgroundColor: '#fee2e2',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {error}
        </div>
      )}

      <CardTypeSelector value={contentType} onChange={setContentType} />
      <div style={{ marginTop: 'var(--space-lg)' }}>
        {formComponents[contentType]}
      </div>
    </Modal>
  );
}
