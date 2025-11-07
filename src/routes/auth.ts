import { Router, Request, Response } from 'express';
import * as authService from '../services/authService';
import { authLimiter } from '../middleware/rateLimiter';
import { isValidEmail, isValidPassword } from '../utils/validation';
import { RegisterRequest, LoginRequest, RefreshRequest } from '../types/auth';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as RegisterRequest;

    // Validate input
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!password || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Register user
    const result = await authService.register(email, password);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already exists') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Login user
    const result = await authService.login(email, password);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as RefreshRequest;

    // Validate input
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Refresh token
    const result = await authService.refresh(refreshToken);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
