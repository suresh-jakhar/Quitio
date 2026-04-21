import dotenv from 'dotenv';

dotenv.config();

interface Config {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
}

const config: Config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
};

export default config;
