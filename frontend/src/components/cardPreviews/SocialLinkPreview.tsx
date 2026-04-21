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
    source = 'Link',
  } = metadata;

  const openLink = () => {
    if (url && url !== '#') {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="social-preview">
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
        <div className="social-source">{source}</div>
        <div className="social-title">{og_title}</div>
        {og_description && (
          <div className="social-description">{og_description}</div>
        )}
      </div>
    </div>
  );
}
