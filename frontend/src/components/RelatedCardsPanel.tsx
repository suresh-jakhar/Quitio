import React from 'react';
import { useRelatedCards } from '../hooks/useRelatedCards';
import Spinner from './Spinner';
import { LinkIcon, FileIcon, DocumentIcon } from './icons';

interface RelatedCardsPanelProps {
  cardId: string;
  onCardClick: (id: string) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'social_link': return <LinkIcon size={14} />;
    case 'pdf': return <FileIcon size={14} />;
    default: return <DocumentIcon size={14} />;
  }
};

const RelatedCardsPanel: React.FC<RelatedCardsPanelProps> = ({ cardId, onCardClick }) => {
  const { relatedCards, loading, error } = useRelatedCards(cardId);

  if (loading) return <div className="mt-6 text-center"><Spinner size="sm" /></div>;
  if (error) return null;
  if (!relatedCards || relatedCards.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
        Related Connections
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {relatedCards.map((card) => (
          <div 
            key={card.id}
            onClick={() => onCardClick(card.id)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group"
          >
            <div className="text-gray-400 group-hover:text-indigo-500 transition-colors">
              {getIcon(card.content_type)}
            </div>
            <div className="flex-1 min-width-0">
              <div className="text-sm font-medium text-gray-700 truncate group-hover:text-indigo-700">
                {card.title}
              </div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">
                {card.content_type.replace('_', ' ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedCardsPanel;
