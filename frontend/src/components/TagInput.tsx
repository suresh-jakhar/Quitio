import React, { useState, useRef, useEffect } from 'react';
import useTags from '../hooks/useTags';
import TagSuggestions from './TagSuggestions';
import Tag from './Tag';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  contentType: string;
  url?: string; // used for social link suggestions
  disabled?: boolean;
}

export default function TagInput({
  value,
  onChange,
  contentType,
  url,
  disabled = false,
}: TagInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { tags: existingTags, createTag, getAutoSuggestedTags } = useTags();

  const suggestions = getAutoSuggestedTags(contentType, url).filter(
    (tag) => !value.includes(tag)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBlur = () => {
    if (inputValue.trim()) {
      handleSelect(inputValue);
    }
    // Note: setIsFocused(false) is handled by handleClickOutside to allow clicking suggestions
  };

  const handleSelect = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || value.includes(trimmed)) {
      setInputValue('');
      return;
    }

    // Check if tag needs to be created on the backend
    const exists = existingTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      try {
        await createTag(trimmed);
      } catch (err) {
        console.error('Failed to create tag', err);
      }
    }

    onChange([...value, trimmed]);
    setInputValue('');
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleSelect(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleRemove = (tagName: string) => {
    onChange(value.filter((t) => t !== tagName));
  };

  return (
    <div className="tag-input-container" ref={containerRef} style={{ position: 'relative' }}>
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: disabled ? 'var(--color-light-gray)' : 'var(--color-bg)',
          alignItems: 'center',
          minHeight: '42px',
        }}
        onClick={() => setIsFocused(true)}
      >
        {value.map((tag) => (
          <Tag 
            key={tag} 
            label={tag} 
            removable={!disabled}
            onRemove={() => handleRemove(tag)} 
          />
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={value.length === 0 ? "Type to add tags..." : ""}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            minWidth: '120px',
            fontSize: 'var(--font-size-md)',
          }}
        />
      </div>

      {isFocused && !disabled && (
        <TagSuggestions
          suggestions={suggestions}
          existingTags={existingTags}
          inputValue={inputValue}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
