import { useState } from 'react';
import Input from './Input';
import Button from './Button';

interface PdfUploadFormProps {
  onSubmit: (data: { file: File; tags: string[] }) => Promise<void>;
  isLoading?: boolean;
}

export default function PdfUploadForm({
  onSubmit,
  isLoading = false,
}: PdfUploadFormProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await onSubmit({ file, tags: tagList });
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

      <div className="form-group">
        <label>PDF File</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label>Tags (comma-separated)</label>
        <Input
          type="text"
          placeholder="tech, article, research"
          value={tags}
          onChange={setTags}
          disabled={isLoading}
        />
      </div>

      <div className="form-actions">
        <Button
          label={isLoading ? 'Adding...' : 'Add Card'}
          variant="primary"
          type="submit"
          disabled={isLoading || !file}
        />
      </div>
    </form>
  );
}
