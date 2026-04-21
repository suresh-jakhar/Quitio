import { useState } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';

interface CardData {
  id: string;
  title: string;
  content_type: 'social_link' | 'pdf' | 'docx' | string;
  metadata: Record<string, any>;
  tags?: Array<{ id: string; name: string }>;
  created_at?: string;
  extracted_text?: string;
}

export default function HomePage(): JSX.Element {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);

  // Demo cards for showcase
  const demoCards: CardData[] = [
    {
      id: '1',
      title: 'Understanding Vector Embeddings',
      content_type: 'social_link',
      metadata: {
        url: 'https://twitter.com/example',
        source: 'Twitter',
        og_title: 'Vector Embeddings Explained',
        og_description: 'A deep dive into how embeddings work in modern ML systems',
        og_image: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%222563eb%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22white%22 text-anchor=%22middle%22 dy=%22.3em%22%3E🔗%3C/text%3E%3C/svg%3E',
      },
      tags: [{ id: 't1', name: 'ML' }, { id: 't2', name: 'embeddings' }],
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      extracted_text: 'Vector embeddings are numerical representations of text that capture semantic meaning. They power modern search and recommendation systems.',
    },
    {
      id: '2',
      title: 'RAG Systems & LLMs.pdf',
      content_type: 'pdf',
      metadata: {
        file_name: 'rag-systems-llms.pdf',
        page_count: 42,
        file_size: 2457600,
      },
      tags: [{ id: 't3', name: 'RAG' }, { id: 't4', name: 'LLM' }, { id: 't2', name: 'embeddings' }],
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      extracted_text: 'Retrieval-Augmented Generation combines large language models with external knowledge bases for more accurate and grounded responses.',
    },
    {
      id: '3',
      title: 'Project Documentation.docx',
      content_type: 'docx',
      metadata: {
        file_name: 'project-documentation.docx',
        word_count: 8450,
        file_size: 512000,
      },
      tags: [{ id: 't5', name: 'docs' }, { id: 't6', name: 'project' }],
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      extracted_text: 'Complete documentation for the QUITIO knowledge management system including architecture, API endpoints, and deployment guidelines.',
    },
    {
      id: '4',
      title: 'PostgreSQL with pgvector',
      content_type: 'social_link',
      metadata: {
        url: 'https://youtube.com/example',
        source: 'YouTube',
        og_title: 'PostgreSQL pgvector Tutorial',
        og_description: 'Learn how to use pgvector extension for vector similarity search',
        og_image: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%2310b981%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22white%22 text-anchor=%22middle%22 dy=%22.3em%22%3E▶️%3C/text%3E%3C/svg%3E',
      },
      tags: [{ id: 't7', name: 'database' }, { id: 't2', name: 'embeddings' }],
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      extracted_text: 'A comprehensive tutorial on setting up and using pgvector for vector similarity search in PostgreSQL databases.',
    },
  ];

  return (
    <Layout title="Home">
      <div style={{ maxWidth: '1400px' }}>
        <div style={{ marginBottom: 'var(--space-2xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>My Cards</h1>
          <Button label="+ Add Card" variant="primary" disabled />
        </div>

        {/* Card Grid */}
        <div className="card-grid">
          {demoCards.map((card) => (
            <Card
              key={card.id}
              cardData={card}
              onClick={() => setSelectedCard(card)}
              onTagClick={(tagId) => console.log('Tag clicked:', tagId)}
            />
          ))}
        </div>

        {/* Detail Modal - Placeholder */}
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
                  onTagClick={(tagId) => console.log('Tag clicked:', tagId)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Feature Overview */}
        <div style={{ marginTop: 'var(--space-3xl)', paddingTop: 'var(--space-2xl)', borderTop: '1px solid var(--color-border)' }}>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>Phase 6 Complete: Generic Card Component ✅</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--space-lg)',
          }}>
            <div style={{ backgroundColor: 'var(--color-white)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '2em', marginBottom: 'var(--space-md)' }}>📌</div>
              <h4 style={{ marginBottom: 'var(--space-sm)' }}>Flexible Preview</h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Different renderers for social links, PDFs, and documents
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--color-white)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '2em', marginBottom: 'var(--space-md)' }}>🎨</div>
              <h4 style={{ marginBottom: 'var(--space-sm)' }}>Multiple Layouts</h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Grid, list, and detail views with responsive design
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--color-white)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '2em', marginBottom: 'var(--space-md)' }}>🏷️</div>
              <h4 style={{ marginBottom: 'var(--space-sm)' }}>Tag Support</h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Built-in tagging with click handlers for filtering
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
