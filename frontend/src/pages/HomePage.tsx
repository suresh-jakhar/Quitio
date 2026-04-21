import { useState } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import CardGrid from '../components/CardGrid';
import Pagination from '../components/Pagination';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import useCards, { CardData } from '../hooks/useCards';

export default function HomePage(): JSX.Element {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { cards, loading, error, page, totalPages, hasMore, loadMore, refetch } = useCards(20);

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card);
  };

  const handleTagClick = (tagId: string) => {
    console.log('Tag clicked:', tagId);
    // TODO: Implement filtering by tag (Phase 15)
  };

  return (
    <Layout title="Home">
      <div style={{ maxWidth: '1400px' }}>
        <div
          style={{
            marginBottom: 'var(--space-2xl)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1>My Cards</h1>
          <Button label="Add Card" variant="primary" disabled />
        </div>

        {/* Error State */}
        {error && (
          <div
            style={{
              marginBottom: 'var(--space-lg)',
              padding: 'var(--space-lg)',
              backgroundColor: '#fee2e2',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #fca5a5',
              color: '#dc2626',
            }}
          >
            <strong>Error loading cards:</strong> {error}
            <Button
              label="Retry"
              variant="secondary"
              onClick={refetch}
              style={{ marginTop: 'var(--space-md)' }}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && cards.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
            <Spinner />
          </div>
        ) : (
          <>
            {/* Card Grid with View Toggle */}
            <CardGrid
              cards={cards}
              viewMode={viewMode}
              onCardClick={handleCardClick}
              onTagClick={handleTagClick}
              onViewModeChange={setViewMode}
            />

            {/* Pagination */}
            {cards.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                hasMore={hasMore}
                loading={loading}
                onLoadMore={loadMore}
                variant="load-more"
              />
            )}
          </>
        )}

        {/* Detail Modal */}
        {selectedCard && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedCard(null)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">{selectedCard.title}</h2>
                <button
                  className="modal-close"
                  onClick={() => setSelectedCard(null)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <Card
                  cardData={selectedCard}
                  isDetail={true}
                  onTagClick={handleTagClick}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
