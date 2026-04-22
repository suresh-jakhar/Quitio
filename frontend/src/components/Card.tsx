import React, { JSX } from 'react';
import Tag from './Tag';
import SourceLink from './SourceLink';
import SocialLinkPreview from './cardPreviews/SocialLinkPreview';
import PdfPreview from './cardPreviews/PdfPreview';
import DocxPreview from './cardPreviews/DocxPreview';
import { LinkIcon, DocumentIcon, FileIcon } from './icons';

interface CardTag {
  id: string;
  name: string;
}

interface CardData {
  id: string;
  title: string;
  content_type: 'social_link' | 'pdf' | 'docx' | string;
  metadata: Record<string, any>;
  tags?: CardTag[];
  created_at?: string;
  extracted_text?: string;
  raw_content?: string;
}

interface CardProps {
  cardData: CardData;
  onClick?: (cardId: string) => void;
  onTagClick?: (tagId: string) => void;
  isDetail?: boolean;
  isListView?: boolean;
}

const getContentTypeIcon = (contentType: string): JSX.Element => {
  const iconMap: Record<string, JSX.Element> = {
    social_link: <LinkIcon />,
    pdf: <FileIcon />,
    docx: <DocumentIcon />,
    doc: <DocumentIcon />,
  };
  return iconMap[contentType] || <DocumentIcon />;
};

const getContentTypeLabel = (contentType: string): string => {
  const labelMap: Record<string, string> = {
    social_link: 'Social Link',
    pdf: 'PDF',
    docx: 'Word Doc',
    doc: 'Word Doc',
  };
  return labelMap[contentType] || contentType;
};

const PreviewRenderer: React.FC<{
  contentType: string;
  metadata: Record<string, any>;
  extractedText?: string;
}> = ({ contentType, metadata, extractedText }) => {
  switch (contentType) {
    case 'social_link':
      return <SocialLinkPreview metadata={metadata} />;
    case 'pdf':
      return <PdfPreview metadata={metadata} extractedText={extractedText} />;
    case 'docx':
    case 'doc':
      return <DocxPreview metadata={metadata} extractedText={extractedText} />;
    default:
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2em',
          backgroundColor: 'var(--color-light-gray)',
          color: 'var(--color-text-secondary)',
        }}>
          {getContentTypeIcon(contentType)}
        </div>
      );
  }
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function Card({
  cardData,
  onClick,
  onTagClick,
  isDetail = false,
  isListView = false,
}: CardProps): JSX.Element {
  if (isDetail) {
    // Detail View
    return (
      <div className="card-component card-detail-view">
        <div className="card-detail-header">
          <div className="card-type-badge">
            {getContentTypeIcon(cardData.content_type)} {getContentTypeLabel(cardData.content_type)}
          </div>
          <div className="card-detail-title">{cardData.title}</div>
        </div>

        <div className="card-detail-meta">
          <div className="card-detail-meta-item">
            <div className="card-detail-meta-label">Type</div>
            <div className="card-detail-meta-value">{getContentTypeLabel(cardData.content_type)}</div>
          </div>
          <div className="card-detail-meta-item">
            <div className="card-detail-meta-label">Created</div>
            <div className="card-detail-meta-value">{formatDate(cardData.created_at)}</div>
          </div>
          {cardData.updated_at && cardData.created_at !== cardData.updated_at && (
            <div className="card-detail-meta-item">
              <div className="card-detail-meta-label">Updated</div>
              <div className="card-detail-meta-value">{formatDate(cardData.updated_at)}</div>
            </div>
          )}
          {Object.entries(cardData.metadata || {}).length > 0 && (
            <div className="card-detail-meta-item">
              <div className="card-detail-meta-label">Metadata</div>
              <div className="card-detail-meta-value">
                {Object.keys(cardData.metadata).length} fields
              </div>
            </div>
          )}
        </div>

        {/* Source Link - Phase 8 */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <SourceLink cardData={cardData} />
        </div>

        {(cardData.metadata?.og_image || cardData.content_type === 'pdf' || cardData.content_type === 'docx' || cardData.content_type === 'doc') && (
          <div className="card-detail-preview">
            <PreviewRenderer
              contentType={cardData.content_type}
              metadata={cardData.metadata}
              extractedText={cardData.extracted_text}
            />
          </div>
        )}

        {cardData.extracted_text && (
          <div className="card-detail-content">
            <div className="card-detail-content-label">Content</div>
            <div className="card-detail-text">{cardData.extracted_text}</div>
          </div>
        )}

        {(cardData.tags && cardData.tags.length > 0) && (
          <div className="card-detail-tags">
            {cardData.tags.map((tag) => (
              <Tag
                key={tag.id}
                label={tag.name}
                onClick={() => onTagClick?.(tag.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isListView) {
    // List View
    return (
      <div
        className="card-component card-list-view"
        onClick={() => onClick?.(cardData.id)}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <div className="card-list-thumbnail">
          <PreviewRenderer
            contentType={cardData.content_type}
            metadata={cardData.metadata}
            extractedText={cardData.extracted_text}
          />
        </div>

        <div className="card-list-content">
          <div className="card-list-title">{cardData.title}</div>
          <div className="card-list-meta">
            <span>{getContentTypeLabel(cardData.content_type)}</span>
            {cardData.created_at && <span>{formatDate(cardData.created_at)}</span>}
            {cardData.tags && <span>{cardData.tags.length} tags</span>}
          </div>
          {cardData.extracted_text && (
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {cardData.extracted_text}
            </div>
          )}
        </div>

        {cardData.tags && cardData.tags.length > 0 && (
          <div className="card-tags">
            {cardData.tags.map((tag) => (
              <Tag
                key={tag.id}
                label={tag.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid View (default)
  return (
    <div
      className="card-component card-grid-view"
      onClick={() => onClick?.(cardData.id)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="card-preview-container">
        <PreviewRenderer contentType={cardData.content_type} metadata={cardData.metadata} extractedText={cardData.extracted_text} />
      </div>

      <div className="card-content">
        <div className="card-type-badge">
          {getContentTypeIcon(cardData.content_type)} {getContentTypeLabel(cardData.content_type)}
        </div>
        <div className="card-title">{cardData.title}</div>
        <div className="card-meta">{formatDate(cardData.created_at)}</div>

        {cardData.extracted_text && (
          <div className="card-description">{cardData.extracted_text}</div>
        )}

        {cardData.tags && cardData.tags.length > 0 && (
          <div className="card-tags">
            {cardData.tags.map((tag) => (
              <Tag
                key={tag.id}
                label={tag.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
