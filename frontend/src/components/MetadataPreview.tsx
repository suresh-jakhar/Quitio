interface MetadataPreviewProps {
  metadata?: {
    og_title?: string;
    og_description?: string;
    og_image?: string;
    platform?: string;
  };
  isLoading?: boolean;
}

export default function MetadataPreview({
  metadata,
  isLoading = false,
}: MetadataPreviewProps): JSX.Element | null {
  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--space-lg)',
          backgroundColor: 'var(--color-light)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
        }}
      >
        Loading preview...
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-white)',
      }}
    >
      {metadata.og_image && (
        <img
          src={metadata.og_image}
          alt="Preview"
          style={{
            width: '100%',
            height: '200px',
            objectFit: 'cover',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div style={{ padding: 'var(--space-lg)' }}>
        {metadata.platform && (
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-sm)',
              textTransform: 'uppercase',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            {metadata.platform}
          </div>
        )}
        {metadata.og_title && (
          <h3
            style={{
              margin: '0 0 var(--space-sm) 0',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
            }}
          >
            {metadata.og_title}
          </h3>
        )}
        {metadata.og_description && (
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5',
            }}
          >
            {metadata.og_description}
          </p>
        )}
      </div>
    </div>
  );
}
