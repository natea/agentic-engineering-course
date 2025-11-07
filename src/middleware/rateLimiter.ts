import rateLimit from 'express-rate-limit';

// Use higher limit in test environment to avoid interference between tests
const isTest = process.env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 100 : 5, // Higher limit for tests
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for specific test patterns if needed
    return false;
  }
});
