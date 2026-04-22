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

const containerStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 40px 10px 40px',
  fontSize: 'var(--font-size-sm)',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
};

const inputFocusStyle: CSSProperties = {
  borderColor: 'var(--color-primary)',
  boxShadow: '0 0 0 3px var(--color-primary-light)',
};

/**
 * Generic search bar with magnifier icon and clear button (Phase 17).
 * Controlled component — parent owns query state via useSearch hook.
 */
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
    <div id="search-bar" style={containerStyle}>
      {/* Magnifier icon */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '12px',
          color: isSearchActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          fontSize: '16px',
          pointerEvents: 'none',
          transition: 'color 0.2s',
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
        style={inputStyle}
        onFocus={(e) => {
          Object.assign(e.currentTarget.style, inputFocusStyle);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />

      {/* Clear button — only visible when there is a query */}
      {isSearchActive && (
        <button
          id="search-clear"
          onClick={onClear}
          aria-label="Clear search"
          title="Clear search"
          style={{
            position: 'absolute',
            right: onToggleSemantic ? '45px' : '10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            fontSize: '18px',
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: 'var(--radius-sm)',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          ✕
        </button>
      )}

      {/* Semantic Search Toggle (Brain icon) */}
      {onToggleSemantic && (
        <button
          id="semantic-toggle"
          onClick={onToggleSemantic}
          title={isSemantic ? "Semantic Search Active (Smart)" : "Keyword Search Active (Exact)"}
          style={{
            position: 'absolute',
            right: '10px',
            background: isSemantic ? 'var(--color-primary-light)' : 'none',
            border: `1px solid ${isSemantic ? 'var(--color-primary)' : 'transparent'}`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            opacity: isSemantic ? 1 : 0.6,
          }}
        >
          🧠
        </button>
      )}
    </div>
  );
}
