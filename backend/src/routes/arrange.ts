import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';
import config from '../config';

const router = Router();
const ML_SERVICE_URL = config.ML_SERVICE_URL;

/**
 * GET /arrange/smart
 * Returns cards grouped into thematic cluster rows using graph + tag data.
 */
router.get('/smart', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    console.log(`[Backend] Fetching smart arrangement for user ${userId}...`);

    const response = await axios.post(`${ML_SERVICE_URL}/arrange/smart-arrange`, {
      user_id: userId,
      cross_cluster_threshold: 0.55
    });

    return res.status(200).json(response.data);
  } catch (err: any) {
    console.error(`[Backend] Smart arrange error: ${err.message}`);
    next(err);
  }
});

export default router;
