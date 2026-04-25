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
  const startTime = Date.now();
  try {
    const userId = req.userId!;
    console.log(`[DEBUG-BACKEND] [SmartArrange] Fetching arrangement for user: ${userId}`);

    const forceRefresh = req.query.forceRefresh === 'true';
    const forceRebuild = req.query.forceRebuild === 'true';

    const mlStart = Date.now();
    const response = await axios.post(`${ML_SERVICE_URL}/arrange/smart-arrange`, {
      user_id: userId,
      force_refresh: forceRefresh,
      force_rebuild_graph: forceRebuild,
      cross_cluster_threshold: 0.55
    }, {
      timeout: 120000 // Further increase timeout for full rebuilds
    });
    
    const mlDuration = Date.now() - mlStart;
    const totalDuration = Date.now() - startTime;
    
    const clusters = response.data.clusters || [];
    console.log(`[DEBUG-BACKEND] [SmartArrange] ML Service responded in ${mlDuration}ms. Clusters found: ${clusters.length}`);
    console.log(`[DEBUG-BACKEND] [SmartArrange] Total backend duration: ${totalDuration}ms`);

    return res.status(200).json(response.data);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[DEBUG-BACKEND] [SmartArrange] ERROR after ${duration}ms: ${err.message}`);
    if (err.response) {
      console.error(`[DEBUG-BACKEND] [SmartArrange] ML Service Response Error:`, err.response.data);
    }
    next(err);
  }
});

export default router;
