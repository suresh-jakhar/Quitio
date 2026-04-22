import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import Button from './Button';
import FileUploadProgress from './FileUploadProgress';
import TagInput from './TagInput';

interface PdfUploadFormProps {
  onSubmit: (data: { file: File; tags: string[] }) => Promise<void>;
  isLoading?: boolean;
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function PdfUploadForm({
  onSubmit,
  isLoading = false,
}: PdfUploadFormProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (f.type !== 'application/pdf') {
      return 'Only PDF files are accepted.';
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    setError('');
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(f);
    setUploadProgress(0);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate incremental progress while request is in flight
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    try {
      await onSubmit({ file, tags });
      clearInterval(progressInterval);
      setUploadProgress(100);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setError(err.message || 'Failed to add card');
    } finally {
      setIsUploading(false);
    }
  };

  const formBusy = isLoading || isUploading;

  return (
    <form onSubmit={handleSubmit} className="add-card-form" id="pdf-upload-form">
      {error && <div className="form-error">{error}</div>}

      {/* Drag & Drop zone */}
      <div
        className={`file-drop-zone${isDragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !formBusy && fileInputRef.current?.click()}
        role="button"
        aria-label="Upload PDF file"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !formBusy && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          disabled={formBusy}
          style={{ display: 'none' }}
          id="pdf-file-input"
        />

        {file ? (
          <div className="file-drop-zone__selected">
            <span className="file-drop-zone__icon">📄</span>
            <span className="file-drop-zone__name">{file.name}</span>
            <span className="file-drop-zone__size">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
            <button
              type="button"
              className="file-drop-zone__remove"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setUploadProgress(0);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={formBusy}
              aria-label="Remove selected file"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="file-drop-zone__placeholder">
            <span className="file-drop-zone__icon">📄</span>
            <p className="file-drop-zone__text">
              <strong>Drag & drop</strong> a PDF here, or <strong>click to browse</strong>
            </p>
            <p className="file-drop-zone__hint">Maximum size: {MAX_FILE_SIZE_MB} MB</p>
          </div>
        )}
      </div>

      {/* Upload progress */}
      {(isUploading || uploadProgress > 0) && (
        <FileUploadProgress progress={uploadProgress} />
      )}

      {/* Tags input */}
      <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
        <label htmlFor="pdf-tags-input">Tags</label>
        <TagInput
          value={tags}
          onChange={setTags}
          contentType="pdf"
          disabled={formBusy}
        />
      </div>

      <div className="form-actions">
        <Button
          label={formBusy ? 'Uploading…' : 'Add PDF Card'}
          variant="primary"
          type="submit"
          disabled={formBusy || !file}
        />
      </div>
    </form>
  );
}
