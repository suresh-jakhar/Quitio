import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../utils/db';
import config from '../config';
import { User, AuthResponse, SignupRequest } from '../types/User';

const SALT_ROUNDS = 10;

export const signup = async (email: string, password: string): Promise<AuthResponse> => {
  const normalizedEmail = email.trim().toLowerCase();
  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (existingUser.rows.length > 0) {
    const err = new Error('Email already registered');
    (err as any).statusCode = 409;
    throw err;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const userId = uuidv4();
  const result = await pool.query(
    'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, email',
    [userId, normalizedEmail, passwordHash]
  );

  const user = result.rows[0];
  const token = generateJWT(user.id);

  return {
    user_id: user.id,
    email: user.email,
    token,
  };
};

export const signin = async (email: string, password: string): Promise<AuthResponse> => {
  const normalizedEmail = email.trim().toLowerCase();
  // Find user
  const result = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid email or password');
    (err as any).statusCode = 401;
    throw err;
  }

  const user = result.rows[0];

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const err = new Error('Invalid email or password');
    (err as any).statusCode = 401;
    throw err;
  }

  const token = generateJWT(user.id);

  return {
    user_id: user.id,
    email: user.email,
    token,
  };
};

export const generateJWT = (userId: string): string => {
  return jwt.sign(
    { userId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRATION } as any
  );
};

export const verifyJWT = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    return decoded;
  } catch (err) {
    const error = new Error('Invalid or expired token');
    (error as any).statusCode = 401;
    throw error;
  }
};
