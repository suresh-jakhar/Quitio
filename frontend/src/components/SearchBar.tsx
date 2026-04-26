import type { CSSProperties, KeyboardEvent } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (q: string) => void;
  onClear: () => void;
  placeholder?: string;
  isSearchActive?: boolean;
  isSemantic?: boolean;
  onToggleSemantic?: () => void;
}

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search cards by title or tag…',
  isSearchActive = false,
  isSemantic = false,
  onToggleSemantic,
}: SearchBarProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') onClear();
  };

  return (
    <div id="search-bar" className="search-bar-container">
      {/* Magnifier icon */}
      <span
        aria-hidden="true"
        className="search-icon"
        style={{
          color: isSearchActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          marginRight: 'var(--space-sm)',
          fontSize: '18px',
          transition: 'var(--transition)',
        }}
      >
        🔍
      </span>

      <input
        id="search-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search cards"
        className="search-input-field"
        style={{
          border: 'none',
          outline: 'none',
          background: 'none',
          width: '100%',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {/* Clear button */}
        {isSearchActive && (
          <button
            id="search-clear"
            onClick={onClear}
            className="search-clear-btn"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: '16px',
              padding: '4px',
            }}
          >
            ✕
          </button>
        )}

        {/* Semantic Toggle */}
        {onToggleSemantic && (
          <button
            id="semantic-toggle"
            onClick={onToggleSemantic}
            className={`semantic-toggle-btn ${isSemantic ? 'active' : ''}`}
            title={isSemantic ? "Semantic Search Active" : "Keyword Search Active"}
            style={{
              background: isSemantic ? 'var(--color-primary-soft)' : 'none',
              border: '1px solid transparent',
              borderColor: isSemantic ? 'var(--color-primary)' : 'transparent',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              transition: 'var(--transition)',
            }}
          >
            🧠
          </button>
        )}
      </div>
    </div>
  );
}
