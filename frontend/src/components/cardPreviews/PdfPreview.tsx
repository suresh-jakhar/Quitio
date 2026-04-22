interface PdfPreviewProps {
  metadata: {
    original_name?: string;
    file_name?: string; // legacy fallback
    page_count?: number;
    file_size?: number;
    author?: string;
  };
  extractedText?: string;
}

export default function PdfPreview({ metadata, extractedText }: PdfPreviewProps): JSX.Element {
  const {
    original_name,
    file_name,
    page_count,
    file_size,
    author,
  } = metadata;

  const displayName = (original_name || file_name || 'document.pdf').replace(/\.pdf$/i, '');

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const snippet = extractedText?.slice(0, 200)?.trim();

  return (
    <div className="pdf-preview">
      <div className="pdf-icon">📄</div>
      <div className="pdf-name">{displayName}</div>
      <div className="pdf-pages">
        {page_count !== undefined ? `${page_count} page${page_count !== 1 ? 's' : ''}` : ''}
      </div>
      {author && author !== 'Unknown' && (
        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85, marginTop: 'var(--space-xs)' }}>
          {author}
        </div>
      )}
      {file_size && (
        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85, marginTop: 'var(--space-xs)' }}>
          {formatFileSize(file_size)}
        </div>
      )}
      {snippet && (
        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.75, marginTop: 'var(--space-sm)', lineHeight: 1.4, textAlign: 'left' }}>
          {snippet}…
        </div>
      )}
    </div>
  );
}
