import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as cardService from '../services/cardService';
import { validateCard, validateCardUpdate } from '../utils/validators';

const router = Router();

/**
 * POST /cards/ingest/social-link/preview - Get metadata preview (Phase 10)
 */
router.post('/ingest/social-link/preview', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        code: 400,
        message: 'URL is required',
      });
    }

    const { extractSocialMetadata } = await import('../extractors/socialLinkExtractor');
    const metadata = await extractSocialMetadata(url);

    res.status(200).json(metadata);
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch URL') || err.message?.includes('timeout')) {
      return res.status(400).json({
        code: 400,
        message: 'Failed to fetch URL. Please check the URL and try again.',
      });
    }
    next(err);
  }
});

/**
 * POST /cards/ingest/social-link - Create card from social link (Phase 10)
 */
router.post('/ingest/social-link', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { url, tags } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        code: 400,
        message: 'URL is required and must be a string',
      });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({
        code: 400,
        message: 'URL must start with http:// or https://',
      });
    }

    const card = await cardService.createSocialLinkCard(req.userId!, {
      url,
      tags: Array.isArray(tags) ? tags : [],
    });

    // Fetch tags for response
    const cardTags = await cardService.getCardTags(card.id, req.userId!);

    res.status(201).json({
      ...card,
      tags: cardTags,
    });
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch URL') || err.message?.includes('timeout')) {
      return res.status(400).json({
        code: 400,
        message: 'Failed to fetch URL. Please check the URL and try again.',
      });
    }
    next(err);
  }
});

/**
 * GET /cards - Get all user's cards (paginated)
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pageParam = Array.isArray(req.query.page) ? (req.query.page as string[])[0] : (req.query.page as string);
    const limitParam = Array.isArray(req.query.limit) ? (req.query.limit as string[])[0] : (req.query.limit as string);

    const page = parseInt(pageParam || '1') || 1;
    const limit = parseInt(limitParam || '20') || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid pagination parameters',
      });
    }

    const result = await cardService.getUserCards(req.userId!, page, limit);

    res.status(200).json({
      cards: result.cards,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /cards - Create a new card
 */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = validateCard(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        code: 400,
        message: validation.error,
      });
    }

    const card = await cardService.createCard(req.userId!, req.body);

    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /cards/:id - Get a single card
 */
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const card = await cardService.getCardById(cardId, req.userId!);

    if (!card) {
      return res.status(404).json({
        code: 404,
        message: 'Card not found',
      });
    }

    res.status(200).json(card);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /cards/:id - Update a card
 */
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const validation = validateCardUpdate(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        code: 400,
        message: validation.error,
      });
    }

    const card = await cardService.getCardById(cardId, req.userId!);
    if (!card) {
      return res.status(404).json({
        code: 404,
        message: 'Card not found',
      });
    }

    const updatedCard = await cardService.updateCard(cardId, req.userId!, req.body);

    res.status(200).json(updatedCard);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /cards/:id - Delete a card
 */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const card = await cardService.getCardById(cardId, req.userId!);
    if (!card) {
      return res.status(404).json({
        code: 404,
        message: 'Card not found',
      });
    }

    await cardService.deleteCard(cardId, req.userId!);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /cards/:id/tags - Get tags for a card
 */
router.get('/:id/tags', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const card = await cardService.getCardById(cardId, req.userId!);
    if (!card) {
      return res.status(404).json({
        code: 404,
        message: 'Card not found',
      });
    }

    const tags = await cardService.getCardTags(cardId, req.userId!);

    res.status(200).json({ tags });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /cards/:id/tags - Add tags to a card
 */
router.post('/:id/tags', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'Tags array required and must not be empty',
      });
    }

    const card = await cardService.getCardById(cardId, req.userId!);
    if (!card) {
      return res.status(404).json({
        code: 404,
        message: 'Card not found',
      });
    }

    const invalidTags = tags.filter((t: any) => typeof t !== 'string' || t.trim().length === 0);
    if (invalidTags.length > 0) {
      return res.status(400).json({
        code: 400,
        message: 'All tags must be non-empty strings',
      });
    }

    await cardService.addTagsToCard(req.userId!, cardId, tags);

    const updatedTags = await cardService.getCardTags(cardId, req.userId!);

    res.status(200).json({ tags: updatedTags });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /cards/:id/tags/:tagId - Remove a tag from a card
 */
router.delete('/:id/tags/:tagId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tagId = Array.isArray(req.params.tagId) ? req.params.tagId[0] : req.params.tagId;

    const card = await cardService.getCardById(cardId, req.userId!);
    if (!card) {
      return res.status(404).json({
        code: 404,
        message: 'Card not found',
      });
    }

    const success = await cardService.removeTagFromCard(cardId, tagId, req.userId!);

    if (!success) {
      return res.status(404).json({
        code: 404,
        message: 'Tag not found or does not belong to this card',
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
