import { v4 as uuidv4 } from 'uuid';
import pool from '../utils/db';
import { AuthRequest } from '../middleware/auth';

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
 * Get all cards for a user (paginated)
 */
export const getUserCards = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ cards: Card[]; total: number; page: number }> => {
  const offset = (page - 1) * limit;

  const countResult = await pool.query('SELECT COUNT(*) FROM cards WHERE user_id = $1', [userId]);
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    cards: result.rows,
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

  return result.rows[0] || null;
};

/**
 * Delete a card
 */
export const deleteCard = async (cardId: string, userId: string): Promise<boolean> => {
  const result = await pool.query('DELETE FROM cards WHERE id = $1 AND user_id = $2', [
    cardId,
    userId,
  ]);

  return result.rowCount! > 0;
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
