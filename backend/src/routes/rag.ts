import { Router, Response, NextFunction } from 'express';
import { queryRag } from '../services/mlService';
import { AuthRequest } from '../middleware/auth';

const router = Router();
console.log('[RAG-Router] Initialized');

/**
 * @route   POST /rag/query
 * @desc    Ask a question to the AI assistant (RAG)
 * @access  Private
 */
router.post('/query', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { query, topK } = req.body;
    const userId = req.userId;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ code: 400, message: 'Query is required and must be a non-empty string' });
    }

    if (!userId) {
      return res.status(401).json({ code: 401, message: 'User ID not found in request' });
    }

    // Validate topK: must be a positive integer between 1 and 20
    const parsedTopK = topK !== undefined ? parseInt(String(topK), 10) : 5;
    if (isNaN(parsedTopK) || parsedTopK < 1 || parsedTopK > 20) {
      return res.status(400).json({ code: 400, message: 'topK must be an integer between 1 and 20' });
    }

    console.log(`[DEBUG-RAG] Incoming query from user ${userId}: "${query}"`);
    const result = await queryRag(query.trim(), userId, parsedTopK);
    console.log(`[DEBUG-RAG] Result generated for query: "${query}"`);
    res.json(result);
  } catch (err: any) {
    console.error(`[RAG-Route] Error: ${err.message}`);
    next(err);
  }
});

export default router;
