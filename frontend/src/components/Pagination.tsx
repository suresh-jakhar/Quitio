import Button from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  variant?: 'load-more' | 'pagination';
}

export default function Pagination({
  page,
  totalPages,
  hasMore,
  loading,
  onLoadMore,
  onPrevious,
  onNext,
  variant = 'load-more',
}: PaginationProps): JSX.Element | null {
  if (variant === 'load-more') {
    if (!hasMore) {
      return null;
    }

    return (
      <div className="pagination-container pagination-load-more">
        <Button
          label={loading ? 'Loading...' : 'Load More'}
          onClick={onLoadMore}
          disabled={loading}
          variant="primary"
        />
      </div>
    );
  }

  return (
    <div className="pagination-container pagination-nav">
      <Button
        label="Previous"
        onClick={onPrevious}
        disabled={page === 1 || loading}
        variant="secondary"
      />

      <div className="pagination-info">
        Page {page} of {totalPages}
      </div>

      <Button
        label="Next"
        onClick={onNext}
        disabled={page >= totalPages || loading}
        variant="secondary"
      />
    </div>
  );
}
