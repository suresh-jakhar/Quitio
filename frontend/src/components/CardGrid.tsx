import Button from './Button';
import Card from './Card';
import { GridIcon, ListIcon } from './icons';
import { CardData } from '../hooks/useCards';

interface CardGridProps {
  cards: CardData[];
  viewMode: 'grid' | 'list';
  onCardClick?: (card: CardData) => void;
  onTagClick?: (tagId: string) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export default function CardGrid({
  cards,
  viewMode,
  onCardClick,
  onTagClick,
  onViewModeChange,
}: CardGridProps): JSX.Element {
  return (
    <div className="card-grid-wrapper">
      <div className="card-grid-controls">
        <div className="view-toggle">
          <Button
            label={<GridIcon />}
            variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            onClick={() => onViewModeChange?.('grid')}
          />
          <Button
            label={<ListIcon />}
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            onClick={() => onViewModeChange?.('list')}
          />
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="card-grid-empty">
          <h3>No cards yet</h3>
          <p>Start by adding a new card from a social link, PDF, or document.</p>
        </div>
      ) : (
        <div className={`card-grid card-grid-${viewMode}`}>
          {cards.map((card) => (
            <Card
              key={card.id}
              cardData={card}
              isListView={viewMode === 'list'}
              onClick={() => onCardClick?.(card)}
              onTagClick={onTagClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
