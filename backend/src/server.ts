import express, { Express } from 'express';
import cors from 'cors';
import config from './config';
import errorHandler from './middleware/errorHandler';
import authMiddleware from './middleware/auth';
import authRoutes from './routes/auth';
import cardRoutes from './routes/cards';
import tagRoutes from './routes/tags';
import searchRoutes from './routes/search';
import graphRoutes from './routes/graph';
import arrangeRoutes from './routes/arrange';
import ragRoutes from './routes/rag';
import database from './utils/database';

import { securityMiddleware, limiter, authLimiter } from './middleware/security';

const app: Express = express();

// Security Middleware
app.use(securityMiddleware);
app.use('/api/', limiter); // Apply rate limit to all /api routes
app.use('/api/auth/', authLimiter); // Stricter limit for auth

// Middleware
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[DEBUG-SERVER] ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/cards', authMiddleware, cardRoutes);
app.use('/api/tags', authMiddleware, tagRoutes);
app.use('/api/search', authMiddleware, searchRoutes); // Phase 17: keyword search
app.use('/api/graph', authMiddleware, graphRoutes); // Phase 25+: Knowledge Graph
app.use('/api/arrange', authMiddleware, arrangeRoutes); // Smart Arrange
app.use('/api/rag', authMiddleware, ragRoutes); // Phase 28: RAG

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT;

// Start server immediately to ensure port is held
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server listening on http://localhost:${PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
});

// Initialize database in background
(async () => {
  try {
    console.log('📦 Initializing database...');
    // Run migrations
    await database.runPendingMigrations();

    // Health check
    const isHealthy = await database.healthCheck();
    if (!isHealthy) {
      console.warn('⚠ Database health check failed. Please check your connection.');
    } else {
      console.log('✓ Database connected and healthy');
    }

    // Show stats
    await database.getStats();
  } catch (err: any) {
    console.error('Failed to initialize database:', err.message);
    // Don't kill the server, just log the error
  }
})();

export default app;