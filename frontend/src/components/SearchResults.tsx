import Spinner from './Spinner';
import CardGrid from './CardGrid';
import { CardData } from '../hooks/useCards';

interface SearchResultsProps {
  query: string;
  results: CardData[];
  loading: boolean;
  error: string | null;
  onCardClick: (card: CardData) => void;
  onTagClick: (tagId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

/**
 * Renders search results in the same CardGrid as the home feed (Phase 17).
 * Shows loading spinner, error state, empty state, or the result grid.
 */
export default function SearchResults({
  query,
  results,
  loading,
  error,
  onCardClick,
  onTagClick,
  onDeleteCard,
  viewMode,
  onViewModeChange,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 'var(--space-lg)',
          backgroundColor: '#fee2e2',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #fca5a5',
          color: '#dc2626',
        }}
      >
        <strong>Search error:</strong> {error}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div
        id="search-empty"
        style={{
          textAlign: 'center',
          padding: 'var(--space-3xl)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>🔍</div>
        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', marginBottom: 'var(--space-sm)' }}>
          No results for "{query}"
        </p>
        <p style={{ fontSize: 'var(--font-size-sm)' }}>
          Try a different keyword or clear the search to see all cards.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Result count banner */}
      <div
        id="search-result-count"
        style={{
          marginBottom: 'var(--space-lg)',
          padding: '8px 14px',
          backgroundColor: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-primary-dark)',
          fontWeight: 'bold',
          display: 'inline-block',
        }}
      >
        {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
      </div>

      <CardGrid
        cards={results}
        viewMode={viewMode}
        onCardClick={onCardClick}
        onTagClick={onTagClick}
        onDeleteCard={onDeleteCard}
        onViewModeChange={onViewModeChange}
      />
    </>
  );
}
