import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import api from '../utils/api';

interface CardTag {
  id: string;
  name: string;
}

interface TagEditorProps {
  cardId: string;
  initialTags: CardTag[];
  allUserTags: CardTag[];          // existing tags for autocomplete
  onTagsUpdated: (tags: CardTag[]) => void;
}

export default function TagEditor({
  cardId,
  initialTags,
  allUserTags,
  onTagsUpdated,
}: TagEditorProps) {
  const [tags, setTags] = useState<CardTag[]>(initialTags);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CardTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = allUserTags.filter(
      (t) =>
        t.name.toLowerCase().includes(input.toLowerCase()) &&
        !tags.some((ct) => ct.id === t.id)
    );
    setSuggestions(filtered.slice(0, 6));
    setShowSuggestions(filtered.length > 0);
  }, [input, allUserTags, tags]);

  const save = async (newTags: CardTag[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.put(`/cards/${cardId}/tags`, {
        tagNames: newTags.map((t) => t.name),
      });
      const updated: CardTag[] = res.data.tags;
      setTags(updated);
      onTagsUpdated(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save tags');
    } finally {
      setSaving(false);
    }
  };

  const addTag = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;

    // Optimistically add a placeholder tag (real ID comes from server)
    const newTags: CardTag[] = [...tags, { id: `new-${Date.now()}`, name: trimmed }];
    setTags(newTags);
    setInput('');
    setShowSuggestions(false);
    save(newTags);
  };

  const removeTag = (tagId: string) => {
    const newTags = tags.filter((t) => t.id !== tagId);
    setTags(newTags);
    save(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div id={`tag-editor-${cardId}`} style={{ position: 'relative' }}>
      {/* Tag chips + input box */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center',
          padding: '8px 12px',
          border: `2px solid ${saving ? '#6366f1' : '#e5e7eb'}`,
          borderRadius: '12px',
          background: '#fff',
          cursor: 'text',
          transition: 'border-color 150ms',
          minHeight: '44px',
        }}
      >
        {/* Existing tags */}
        {tags.map((tag) => (
          <span
            key={tag.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              background: '#eef2ff',
              color: '#4f46e5',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {tag.name}
            <button
              id={`remove-tag-${tag.id}`}
              onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#818cf8',
                fontSize: '14px',
                lineHeight: 1,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
              title={`Remove ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          id={`tag-input-${cardId}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input && setShowSuggestions(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? 'Type a tag and press Enter…' : 'Add tag…'}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            minWidth: '120px',
            flex: 1,
            background: 'transparent',
            color: '#111827',
          }}
        />

        {saving && (
          <span style={{ fontSize: '11px', color: '#6366f1', whiteSpace: 'nowrap' }}>saving…</span>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((s) => (
            <div
              key={s.id}
              id={`suggestion-${s.id}`}
              onMouseDown={() => addTag(s.name)}
              style={{
                padding: '9px 14px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#374151',
                borderBottom: '1px solid #f3f4f6',
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f3ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              🏷️ {s.name}
            </div>
          ))}
          {input && !suggestions.some((s) => s.name.toLowerCase() === input.toLowerCase()) && (
            <div
              id="suggestion-create-new"
              onMouseDown={() => addTag(input)}
              style={{
                padding: '9px 14px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#6366f1',
                fontWeight: 600,
                background: '#f5f3ff',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ede9fe')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f5f3ff')}
            >
              ✨ Create &quot;{input}&quot;
            </div>
          )}
        </div>
      )}

      {/* Hint text */}
      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '5px', paddingLeft: '4px' }}>
        Press <kbd style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>Enter</kbd> or <kbd style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>,</kbd> to add a tag. <kbd style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>Backspace</kbd> to remove last.
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{error}</div>
      )}
    </div>
  );
}
