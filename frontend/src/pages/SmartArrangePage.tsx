import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import Tag from '../components/Tag';
import { useSmartArrange, ArrangedCard, ClusterRow } from '../hooks/useSmartArrange';

/* ─── Cluster colour palette (cycles through) ─── */
const CLUSTER_PALETTES = [
  { bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', light: '#eef2ff', accent: '#6366f1', text: '#fff' },
  { bg: 'linear-gradient(135deg,#0ea5e9,#06b6d4)', light: '#e0f2fe', accent: '#0ea5e9', text: '#fff' },
  { bg: 'linear-gradient(135deg,#10b981,#34d399)', light: '#d1fae5', accent: '#10b981', text: '#fff' },
  { bg: 'linear-gradient(135deg,#f59e0b,#f97316)', light: '#fef3c7', accent: '#f59e0b', text: '#fff' },
  { bg: 'linear-gradient(135deg,#ef4444,#f43f5e)', light: '#fee2e2', accent: '#ef4444', text: '#fff' },
  { bg: 'linear-gradient(135deg,#8b5cf6,#ec4899)', light: '#fce7f3', accent: '#8b5cf6', text: '#fff' },
];

function getContentTypeIcon(type: string) {
  switch (type) {
    case 'social_link': return '🔗';
    case 'pdf':         return '📄';
    case 'docx':
    case 'doc':         return '📝';
    default:            return '🗒️';
  }
}

/* ─── Single smart card (compact, horizontal strip) ─── */
function SmartCard({
  card,
  palette,
  rank,
  onCardClick,
  onDeleteCard,
}: {
  card: ArrangedCard;
  palette: (typeof CLUSTER_PALETTES)[0];
  rank: number;
  onCardClick: (id: string) => void;
  onDeleteCard: (id: string, title: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = Math.round(card.relevance_score * 100);
  const isCrossCluster = card.appears_in_clusters.length > 0;

  return (
    <div
      id={`smart-card-${card.id}`}
      onClick={() => onCardClick(card.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        minWidth: '260px',
        maxWidth: '280px',
        flexShrink: 0,
        background: '#fff',
        borderRadius: '16px',
        border: `2px solid ${hovered ? palette.accent : 'transparent'}`,
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.14)`
          : '0 2px 12px rgba(0,0,0,0.07)',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Rank strip */}
      <div
        style={{
          height: '4px',
          background: palette.bg,
          opacity: Math.max(0.3, 1 - rank * 0.07),
        }}
      />

      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>{getContentTypeIcon(card.content_type)}</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: palette.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              #{rank + 1}
            </span>
          </div>

          {/* Relevance pill */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {pct > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: palette.light,
                  color: palette.accent,
                  whiteSpace: 'nowrap',
                }}
              >
                {pct}% match
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCard(card.id, card.title);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: hovered ? '#ef4444' : 'transparent',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 200ms',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Delete card"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: 1.3,
            color: '#111827',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {card.title?.toLowerCase().startsWith('file-') 
            ? (card.metadata?.original_name || card.metadata?.file_name || 'Uploaded Document').replace(/\.(pdf|docx?|doc)$/i, '')
            : card.title}
        </div>

        {/* Excerpt */}
        {card.extracted_text && (
          <div
            style={{
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1,
            }}
          >
            {card.extracted_text}
          </div>
        )}

        {/* Cross-cluster badge */}
        {isCrossCluster && (
          <div
            style={{
              fontSize: '10px',
              color: '#8b5cf6',
              fontWeight: 600,
              background: '#f5f3ff',
              borderRadius: '6px',
              padding: '3px 7px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              width: 'fit-content',
            }}
          >
            ↗ Also in: {card.appears_in_clusters.join(', ')}
          </div>
        )}

        {/* Tags */}
        {card.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
            {card.tags.slice(0, 2).map((t) => (
              <Tag key={t.id} label={t.name} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Single cluster row ─── */
function ClusterRowView({
  cluster,
  palette,
  onCardClick,
  onDeleteCard,
}: {
  cluster: ClusterRow;
  palette: (typeof CLUSTER_PALETTES)[0];
  onCardClick: (id: string) => void;
  onDeleteCard: (id: string, title: string) => void;
}) {
  return (
    <div
      id={`cluster-${cluster.cluster_id}`}
      style={{
        marginBottom: '32px',
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
      }}
    >
      {/* Cluster header */}
      <div
        style={{
          background: palette.bg,
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            🧠
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>
              {cluster.cluster_name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px' }}>
              {cluster.card_count} cards · sorted by relevance
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '999px',
            padding: '4px 14px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px',
          }}
        >
          Most relevant →
        </div>
      </div>

      {/* Horizontal scroll strip */}
      <div
        style={{
          display: 'flex',
          gap: '14px',
          padding: '20px 24px',
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: `${palette.accent}33 transparent`,
        }}
      >
        {cluster.cards.map((card, i) => (
          <SmartCard
            key={card.id}
            card={card}
            palette={palette}
            rank={i}
            onCardClick={onCardClick}
            onDeleteCard={onDeleteCard}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Smart Arrange Page ─── */
export default function SmartArrangePage() {
  const navigate = useNavigate();
  const { data, loading, error, fetch, deleteCard } = useSmartArrange();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleCardClick = (cardId: string) => {
    // Navigate to home with the card highlighted (or open modal in future)
    navigate('/', { state: { highlightCard: cardId } });
  };

  const handleDeleteCard = async (cardId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This will permanently remove it from your knowledge graph.`)) {
      const success = await deleteCard(cardId);
      if (!success) {
        alert('Failed to delete card. Please try again.');
      }
    }
  };

  return (
    <Layout title="Smart Arrange">
      <div style={{ maxWidth: '1200px' }}>
        {/* Page header */}
        <div
          style={{
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h1 style={{ marginBottom: '6px', fontSize: '2rem' }}>Smart Arrange</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '15px' }}>
              Your cards grouped by topic — most relevant cards first in each row.
              Cards with cross-topic connections appear in multiple rows.
            </p>
          </div>

          <button
            id="smart-arrange-refresh-btn"
            onClick={() => fetch(true)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: '1.5px solid #e5e7eb',
              background: loading ? '#f9fafb' : '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              color: loading ? '#9ca3af' : '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 150ms',
              opacity: loading ? 0.6 : 1,
              boxShadow: loading ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            {loading ? '⏳' : '🔥'} {loading ? 'Rebuilding...' : 'Strong Refresh'}
          </button>
        </div>

        {/* Stats bar */}
        {data && (
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '32px',
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Total Cards', value: data.total_cards, icon: '🗂️' },
              { label: 'Topic Clusters', value: data.cluster_count, icon: '🧩' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  padding: '16px 22px',
                  border: '1px solid #f3f4f6',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '22px' }}>{stat.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '20px', lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && !data && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '64px 0' }}>
            <Spinner />
            <p style={{ color: '#6b7280', margin: 0 }}>AI is arranging your cards…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
            }}
          >
            <strong>Failed to load arrangement.</strong>
            <p style={{ margin: '8px 0 0' }}>{error}</p>
            <button
              onClick={fetch}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Cluster rows */}
        {data && data.clusters.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕸️</div>
            <p style={{ fontWeight: 600 }}>No clusters found yet.</p>
            <p style={{ fontSize: '14px' }}>
              Make sure your cards have tags and embeddings are generated.
              <br />Try rebuilding the knowledge graph from the browser console.
            </p>
          </div>
        )}

        {data &&
          data.clusters.map((cluster, idx) => (
            <ClusterRowView
              key={cluster.cluster_id}
              cluster={cluster}
              palette={CLUSTER_PALETTES[idx % CLUSTER_PALETTES.length]}
              onCardClick={handleCardClick}
              onDeleteCard={handleDeleteCard}
            />
          ))}
      </div>
    </Layout>
  );
}
