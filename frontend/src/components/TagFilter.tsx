import React from 'react';
import { Tag } from '../hooks/useTags';

interface TagFilterProps {
  tag: Tag;
  isSelected: boolean;
  onClick: () => void;
}

export default function TagFilter({ tag, isSelected, onClick }: TagFilterProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent',
        color: isSelected ? 'var(--color-primary-dark)' : 'var(--color-text)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.2s',
        fontWeight: isSelected ? 'bold' : 'normal',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-light-gray)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ 
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
        marginRight: '8px'
      }}>
        {tag.name}
      </span>
      {tag.cardCount !== undefined && (
        <span style={{
          backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-light-gray)',
          color: isSelected ? 'white' : 'var(--color-text-secondary)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'bold',
        }}>
          {tag.cardCount}
        </span>
      )}
    </button>
  );
}
