import { Router, Request, Response, NextFunction } from 'express';
import { signup, signin } from '../services/authService';
import { validateEmail, validatePassword } from '../utils/validators';
import { SignupRequest, SigninRequest } from '../types/User';

const router = Router();

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as SignupRequest;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        code: 400,
        message: 'Email and password required',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid email format',
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        code: 400,
        message: passwordValidation.error,
      });
    }

    // Signup
    const result = await signup(email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as SigninRequest;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        code: 400,
        message: 'Email and password required',
      });
    }

    // Signin
    const result = await signin(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  // Logout is stateless with JWT; client discards token
  res.status(200).json({
    message: 'Logged out successfully',
  });
});

export default router;
