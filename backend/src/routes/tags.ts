import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as tagService from '../services/tagService';
import { validateTagName } from '../utils/validators';

const router = Router();

/**
 * GET /tags - Get all user's tags with card counts
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tags = await tagService.getUserTagsWithCounts(req.userId!);

    res.status(200).json({ tags });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tags - Create a new tag
 */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    const validation = validateTagName(name);
    if (!validation.valid) {
      return res.status(400).json({
        code: 400,
        message: validation.error,
      });
    }

    const tag = await tagService.createTag(req.userId!, name);

    res.status(201).json(tag);
  } catch (err: any) {
    if (err.statusCode === 409) {
      return res.status(409).json({
        code: 409,
        message: err.message,
      });
    }
    next(err);
  }
});

/**
 * GET /tags/:id - Get a single tag
 */
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tagId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const tag = await tagService.getTagById(tagId, req.userId!);

    if (!tag) {
      return res.status(404).json({
        code: 404,
        message: 'Tag not found',
      });
    }

    const cardCount = await tagService.getTagCardCount(tag.id);

    res.status(200).json({
      ...tag,
      cardCount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /tags/:id - Delete a tag
 */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tagId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const tag = await tagService.getTagById(tagId, req.userId!);

    if (!tag) {
      return res.status(404).json({
        code: 404,
        message: 'Tag not found',
      });
    }

    await tagService.deleteTag(tagId, req.userId!);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
