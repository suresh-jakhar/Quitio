import pool from '../utils/db';
import { extractText } from '../services/textExtractionService';

/**
 * Backfill extracted_text for cards that don't have it (Phase 18)
 */
async function backfill() {
  console.log('🚀 Starting text extraction backfill...');

  try {
    // 1. Get cards with missing extracted_text
    const result = await pool.query(
      "SELECT id, content_type, title, metadata FROM cards WHERE extracted_text IS NULL OR extracted_text = ''"
    );

    console.log(`Found ${result.rows.length} cards to process.`);

    for (const card of result.rows) {
      console.log(`Processing card ${card.id} (${card.content_type})...`);

      let text = '';
      if (card.content_type === 'social_link') {
        text = await extractText('social_link', card.metadata);
      } else {
        // For PDF/DOCX we'd need the file path, which we don't have here easily 
        // unless we re-run extraction. For now, we'll just use title + metadata.
        text = `${card.title}\n${JSON.stringify(card.metadata)}`;
      }

      await pool.query(
        'UPDATE cards SET extracted_text = $1, updated_at = NOW() WHERE id = $2',
        [text, card.id]
      );
    }

    console.log('✅ Backfill complete!');
  } catch (err) {
    console.error('❌ Backfill failed:', err);
  } finally {
    process.exit(0);
  }
}

backfill();
