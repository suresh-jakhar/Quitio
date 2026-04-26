import { Router, Response } from 'express';
import { queryRag } from '../services/mlService';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /rag/query
 * @desc    Ask a question to the AI assistant (RAG)
 * @access  Private
 */
router.post('/query', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { query, topK } = req.body;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in request' });
    }

    const result = await queryRag(query, userId, topK);
    res.json(result);
  } catch (err: any) {
    console.error(`[RAG-Route] Error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to process RAG query' });
  }
});

export default router;
