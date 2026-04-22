import React from 'react';
import { Tag as TagType } from '../hooks/useTags';

interface TagSuggestionsProps {
  suggestions: string[];
  existingTags: TagType[];
  inputValue: string;
  onSelect: (tagName: string) => void;
}

export default function TagSuggestions({
  suggestions,
  existingTags,
  inputValue,
  onSelect,
}: TagSuggestionsProps): JSX.Element | null {
  const lowerInput = inputValue.trim().toLowerCase();

  // If there's no input, we show the context-based suggestions
  let displayTags: string[] = [];
  let isCreatingNew = false;

  if (!lowerInput) {
    displayTags = suggestions;
  } else {
    // Show matching existing tags
    displayTags = existingTags
      .filter((t) => t.name.toLowerCase().includes(lowerInput))
      .map((t) => t.name);

    // If exact match doesn't exist, offer to create it
    if (!displayTags.some((t) => t.toLowerCase() === lowerInput)) {
      displayTags.push(inputValue.trim());
      isCreatingNew = true;
    }
  }

  if (displayTags.length === 0) {
    return null;
  }

  return (
    <div className="tag-suggestions-dropdown" style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      marginTop: '4px',
      maxHeight: '150px',
      overflowY: 'auto',
      zIndex: 10,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      {displayTags.map((tagName, index) => {
        const isNew = isCreatingNew && index === displayTags.length - 1 && lowerInput;
        return (
          <div
            key={`${tagName}-${index}`}
            className="tag-suggestion-item"
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderBottom: index < displayTags.length - 1 ? '1px solid var(--color-border)' : 'none',
              fontSize: 'var(--font-size-sm)',
            }}
            onClick={() => onSelect(tagName)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-light-gray)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {isNew ? (
              <span>Create tag <strong>"{tagName}"</strong></span>
            ) : (
              tagName
            )}
          </div>
        );
      })}
    </div>
  );
}
