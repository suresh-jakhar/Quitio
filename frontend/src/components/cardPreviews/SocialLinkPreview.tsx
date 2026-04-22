interface SocialLinkPreviewProps {
  metadata: {
    og_image?: string;
    og_title?: string;
    og_description?: string;
    url?: string;
    source?: string;
  };
}

export default function SocialLinkPreview({
  metadata,
}: SocialLinkPreviewProps): JSX.Element {
  const {
    og_image,
    og_title = 'Untitled',
    og_description = '',
    url = '#',
    platform,
    source,
    created_at
  } = metadata as any;

  const openLink = () => {
    if (url && url !== '#') {
      window.open(url, '_blank');
    }
  };

  const displaySource = platform || source || 'Link';

  return (
    <div 
      className="social-preview" 
      onClick={openLink}
      style={{ cursor: url !== '#' ? 'pointer' : 'default' }}
    >
      {og_image ? (
        <img src={og_image} alt={og_title} className="social-thumbnail" />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--color-light-gray)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2em',
        }}>
          🔗
        </div>
      )}
      <div className="social-info">
        <div className="social-source" style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
          {displaySource}
        </div>
        <div className="social-title">{og_title}</div>
        {og_description && (
          <div className="social-description" style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {og_description}
          </div>
        )}
        {created_at && (
           <div className="social-timestamp" style={{ fontSize: 'var(--font-size-xs)', opacity: 0.6, marginTop: '4px' }}>
              {new Date(created_at).toLocaleDateString()}
           </div>
        )}
      </div>
    </div>
  );
}
