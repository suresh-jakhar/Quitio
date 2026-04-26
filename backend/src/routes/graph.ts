import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';
import config from '../config';

const router = Router();
const ML_SERVICE_URL = config.ML_SERVICE_URL;

/**
 * POST /graph/build
 * Trigger a rebuild of the knowledge graph for the authenticated user.
 */
router.post('/build', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { semantic_threshold = 0.5, top_k = null } = req.body;
    
    console.log(`[Backend] Triggering graph build for user ${userId} (threshold: ${semantic_threshold})...`);
    
    const response = await axios.post(`${ML_SERVICE_URL}/graph/build`, {
      user_id: userId,
      semantic_threshold,
      top_k
    });
    
    return res.status(202).json({
      message: 'Graph construction started in background',
      user_id: userId
    });
  } catch (err: any) {
    console.error(`[Backend] Error triggering graph build: ${err.message}`);
    next(err);
  }
});

/**
 * GET /graph/neighbors/:cardId
 * Retrieve related cards for a specific card using multi-hop traversal.
 */
router.get('/neighbors/:cardId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params as { cardId: string };
    const { depth = 2, limit = 10 } = req.query;

    // Validate UUID format to prevent arbitrary strings reaching ML service
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof cardId !== 'string' || !UUID_REGEX.test(cardId)) {
      return res.status(400).json({ code: 400, message: 'Invalid card ID format' });
    }
    
    console.log(`[Backend] Fetching neighbors for card ${cardId} (depth: ${depth})...`);
    
    const response = await axios.get(`${ML_SERVICE_URL}/graph/neighbors/${cardId}`, {
      params: { depth, limit },
      timeout: 15000,
    });
    
    return res.status(200).json(response.data);
  } catch (err: any) {
    console.error(`[Backend] Error fetching neighbors: ${err.message}`);
    next(err);
  }
});

export default router;
