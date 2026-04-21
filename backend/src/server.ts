import express, { Express } from 'express';
import cors from 'cors';
import config from './config';
import errorHandler from './middleware/errorHandler';
import authRoutes from './routes/auth';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/auth', authRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;
