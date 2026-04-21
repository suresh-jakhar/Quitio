import { v4 as uuidv4 } from 'uuid';
import pool from '../utils/db';

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: Date;
}

/**
 * Get all tags for a user
 */
export const getUserTags = async (userId: string): Promise<Tag[]> => {
  const result = await pool.query('SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC', [
    userId,
  ]);

  return result.rows;
};

/**
 * Get a single tag by ID
 */
export const getTagById = async (tagId: string, userId: string): Promise<Tag | null> => {
  const result = await pool.query('SELECT * FROM tags WHERE id = $1 AND user_id = $2', [
    tagId,
    userId,
  ]);

  return result.rows[0] || null;
};

/**
 * Create a new tag
 */
export const createTag = async (userId: string, tagName: string): Promise<Tag> => {
  const tagId = uuidv4();

  // Check if tag already exists
  const existing = await pool.query('SELECT id FROM tags WHERE user_id = $1 AND name = $2', [
    userId,
    tagName,
  ]);

  if (existing.rows.length > 0) {
    const err = new Error(`Tag '${tagName}' already exists`);
    (err as any).statusCode = 409;
    throw err;
  }

  const result = await pool.query(
    'INSERT INTO tags (id, user_id, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [tagId, userId, tagName]
  );

  return result.rows[0];
};

/**
 * Delete a tag
 */
export const deleteTag = async (tagId: string, userId: string): Promise<boolean> => {
  const result = await pool.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [
    tagId,
    userId,
  ]);

  return result.rowCount! > 0;
};

/**
 * Get card count for a tag
 */
export const getTagCardCount = async (tagId: string): Promise<number> => {
  const result = await pool.query('SELECT COUNT(*) FROM card_tags WHERE tag_id = $1', [tagId]);

  return parseInt(result.rows[0].count);
};

/**
 * Get all tags with their card counts
 */
export const getUserTagsWithCounts = async (userId: string): Promise<(Tag & { cardCount: number })[]> => {
  const result = await pool.query(
    `SELECT t.*, COUNT(ct.card_id) as "cardCount"
     FROM tags t
     LEFT JOIN card_tags ct ON t.id = ct.tag_id
     WHERE t.user_id = $1
     GROUP BY t.id
     ORDER BY t.name ASC`,
    [userId]
  );

  return result.rows;
};
