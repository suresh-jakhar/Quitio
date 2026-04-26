import React from 'react';
import CitationLink from './CitationLink';

interface Citation {
  id: string;
  title: string;
  content_type: string;
  similarity: number;
}

interface CitationListProps {
  citations: Citation[];
}

const CitationList: React.FC<CitationListProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
        Sources & References
      </h4>
      <div className="flex flex-wrap">
        {citations.map((cite) => (
          <CitationLink 
            key={cite.id} 
            id={cite.id} 
            title={cite.title} 
            type={cite.content_type} 
          />
        ))}
      </div>
    </div>
  );
};

export default CitationList;
