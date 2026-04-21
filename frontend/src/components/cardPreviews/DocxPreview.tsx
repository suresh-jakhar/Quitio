interface DocxPreviewProps {
  metadata: {
    file_name?: string;
    word_count?: number;
    file_size?: number;
  };
}

export default function DocxPreview({ metadata }: DocxPreviewProps): JSX.Element {
  const {
    file_name = 'document.docx',
    word_count = '?',
    file_size,
  } = metadata;

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="docx-preview">
      <div className="docx-icon">📝</div>
      <div className="docx-name">{file_name.replace(/\.docx?$/i, '')}</div>
      <div className="docx-meta">
        {word_count} word{Number(word_count) !== 1 ? 's' : ''}
      </div>
      {file_size && (
        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85, marginTop: 'var(--space-xs)' }}>
          {formatFileSize(file_size)}
        </div>
      )}
    </div>
  );
}
