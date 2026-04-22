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
import useCardFilter from '../hooks/useCardFilter';
import useTags from '../hooks/useTags';
import Sidebar from '../components/Sidebar';
import useSearch from '../hooks/useSearch';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';

export default function HomePage() {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Phase 16: multi-tag filter hook
  const {
    selectedTags,
    filterMode,
    toggleTag,
    removeTag,
    setFilterMode,
    clearAll,
    isTagSelected,
  } = useCardFilter();

  // Derive tag ID array for API calls
  const selectedTagIds = selectedTags.map((t) => t.id);

  // Phase 17: Search hook
  const {
    query,
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    isSearchActive,
    handleQueryChange,
    clearSearch,
  } = useSearch(selectedTagIds.length > 0 ? selectedTagIds : null, filterMode);

  const {
    cards,
    loading,
    error,
    page,
    totalPages,
    hasMore,
    loadMore,
    refetch,
  } = useCards(20, selectedTagIds.length > 0 ? selectedTagIds : null, filterMode);

  const { tags, loading: tagsLoading, error: tagsError, refreshTags } = useTags();

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card);
  };

  const handleTagClick = (tagId: string) => {
    // When clicking a tag on a card, toggle that tag in the sidebar filter
    const tag = tags.find((t) => t.id === tagId);
    if (tag) toggleTag(tag);
  };

  const handleCardAdded = async () => {
    await refetch();
    await refreshTags();
  };

  return (
    <Layout
      title="Home"
      sidebarContent={
        <div className="sidebar-section">
          <Sidebar
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onRemoveTag={removeTag}
            onClearAll={clearAll}
            isTagSelected={isTagSelected}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            tags={tags}
            loading={tagsLoading}
            error={tagsError}
          />
        </div>
      }
    >
      <div style={{ maxWidth: '1400px' }}>
        <div
          style={{
            marginBottom: 'var(--space-2xl)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-xl)',
          }}
        >
          <div style={{ flex: 1 }}>
            <h1>My Cards</h1>
          </div>
          <div style={{ flex: 2, maxWidth: '600px' }}>
            <SearchBar
              value={query}
              onChange={handleQueryChange}
              onClear={clearSearch}
              isSearchActive={isSearchActive}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              label={<PlusIcon />}
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
            />
          </div>
        </div>

        {isSearchActive ? (
          <SearchResults
            query={query}
            results={searchResults}
            loading={searchLoading}
            error={searchError}
            onCardClick={handleCardClick}
            onTagClick={handleTagClick}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        ) : (
          <>
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
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <Button
                    label="Retry"
                    variant="secondary"
                    onClick={refetch}
                  />
                </div>
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
