import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
}

/**
 * Centralized error handler middleware
 */
const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[Error] ${statusCode}: ${message}`);

  res.status(statusCode).json({
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
