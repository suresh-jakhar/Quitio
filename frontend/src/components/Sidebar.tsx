
import { Tag } from '../hooks/useTags';
import { FilterMode } from '../hooks/useCardFilter';
import TagFilter from './TagFilter';
import FilterModeToggle from './FilterModeToggle';
import SelectedFilters from './SelectedFilters';

interface SidebarProps {
  /** Array of selected Tag objects (multi-select, Phase 16) */
  selectedTags: Tag[];
  onToggleTag: (tag: Tag) => void;
  onRemoveTag: (tagId: string) => void;
  onClearAll: () => void;
  isTagSelected: (tagId: string) => boolean;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  tags: Tag[];
  loading: boolean;
  error: string | null;
}

/**
 * Sidebar tag list with multi-select checkboxes, AND/OR toggle, and selected-filter badges.
 * Phase 15 → single select; Phase 16 → multi-select with filter mode.
 */
export default function Sidebar({
  selectedTags,
  onToggleTag,
  onRemoveTag,
  onClearAll,
  isTagSelected,
  filterMode,
  onFilterModeChange,
  tags,
  loading,
  error,
}: SidebarProps) {
  const hasSelection = selectedTags.length > 0;

  return (
    <div className="sidebar-filters" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Header row: "Filters" label + AND/OR toggle */}
      <div
        className="sidebar-title"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Filters</span>
        {hasSelection && (
          <FilterModeToggle mode={filterMode} onChange={onFilterModeChange} />
        )}
      </div>

      {/* Active filter badges */}
      {hasSelection && (
        <SelectedFilters
          selectedTags={selectedTags}
          onRemove={onRemoveTag}
          onClearAll={onClearAll}
        />
      )}

      {/* Tag list */}
      {loading ? (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Loading tags...
        </div>
      ) : error ? (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}>
          Failed to load tags
        </div>
      ) : tags.length === 0 ? (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          No tags found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          {tags.map((tag) => (
            <TagFilter
              key={tag.id}
              tag={tag}
              isSelected={isTagSelected(tag.id)}
              onClick={() => onToggleTag(tag)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
