interface DocxPreviewProps {
  metadata: {
    original_name?: string;
    file_name?: string; // legacy fallback
    word_count?: number;
    file_size?: number;
  };
  extractedText?: string;
}

export default function DocxPreview({ metadata, extractedText }: DocxPreviewProps): JSX.Element {
  const {
    original_name,
    file_name,
    word_count = '?',
    file_size,
  } = metadata;

  const displayName = (original_name || file_name || 'document.docx').replace(/\.docx?$/i, '');

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const snippet = extractedText?.slice(0, 120)?.trim();

  return (
    <div className="docx-preview">
      <div className="docx-icon">📝</div>
      <div className="docx-name">{displayName}</div>
      <div className="docx-meta">
        {word_count} word{Number(word_count) !== 1 ? 's' : ''}
      </div>
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
