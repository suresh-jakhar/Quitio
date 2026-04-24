import { v4 as uuidv4 } from 'uuid';
import pool from '../utils/db';
import { AuthRequest } from '../middleware/auth';
import { extractSocialMetadata } from '../extractors/socialLinkExtractor';
import { extractFromPdf } from '../extractors/pdfExtractor';
import { extractFromDocx } from '../extractors/docxExtractor';
import { cleanupTempFile } from '../extractors/storageService';
import { extractText } from './textExtractionService';
import { generateAndStoreEmbedding, triggerGraphBuild, triggerIncrementalGraphUpdate, deleteCardEdges } from './mlService';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'these', 'those',
  'which', 'where', 'when', 'who', 'how', 'what', 'why', 'can', 'will',
  'would', 'should', 'could', 'been', 'have', 'has', 'had', 'are', 'was',
  'were', 'but', 'not', 'your', 'their', 'our', 'all', 'any', 'some',
  'more', 'most', 'than', 'very', 'too', 'also', 'into', 'onto', 'upon',
  'about', 'around', 'between', 'among', 'through', 'during', 'before',
  'after', 'its', 'their', 'such', 'other', 'many', 'more', 'most',
  'well', 'does', 'did', 'being', 'been', 'increasingly', 'designed', 'mimic'
]);

function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

function generateSmartTitle(text: string): { title: string; keywords: string[] } {
  if (!text) return { title: '', keywords: [] };

  // 1. Clean text
  const cleaned = text
    .replace(/\S+@\S+/g, '') // remove emails
    .replace(/\+?\d[\d\-\s]{7,}\d/g, '') // remove phones
    .replace(/https?:\/\/\S+|www\.\S+/g, '') // remove urls
    .replace(/[^\w\s]/g, ' ') // remove special chars
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.toLowerCase().split(' ');
  const freqMap: Record<string, number> = {};

  // 2. Extract keywords (focus on first 1000 words for performance)
  const maxWords = Math.min(words.length, 1000);
  for (let i = 0; i < maxWords; i++) {
    const word = words[i];
    if (word.length > 3 && !STOPWORDS.has(word)) {
      freqMap[word] = (freqMap[word] || 0) + 1;
    }
  }

  // Sort by frequency, then by first appearance
  const sortedKeywords = Object.keys(freqMap).sort((a, b) => {
    if (freqMap[b] !== freqMap[a]) return freqMap[b] - freqMap[a];
    return words.indexOf(a) - words.indexOf(b);
  });

  const topKeywords = sortedKeywords.slice(0, 3);
  if (topKeywords.length === 0) return { title: '', keywords: [] };

  // Re-order based on first appearance to maintain some natural order
  const finalKeywords = [...topKeywords].sort((a, b) => words.indexOf(a) - words.indexOf(b));

  return {
    title: toTitleCase(finalKeywords.join(' ')),
    keywords: topKeywords
  };
}

function isMeaningfulFilename(name: string): boolean {
  // Strip extension
  const bare = name.replace(/\.(pdf|docx?|txt)$/i, '').trim();
  
  // Meaningless if it matches "file-xxxx" or similar auto-gen patterns
  if (/^file-[\d\-]+/.test(bare.toLowerCase())) return false;
  
  // Meaningless if: only digits/dashes/underscores (often timestamps or IDs)
  if (/^[\d\-_]+$/.test(bare)) return false;
  
  // Meaningless if it's "Untitled" or "Document"
  if (/^untitled/i.test(bare)) return false;
  if (/^document\d*/i.test(bare)) return false;
  
  // Meaningless if it looks like a long hex hash or UUID
  if (/^[0-9a-fA-F]{12,}$/.test(bare)) return false;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}/.test(bare)) return false;
  
  // If it has spaces, it's almost certainly a human-written title
  if (bare.includes(' ')) return true;
  
  // If it's very short and lacks meaning
  if (bare.length < 3) return false;
  
  return true;
}



/**
 * Extracts a smart, human-readable title from document content.
 * Priority:
 *  1. originalName — if it looks like a real filename (not random numbers)
 *  2. First meaningful sentence from extracted text
 *  3. First N characters of extracted text
 *  4. Fallback: 'Untitled Document'
 */
export function extractSmartTitle(
  extractedText: string | null | undefined,
  originalName: string,
  pdfMetaTitle?: string | null
): string {
  console.log('[extractSmartTitle] Start:', { originalName, pdfMetaTitle, extractedTextLength: extractedText?.length });
  
  let finalTitle = 'Untitled Document';
  let extractedFrom = 'none';

  // 1. PDF metadata title is most reliable if it exists, is short, and isn't garbage
  if (pdfMetaTitle && pdfMetaTitle.trim().length > 3 && !pdfMetaTitle.includes('/') && !pdfMetaTitle.includes('\\')) {
    const wordCount = pdfMetaTitle.trim().split(/\s+/).length;
    if (isMeaningfulFilename(pdfMetaTitle) && wordCount >= 2 && wordCount <= 5) {
      finalTitle = pdfMetaTitle.trim();
      extractedFrom = 'pdf-metadata';
    }
  }

  // 2. Use the original filename if it's meaningful
  if (extractedFrom === 'none' && isMeaningfulFilename(originalName)) {
    const bare = originalName.replace(/\.(pdf|docx?|txt)$/i, '').trim();
    
    // Clean up common separators
    finalTitle = bare
      .replace(/[-_]+/g, ' ')             // dashes/underscores → spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    extractedFrom = 'filename';
  }

  console.log('[extractSmartTitle] After Step 1&2:', { finalTitle, extractedFrom });

  // 3. Derive title from content
  let keywords: string[] = [];
  if (extractedFrom === 'none' || finalTitle.length < 5) {
    const text = (extractedText || '').replace(/\s+/g, ' ').trim();
    if (text) {
      const result = generateSmartTitle(text);
      if (result.title) {
        finalTitle = result.title;
        keywords = result.keywords;
        extractedFrom = 'content-keywords';
      }
    }
  }

  console.log('[extractSmartTitle] After Step 3:', { finalTitle, extractedFrom, keywords });

  // 4. Clean and Limit (Double check for garbage in metadata/filenames)
  let cleaned = finalTitle;
  if (extractedFrom !== 'content-keywords') {
      cleaned = finalTitle
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
        .replace(/\b\d{10,}\b/g, '')
        .replace(/\b[0-9a-f]{20,}\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
        
      // Ensure Title Case for all derived titles
      cleaned = toTitleCase(cleaned);

      // Limit to 2-5 words for all titles
      const words = cleaned.split(' ');
      if (words.length > 5) {
        cleaned = words.slice(0, 5).join(' ');
      }
  }

  console.log('[extractSmartTitle] After Step 4 (cleaned):', { cleaned });

  // Final fallback if we still have a garbage title
  if (!cleaned || cleaned.length < 3 || /^file-[\d\-]+/.test(cleaned.toLowerCase())) {
      console.log('[extractSmartTitle] Garbage detected, using fallback');
      cleaned = originalName.toLowerCase().includes('pdf') ? 'PDF Document' : 'Uploaded File';
  }

  console.log('[extractSmartTitle] Final:', cleaned);

  return cleaned;
}



export interface Card {
  id: string;
  user_id: string;
  title: string;
  content_type: string;
  raw_content?: string;
  extracted_text?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCardDTO {
  title: string;
  content_type: string;
  raw_content?: string;
  extracted_text?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateCardDTO {
  title?: string;
  raw_content?: string;
  extracted_text?: string;
  metadata?: Record<string, any>;
}

/**
 * Get all cards for a user (paginated).
 * Supports:
 *   - No filter:          return all user cards
 *   - tagIds + mode=OR:   cards that have ANY of the given tags
 *   - tagIds + mode=AND:  cards that have ALL of the given tags
 * (Phase 15: single tagId kept for backward compat via tagIds path)
 */
export const getUserCards = async (
  userId: string,
  page: number = 1,
  limit: number = 20,
  tagIds?: string[],
  filterMode: 'AND' | 'OR' = 'OR'
): Promise<{ cards: Card[]; total: number; page: number }> => {
  const offset = (page - 1) * limit;

  let countQuery: string;
  let dataQuery: string;
  const queryParams: any[] = [userId];

  if (tagIds && tagIds.length > 0) {
    // Build $2, $3, ... placeholders for tag IDs
    const tagPlaceholders = tagIds.map((_, i) => `$${i + 2}`).join(', ');
    queryParams.push(...tagIds);

    if (filterMode === 'AND') {
      // AND: card must have ALL selected tags
      // HAVING COUNT(DISTINCT ct.tag_id) = <number of tags>
      const tagCount = tagIds.length;
      countQuery = `
        SELECT COUNT(*) FROM (
          SELECT c.id FROM cards c
          JOIN card_tags ct ON c.id = ct.card_id
          WHERE c.user_id = $1 AND ct.tag_id IN (${tagPlaceholders})
          GROUP BY c.id
          HAVING COUNT(DISTINCT ct.tag_id) = ${tagCount}
        ) sub
      `;
      dataQuery = `
        SELECT c.* FROM cards c
        JOIN card_tags ct ON c.id = ct.card_id
        WHERE c.user_id = $1 AND ct.tag_id IN (${tagPlaceholders})
        GROUP BY c.id
        HAVING COUNT(DISTINCT ct.tag_id) = ${tagCount}
      `;
    } else {
      // OR: card must have ANY of the selected tags
      countQuery = `
        SELECT COUNT(DISTINCT c.id) FROM cards c
        JOIN card_tags ct ON c.id = ct.card_id
        WHERE c.user_id = $1 AND ct.tag_id IN (${tagPlaceholders})
      `;
      dataQuery = `
        SELECT DISTINCT c.* FROM cards c
        JOIN card_tags ct ON c.id = ct.card_id
        WHERE c.user_id = $1 AND ct.tag_id IN (${tagPlaceholders})
      `;
    }
  } else {
    // No filter — return all cards for user
    countQuery = 'SELECT COUNT(*) FROM cards c WHERE c.user_id = $1';
    dataQuery = 'SELECT c.* FROM cards c WHERE c.user_id = $1';
  }

  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  dataQuery += ` ORDER BY c.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  const dataParams = [...queryParams, limit, offset];

  const result = await pool.query(dataQuery, dataParams);

  // Fetch tags for ALL returned cards in a single query (avoid N+1)
  const cardIds = result.rows.map((r) => r.id);
  let tagRows: any[] = [];
  if (cardIds.length > 0) {
    const tagsResult = await pool.query(
      `SELECT ct.card_id, t.id, t.name
       FROM card_tags ct
       JOIN tags t ON ct.tag_id = t.id
       WHERE ct.card_id = ANY($1::uuid[]) AND t.user_id = $2`,
      [cardIds, userId]
    );
    tagRows = tagsResult.rows;
  }

  const tagsByCard = new Map<string, any[]>();
  tagRows.forEach((row) => {
    if (!tagsByCard.has(row.card_id)) tagsByCard.set(row.card_id, []);
    tagsByCard.get(row.card_id)!.push({ id: row.id, name: row.name });
  });

  const cardsWithTags = result.rows.map((card) => ({
    ...card,
    tags: tagsByCard.get(card.id) || [],
  }));

  return {
    cards: cardsWithTags,
    total,
    page,
  };
};

/**
 * Get a single card by ID
 */
export const getCardById = async (cardId: string, userId: string): Promise<Card | null> => {
  const result = await pool.query(
    'SELECT * FROM cards WHERE id = $1 AND user_id = $2',
    [cardId, userId]
  );

  return result.rows[0] || null;
};

/**
 * Create a new card
 */
export const createCard = async (userId: string, data: CreateCardDTO): Promise<Card> => {
  const cardId = uuidv4();
  const metadata = data.metadata || {};

  const result = await pool.query(
    `INSERT INTO cards (id, user_id, title, content_type, raw_content, extracted_text, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [cardId, userId, data.title, data.content_type, data.raw_content || null, data.extracted_text || null, JSON.stringify(metadata)]
  );

  const card = result.rows[0];

  // Add tags if provided
  if (data.tags && data.tags.length > 0) {
    await addTagsToCard(userId, cardId, data.tags);
  }

  // Trigger embedding generation in background
  if (card.extracted_text) {
    // We don't await this to keep response time fast
    generateAndStoreEmbedding(cardId, card.extracted_text).then(() => {
      triggerIncrementalGraphUpdate(cardId, userId);
    });
  }

  return card;
};

/**
 * Update a card
 */
export const updateCard = async (
  cardId: string,
  userId: string,
  data: UpdateCardDTO
): Promise<Card | null> => {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${paramCount}`);
    values.push(data.title);
    paramCount++;
  }

  if (data.raw_content !== undefined) {
    updates.push(`raw_content = $${paramCount}`);
    values.push(data.raw_content);
    paramCount++;
  }

  if (data.extracted_text !== undefined) {
    updates.push(`extracted_text = $${paramCount}`);
    values.push(data.extracted_text);
    paramCount++;
  }

  if (data.metadata !== undefined) {
    updates.push(`metadata = $${paramCount}`);
    values.push(JSON.stringify(data.metadata));
    paramCount++;
  }

  if (updates.length === 0) {
    return getCardById(cardId, userId);
  }

  updates.push(`updated_at = NOW()`);

  const query = `UPDATE cards SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;
  values.push(cardId, userId);

  const result = await pool.query(query, values);

  const updatedCard = result.rows[0];
  if (updatedCard) {
    triggerIncrementalGraphUpdate(cardId, userId);
  }

  return updatedCard || null;
};


/**
 * Add tags to a card
 */
export const addTagsToCard = async (userId: string, cardId: string, tagNames: string[]): Promise<void> => {
  for (const tagName of tagNames) {
    // Get or create tag
    let tagResult = await pool.query('SELECT id FROM tags WHERE user_id = $1 AND name = $2', [
      userId,
      tagName,
    ]);

    let tagId: string;
    if (tagResult.rows.length === 0) {
      tagId = uuidv4();
      await pool.query(
        'INSERT INTO tags (id, user_id, name, created_at) VALUES ($1, $2, $3, NOW())',
        [tagId, userId, tagName]
      );
    } else {
      tagId = tagResult.rows[0].id;
    }

    // Add card-tag association
    try {
      await pool.query(
        'INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cardId, tagId]
      );
    } catch (err) {
      // Ignore duplicate key error
    }
  }
  // Trigger incremental graph update after adding tags (boosts edges)
  triggerIncrementalGraphUpdate(cardId, userId);
};

/**
 * Remove a tag from a card
 */
export const removeTagFromCard = async (cardId: string, tagId: string, userId: string): Promise<boolean> => {
  // Verify tag belongs to user
  const tagCheck = await pool.query('SELECT id FROM tags WHERE id = $1 AND user_id = $2', [
    tagId,
    userId,
  ]);

  if (tagCheck.rows.length === 0) {
    return false;
  }

  const result = await pool.query('DELETE FROM card_tags WHERE card_id = $1 AND tag_id = $2', [
    cardId,
    tagId,
  ]);

  return result.rowCount! > 0;
};

/**
 * Get tags for a card
 */
export const getCardTags = async (cardId: string, userId: string): Promise<any[]> => {
  const result = await pool.query(
    `SELECT t.* FROM tags t
     JOIN card_tags ct ON t.id = ct.tag_id
     WHERE ct.card_id = $1 AND t.user_id = $2`,
    [cardId, userId]
  );

  return result.rows;
};

/**
 * Set (replace) ALL tags on a card atomically.
 * Creates tags that don't exist yet, then links them.
 */
export const setCardTags = async (
  userId: string,
  cardId: string,
  tagNames: string[]
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Remove all existing card_tags entries for this card
    await client.query(
      `DELETE FROM card_tags WHERE card_id = $1`,
      [cardId]
    );

    // 2. For each tag name: get-or-create the tag, then link it
    for (const name of tagNames) {
      const trimmed = name.trim();
      if (!trimmed) continue;

      // Upsert tag
      const tagRes = await client.query(
        `INSERT INTO tags (id, user_id, name, created_at)
         VALUES (gen_random_uuid(), $1, $2, NOW())
         ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [userId, trimmed]
      );
      const tagId = tagRes.rows[0].id;

      // Link tag to card
      await client.query(
        `INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [cardId, tagId]
      );
    }

    await client.query('COMMIT');
    // Trigger incremental graph update after updating tags
    triggerIncrementalGraphUpdate(cardId, userId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Create card from an uploaded PDF file (Phase 11)
 */
export const createPdfCard = async (
  userId: string,
  data: {
    filePath: string;
    originalName: string;
    tags?: string[];
  }
): Promise<Card> => {
  let extraction;
  try {
    extraction = await extractFromPdf(data.filePath);
  } finally {
    // Always clean up the temp file, even if extraction fails
    cleanupTempFile(data.filePath);
  }

  const cleanedText = extraction.text.replace(/\s+/g, ' ').trim();

  const card = await createCard(userId, {
    title: extractSmartTitle(cleanedText, data.originalName, extraction.metadata.title),
    content_type: 'pdf',
    raw_content: data.originalName,
    extracted_text: extraction.text.replace(/\s+/g, ' ').trim(), // Clean text
    metadata: {
      page_count: extraction.page_count,
      author: extraction.metadata.author,
      created_date: extraction.metadata.created_date,
      file_size: extraction.metadata.file_size,
      original_name: data.originalName,
    },
    tags: data.tags,
  });

  return card;
};

/**
 * Create card from an uploaded DOCX file (Phase 12)
 */
export const createDocxCard = async (
  userId: string,
  data: {
    filePath: string;
    originalName: string;
    tags?: string[];
  }
): Promise<Card> => {
  let extraction;
  try {
    extraction = await extractFromDocx(data.filePath);
  } finally {
    // Always clean up the temp file
    cleanupTempFile(data.filePath);
  }

  const cleanedDocxText = extraction.text.replace(/\s+/g, ' ').trim();

  const card = await createCard(userId, {
    title: extractSmartTitle(cleanedDocxText, data.originalName, extraction.metadata.title),
    content_type: 'docx',
    raw_content: data.originalName,
    extracted_text: cleanedDocxText,
    metadata: {
      word_count: extraction.word_count,
      file_size: extraction.metadata.file_size,
      original_name: data.originalName,
    },
    tags: data.tags,
  });


  return card;
};

/**
 * Create card from social link (Phase 10)
 */
export const createSocialLinkCard = async (
  userId: string,
  data: {
    url: string;
    tags?: string[];
  }
): Promise<Card> => {
  const metadata = await extractSocialMetadata(data.url);

  const card = await createCard(userId, {
    title: (metadata.title || 'Untitled').trim() === 'Untitled' ? 'Web Link' : (metadata.title || 'Web Link'),
    content_type: 'social_link',
    raw_content: data.url,
    extracted_text: `${metadata.title || ''}\n${metadata.og_description || ''}`.replace(/\s+/g, ' ').trim(),
    metadata: {
      url: data.url,
      platform: metadata.platform,
      og_title: metadata.og_title,
      og_description: metadata.og_description,
      og_image: metadata.og_image,
    },
    tags: data.tags,
  });

  return card;
};

/**
 * Completely delete a card from the database and graph.
 */
export const deleteCard = async (cardId: string, userId: string): Promise<boolean> => {
  try {
    // 1. Verify card ownership and existence
    const result = await pool.query(
      "SELECT id FROM cards WHERE id = $1 AND user_id = $2",
      [cardId, userId]
    );

    if (result.rows.length === 0) {
      console.warn(`[CardService] Attempted to delete non-existent or unauthorized card: ${cardId}`);
      return false;
    }

    console.log(`[CardService] Deleting card ${cardId} for user ${userId}...`);

    // 2. Notify ML service to remove graph knowledge (edges)
    // Even though DB has ON DELETE CASCADE, we call this to ensure
    // ML service is aware of the deletion if it has any local state.
    await deleteCardEdges(cardId);

    // 3. Delete the card itself
    // ON DELETE CASCADE handles tags and graph_edges in the DB
    await pool.query("DELETE FROM cards WHERE id = $1", [cardId]);

    console.log(`[CardService] Card ${cardId} deleted successfully.`);
    return true;
  } catch (err: any) {
    console.error(`[CardService] Error deleting card: ${err.message}`);
    throw err;
  }
};
