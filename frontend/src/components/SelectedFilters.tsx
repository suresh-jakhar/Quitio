
import { Tag } from '../hooks/useTags';

interface SelectedFiltersProps {
  selectedTags: Tag[];
  onRemove: (tagId: string) => void;
  onClearAll: () => void;
}

/**
 * Displays currently selected filter tags as removable badges.
 * Shown only when at least one tag is selected.
 */
export default function SelectedFilters({ selectedTags, onRemove, onClearAll }: SelectedFiltersProps) {
  if (selectedTags.length === 0) return null;

  return (
    <div
      id="selected-filters"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '10px 12px',
        backgroundColor: 'var(--color-primary-light)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-primary)',
      }}
    >
      <div
        style={{
          width: '100%',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'bold',
          color: 'var(--color-primary-dark)',
          marginBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Active Filters ({selectedTags.length})</span>
        <button
          id="clear-all-filters"
          onClick={onClearAll}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-primary-dark)',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Clear all
        </button>
      </div>

      {selectedTags.map((tag) => (
        <span
          key={tag.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            borderRadius: '12px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'bold',
          }}
        >
          {tag.name}
          <button
            aria-label={`Remove ${tag.name} filter`}
            onClick={() => onRemove(tag.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              padding: 0,
              lineHeight: 1,
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: 0.8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
