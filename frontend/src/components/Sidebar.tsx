import React from 'react';
import { Tag } from '../hooks/useTags';
import TagFilter from './TagFilter';
import ClearFilter from './ClearFilter';

interface SidebarProps {
  selectedTag: string | null;
  onSelectTag: (tagId: string | null) => void;
  tags: Tag[];
  loading: boolean;
  error: string | null;
}

export default function Sidebar({ selectedTag, onSelectTag, tags, loading, error }: SidebarProps): JSX.Element {

  return (
    <div className="sidebar-filters" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Filters</span>
        <ClearFilter 
          isVisible={selectedTag !== null} 
          onClear={() => onSelectTag(null)} 
        />
      </div>

      {loading ? (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Loading tags...</div>
      ) : error ? (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}>Failed to load tags</div>
      ) : tags.length === 0 ? (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>No tags found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          {tags.map((tag) => (
            <TagFilter 
              key={tag.id}
              tag={tag}
              isSelected={selectedTag === tag.id}
              onClick={() => onSelectTag(selectedTag === tag.id ? null : tag.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
