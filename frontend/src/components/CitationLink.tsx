import React from 'react';

interface CitationLinkProps {
  id: string;
  title: string;
  type: string;
}

const CitationLink: React.FC<CitationLinkProps> = ({ id, title, type }) => {
  const handleClick = () => {
    // In a real app, this would open a modal or navigate to the card
    // For now, we'll just log it
    console.log(`Opening card: ${id} (${title})`);
    // Example: window.location.href = `/cards/${id}`;
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors mr-1 mb-1"
      title={`Open ${type} card: ${title}`}
    >
      <span className="truncate max-w-[150px]">{title}</span>
    </button>
  );
};

export default CitationLink;
