import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// Rate limiting to prevent brute-force and basic DDoS
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    code: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Strict rate limit for authentication routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 attempts per hour
  message: {
    code: 429,
    message: 'Too many authentication attempts, please try again after an hour',
  },
});

// Simple input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Basic XSS prevention: remove <script> tags and other common vectors
        obj[key] = obj[key]
          .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
          .replace(/on\w+="[^"]*"/gim, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

export const securityMiddleware = [
  helmet(), // Secure HTTP headers
  sanitizeInput,
];
