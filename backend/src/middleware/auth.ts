import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../services/authService';

export interface AuthRequest extends Request {
  userId?: string;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyJWT(token);
    req.userId = decoded.userId;
    next();
  } catch (err: any) {
    return res.status(401).json({
      code: 401,
      message: err.message || 'Unauthorized',
    });
  }
};

export default authMiddleware;
