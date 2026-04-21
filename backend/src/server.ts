import express, { Express } from 'express';
import cors from 'cors';
import config from './config';
import errorHandler from './middleware/errorHandler';
import authMiddleware from './middleware/auth';
import authRoutes from './routes/auth';
import cardRoutes from './routes/cards';
import tagRoutes from './routes/tags';
import database from './utils/database';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/auth', authRoutes);

// Protected routes (require authentication)
app.use('/cards', authMiddleware, cardRoutes);
app.use('/tags', authMiddleware, tagRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT;

// Initialize database and start server
(async () => {
  try {
    // Run migrations
    await database.runPendingMigrations();

    // Health check
    const isHealthy = await database.healthCheck();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }

    // Show stats
    await database.getStats();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`Environment: ${config.NODE_ENV}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();

export default app;
