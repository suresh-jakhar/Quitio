interface SourceLinkProps {
  cardData: {
    content_type: string;
    raw_content?: string;
    metadata: Record<string, any>;
  };
}

export default function SourceLink({ cardData }: SourceLinkProps): JSX.Element | null {
  const getSourceUrl = (): string | null => {
    if (cardData.content_type === 'social_link') {
      return cardData.metadata?.url || cardData.raw_content || null;
    }
    return null;
  };

  const getSourceLabel = (): string => {
    switch (cardData.content_type) {
      case 'social_link':
        return 'View Original';
      default:
        return 'View Source';
    }
  };

  const sourceUrl = getSourceUrl();

  if (!sourceUrl) {
    return null;
  }

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="source-link"
      style={{
        display: 'inline-block',
        padding: '8px 12px',
        backgroundColor: 'var(--color-primary-lighter)',
        color: 'var(--color-primary)',
        textDecoration: 'none',
        borderRadius: 'var(--radius-lg)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        transition: 'all var(--transition-fast)',
      }}
    >
      {getSourceLabel()}
    </a>
  );
}

