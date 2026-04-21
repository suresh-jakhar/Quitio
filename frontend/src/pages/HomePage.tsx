import { useState } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import CardGrid from '../components/CardGrid';
import Pagination from '../components/Pagination';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import AddCardModal from '../components/AddCardModal';
import { PlusIcon, XIcon } from '../components/icons';
import useCards, { CardData } from '../hooks/useCards';

export default function HomePage(): JSX.Element {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { cards, loading, error, page, totalPages, hasMore, loadMore, refetch } = useCards(20);

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card);
  };

  const handleTagClick = (tagId: string) => {
    console.log('Tag clicked:', tagId);
  };

  const handleCardAdded = async () => {
    await refetch();
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
          <Button
            label={<PlusIcon />}
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
          />
        </div>

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

        {loading && cards.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
            <Spinner />
          </div>
        ) : (
          <>
            <CardGrid
              cards={cards}
              viewMode={viewMode}
              onCardClick={handleCardClick}
              onTagClick={handleTagClick}
              onViewModeChange={setViewMode}
            />

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
                  aria-label="Close modal"
                >
                  <XIcon />
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

        <AddCardModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onCardAdded={handleCardAdded}
        />
      </div>
    </Layout>
  );
}
