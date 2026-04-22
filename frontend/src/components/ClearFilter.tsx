import React from 'react';

interface ClearFilterProps {
  isVisible: boolean;
  onClear: () => void;
}

export default function ClearFilter({ isVisible, onClear }: ClearFilterProps): JSX.Element | null {
  if (!isVisible) return null;

  return (
    <button
      onClick={onClear}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: 'var(--font-size-sm)',
        width: 'fit-content',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-light-gray)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
    >
      <span style={{ fontSize: '14px' }}>✕</span>
      Clear Filter
    </button>
  );
}
