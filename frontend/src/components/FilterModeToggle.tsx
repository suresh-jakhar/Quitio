import type { CSSProperties } from 'react';

export type FilterMode = 'AND' | 'OR';

interface FilterModeToggleProps {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
}

/**
 * AND/OR toggle — controls whether selected tags use intersection (AND) or union (OR) logic.
 */
export default function FilterModeToggle({ mode, onChange }: FilterModeToggleProps) {
  const buttonBase: CSSProperties = {
    padding: '4px 12px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'bold',
    transition: 'background-color 0.2s, color 0.2s',
    lineHeight: '1.4',
  };

  const activeStyle: CSSProperties = {
    ...buttonBase,
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
  };

  const inactiveStyle: CSSProperties = {
    ...buttonBase,
    backgroundColor: 'var(--color-light-gray)',
    color: 'var(--color-text-secondary)',
  };

  return (
    <div
      title="Filter mode: AND returns cards with ALL selected tags; OR returns cards with ANY selected tag"
      style={{
        display: 'inline-flex',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
      }}
    >
      <button
        id="filter-mode-and"
        style={mode === 'AND' ? { ...activeStyle, borderRadius: 0 } : { ...inactiveStyle, borderRadius: 0 }}
        onClick={() => onChange('AND')}
        aria-pressed={mode === 'AND'}
        title="AND: show cards that have ALL selected tags"
      >
        AND
      </button>
      <button
        id="filter-mode-or"
        style={mode === 'OR' ? { ...activeStyle, borderRadius: 0 } : { ...inactiveStyle, borderRadius: 0 }}
        onClick={() => onChange('OR')}
        aria-pressed={mode === 'OR'}
        title="OR: show cards that have ANY of the selected tags"
      >
        OR
      </button>
    </div>
  );
}
