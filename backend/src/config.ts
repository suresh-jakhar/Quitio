import dotenv from 'dotenv';

dotenv.config();

interface Config {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  CORS_ORIGIN: string;
  API_URL: string;
  ML_SERVICE_URL: string;
}

const config: Config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  API_URL: process.env.API_URL || 'http://localhost:5000',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
};

// Validate required variables
if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

if (!config.JWT_SECRET || config.JWT_SECRET === 'change-me-in-production') {
  console.warn('⚠️  WARNING: JWT_SECRET is not set securely. Set a strong secret in production.');
}

export default config;

