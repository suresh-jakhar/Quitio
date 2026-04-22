import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../utils/db';

const router = Router();

/**
 * GET /search?q=<query>&tags=<id1,id2>&mode=AND|OR
 *
 * Keyword search across card titles and tag names (Phase 17).
 * Optionally constrained to cards matching selected tag filters from Phase 16.
 *
 * SQL strategy:
 *   - ILIKE for case-insensitive substring match on title and tag names
 *   - LEFT JOIN so cards without tags are still found by title
 *   - DISTINCT to prevent duplicate cards when multiple tags match
 *   - Optional AND/OR tag pre-filter applied before keyword search
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rawQuery = Array.isArray(req.query.q)
      ? (req.query.q as string[])[0]
      : (req.query.q as string | undefined);

    const q = rawQuery?.trim() ?? '';

    if (!q) {
      // Empty query — return empty results; frontend falls back to card grid
      return res.status(200).json({ results: [], query: '' });
    }

    // Optional tag filter (Phase 16 integration)
    const tagsParam = Array.isArray(req.query.tags)
      ? (req.query.tags as string[])[0]
      : (req.query.tags as string | undefined);

    const modeParam = Array.isArray(req.query.mode)
      ? (req.query.mode as string[])[0]
      : (req.query.mode as string | undefined);

    const filterMode: 'AND' | 'OR' =
      modeParam?.toUpperCase() === 'AND' ? 'AND' : 'OR';

    let tagIds: string[] = [];
    if (tagsParam && tagsParam !== 'undefined' && tagsParam !== 'null' && tagsParam !== '') {
      tagIds = tagsParam.split(',').map((id) => id.trim()).filter(Boolean);
    }

    // ── Build query ────────────────────────────────────────────────────────────
    // We search against: title, extracted_text (first 500 chars), and tag names.
    // Cards are returned with their associated tags for rendering.

    const searchPattern = `%${q}%`;
    const queryParams: any[] = [req.userId!, searchPattern];

    let tagFilterClause = '';

    if (tagIds.length > 0) {
      const placeholders = tagIds.map((_, i) => `$${i + 3}`).join(', ');
      queryParams.push(...tagIds);

      if (filterMode === 'AND') {
        // Restrict to cards that have ALL selected tags, then keyword-search those
        tagFilterClause = `
          AND c.id IN (
            SELECT ct2.card_id FROM card_tags ct2
            WHERE ct2.tag_id IN (${placeholders})
            GROUP BY ct2.card_id
            HAVING COUNT(DISTINCT ct2.tag_id) = ${tagIds.length}
          )
        `;
      } else {
        // OR: restrict to cards that have ANY of the selected tags
        tagFilterClause = `
          AND c.id IN (
            SELECT DISTINCT ct2.card_id FROM card_tags ct2
            WHERE ct2.tag_id IN (${placeholders})
          )
        `;
      }
    }

    const searchQuery = `
      SELECT DISTINCT c.id, c.title, c.content_type, c.metadata, c.raw_content,
             c.extracted_text, c.created_at, c.updated_at
      FROM cards c
      LEFT JOIN card_tags ct ON c.id = ct.card_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.user_id = $1
        ${tagFilterClause}
        AND (
          c.title ILIKE $2
          OR t.name ILIKE $2
          OR LEFT(c.extracted_text, 500) ILIKE $2
        )
      ORDER BY c.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(searchQuery, queryParams);

    // Fetch tags for each result card
    const resultsWithTags = await Promise.all(
      result.rows.map(async (card) => {
        const tagsResult = await pool.query(
          `SELECT t.id, t.name FROM tags t
           JOIN card_tags ct ON t.id = ct.tag_id
           WHERE ct.card_id = $1 AND t.user_id = $2`,
          [card.id, req.userId!]
        );
        return { ...card, tags: tagsResult.rows };
      })
    );

    res.status(200).json({
      results: resultsWithTags,
      query: q,
      count: resultsWithTags.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
