interface PdfPreviewProps {
  metadata: {
    file_name?: string;
    page_count?: number;
    file_size?: number;
  };
}

export default function PdfPreview({ metadata }: PdfPreviewProps): JSX.Element {
  const {
    file_name = 'document.pdf',
    page_count = '?',
    file_size,
  } = metadata;

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="pdf-preview">
      <div className="pdf-icon">📄</div>
      <div className="pdf-name">{file_name.replace(/\.pdf$/i, '')}</div>
      <div className="pdf-pages">
        {page_count} page{Number(page_count) !== 1 ? 's' : ''}
      </div>
      {file_size && (
        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85, marginTop: 'var(--space-xs)' }}>
          {formatFileSize(file_size)}
        </div>
      )}
    </div>
  );
}
