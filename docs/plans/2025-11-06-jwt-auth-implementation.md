# JWT Authentication System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a JWT authentication system with register, login, and refresh endpoints for a course module example.

**Architecture:** Service-oriented Express + TypeScript application with routes handling HTTP, AuthService containing business logic, and Prisma managing SQLite database.

**Tech Stack:** Express, TypeScript, Prisma (SQLite), bcrypt, jsonwebtoken, express-rate-limit, Jest, Supertest

---

## Task 1: Project Initialization and Dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize npm project**

Run: `npm init -y`
Expected: `package.json` created

**Step 2: Install production dependencies**

Run:
```bash
npm install express dotenv bcrypt jsonwebtoken express-rate-limit @prisma/client
```

Expected: Dependencies added to package.json

**Step 3: Install TypeScript and dev dependencies**

Run:
```bash
npm install -D typescript @types/node @types/express @types/bcrypt @types/jsonwebtoken ts-node-dev jest @types/jest ts-jest supertest @types/supertest prisma
```

Expected: Dev dependencies added to package.json

**Step 4: Create TypeScript configuration**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 5: Create environment example file**

Create `.env.example`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
PORT=3000
```

**Step 6: Create .gitignore**

Create `.gitignore`:
```
node_modules/
dist/
.env
*.db
*.db-journal
coverage/
.DS_Store
```

**Step 7: Add npm scripts to package.json**

Modify `package.json` scripts section:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "migrate": "prisma migrate dev"
  }
}
```

**Step 8: Create .env file**

Run: `cp .env.example .env`
Expected: `.env` file created

**Step 9: Commit initial setup**

Run:
```bash
git add package.json package-lock.json tsconfig.json .env.example .gitignore
git commit -m "feat: initialize project with TypeScript and dependencies"
```

Expected: Commit created

---

## Task 2: Prisma Setup and Database Schema

**Files:**
- Create: `prisma/schema.prisma`

**Step 1: Initialize Prisma**

Run: `npx prisma init --datasource-provider sqlite`
Expected: `prisma/schema.prisma` created

**Step 2: Define User model in schema**

Edit `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Step 3: Run initial migration**

Run: `npx prisma migrate dev --name init`
Expected: Migration created, `dev.db` file created

**Step 4: Generate Prisma Client**

Run: `npx prisma generate`
Expected: Prisma Client generated in node_modules

**Step 5: Commit database schema**

Run:
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add User model and initial database migration"
```

Expected: Commit created

---

## Task 3: TypeScript Types and Interfaces

**Files:**
- Create: `src/types/auth.ts`

**Step 1: Create types directory**

Run: `mkdir -p src/types`

**Step 2: Define authentication types**

Create `src/types/auth.ts`:
```typescript
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
  };
}

export interface RefreshResponse {
  accessToken: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
}

export interface RefreshTokenPayload {
  userId: number;
}
```

**Step 3: Commit types**

Run:
```bash
git add src/types/auth.ts
git commit -m "feat: add TypeScript types for authentication"
```

Expected: Commit created

---

## Task 4: JWT Utility Functions

**Files:**
- Create: `src/utils/jwt.ts`

**Step 1: Create utils directory**

Run: `mkdir -p src/utils`

**Step 2: Write failing test for token generation**

Create `tests/utils/jwt.test.ts`:
```typescript
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../src/utils/jwt';

describe('JWT Utils', () => {
  const mockUser = { id: 1, email: 'test@example.com' };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockUser.id, mockUser.email);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockUser.id);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode a valid access token', () => {
      const token = generateAccessToken(mockUser.id, mockUser.email);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const token = generateRefreshToken(mockUser.id);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(mockUser.id);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow();
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- tests/utils/jwt.test.ts`
Expected: FAIL with "Cannot find module '../../src/utils/jwt'"

**Step 4: Configure Jest**

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

**Step 5: Run test again**

Run: `npm test -- tests/utils/jwt.test.ts`
Expected: FAIL with "Cannot find module '../../src/utils/jwt'"

**Step 6: Implement JWT utility functions**

Create `src/utils/jwt.ts`:
```typescript
import jwt from 'jsonwebtoken';
import { TokenPayload, RefreshTokenPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export function generateAccessToken(userId: number, email: string): string {
  const payload: TokenPayload = { userId, email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function generateRefreshToken(userId: number): string {
  const payload: RefreshTokenPayload = { userId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
}
```

**Step 7: Run tests to verify they pass**

Run: `npm test -- tests/utils/jwt.test.ts`
Expected: All tests PASS

**Step 8: Commit JWT utilities**

Run:
```bash
git add src/utils/jwt.ts tests/utils/jwt.test.ts jest.config.js
git commit -m "feat: add JWT token generation and verification utilities"
```

Expected: Commit created

---

## Task 5: Authentication Service

**Files:**
- Create: `src/services/authService.ts`
- Create: `tests/services/authService.test.ts`

**Step 1: Create services directory**

Run: `mkdir -p src/services`

**Step 2: Write failing test for register function**

Create `tests/services/authService.test.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import * as authService from '../../src/services/authService';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file::memory:?cache=shared',
    },
  },
});

beforeAll(async () => {
  // Run migrations on in-memory database
  const { execSync } = require('child_process');
  execSync('DATABASE_URL="file::memory:?cache=shared" npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file::memory:?cache=shared' },
  });
});

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      const result = await authService.register('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBeTruthy();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw error if email already exists', async () => {
      await authService.register('test@example.com', 'password123');

      await expect(
        authService.register('test@example.com', 'password456')
      ).rejects.toThrow('Email already exists');
    });

    it('should hash the password', async () => {
      await authService.register('test@example.com', 'password123');
      const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });

      expect(user?.passwordHash).not.toBe('password123');
      expect(user?.passwordHash.length).toBeGreaterThan(20);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register('test@example.com', 'password123');
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw error for non-existent email', async () => {
      await expect(
        authService.login('wrong@example.com', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for wrong password', async () => {
      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('should generate new access token from valid refresh token', async () => {
      const registerResult = await authService.register('test@example.com', 'password123');
      const result = await authService.refresh(registerResult.refreshToken);

      expect(result.accessToken).toBeTruthy();
      expect(result.accessToken).not.toBe(registerResult.accessToken);
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(
        authService.refresh('invalid-token')
      ).rejects.toThrow();
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- tests/services/authService.test.ts`
Expected: FAIL with "Cannot find module '../../src/services/authService'"

**Step 4: Implement authentication service**

Create `src/services/authService.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthResponse, RefreshResponse } from '../types/auth';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function register(email: string, password: string): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Find user
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Generate new access token
  const accessToken = generateAccessToken(user.id, user.email);

  return { accessToken };
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- tests/services/authService.test.ts`
Expected: Tests may fail due to database setup - this is expected for now

**Step 6: Update test setup for in-memory database**

Note: The in-memory SQLite setup in tests may need adjustment. For simplicity, we'll use a test database file instead.

Modify `tests/services/authService.test.ts` setup:
```typescript
import { PrismaClient } from '@prisma/client';
import * as authService from '../../src/services/authService';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

**Step 7: Run tests again**

Run: `npm test -- tests/services/authService.test.ts`
Expected: All tests PASS

**Step 8: Commit authentication service**

Run:
```bash
git add src/services/authService.ts tests/services/authService.test.ts
git commit -m "feat: implement authentication service with register, login, and refresh"
```

Expected: Commit created

---

## Task 6: Rate Limiting Middleware

**Files:**
- Create: `src/middleware/rateLimiter.ts`

**Step 1: Create middleware directory**

Run: `mkdir -p src/middleware`

**Step 2: Implement rate limiter middleware**

Create `src/middleware/rateLimiter.ts`:
```typescript
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Step 3: Commit rate limiter**

Run:
```bash
git add src/middleware/rateLimiter.ts
git commit -m "feat: add rate limiting middleware for auth endpoints"
```

Expected: Commit created

---

## Task 7: Authentication Routes

**Files:**
- Create: `src/routes/auth.ts`

**Step 1: Create routes directory**

Run: `mkdir -p src/routes`

**Step 2: Write validation helper**

Create `src/utils/validation.ts`:
```typescript
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password && password.length >= 6;
}
```

**Step 3: Implement authentication routes**

Create `src/routes/auth.ts`:
```typescript
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
```

**Step 4: Commit routes and validation**

Run:
```bash
git add src/routes/auth.ts src/utils/validation.ts
git commit -m "feat: implement authentication routes with validation"
```

Expected: Commit created

---

## Task 8: Express Server Setup

**Files:**
- Create: `src/index.ts`

**Step 1: Implement Express server**

Create `src/index.ts`:
```typescript
import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 2: Test server manually**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 3: Test health endpoint**

In another terminal:
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok"}`

**Step 4: Stop development server**

Press Ctrl+C in the terminal running the dev server

**Step 5: Commit server setup**

Run:
```bash
git add src/index.ts
git commit -m "feat: set up Express server with health check endpoint"
```

Expected: Commit created

---

## Task 9: Integration Tests for API Endpoints

**Files:**
- Create: `tests/auth.test.ts`

**Step 1: Write integration tests for all endpoints**

Create `tests/auth.test.ts`:
```typescript
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/index';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('should successfully create user and return tokens', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.user.id).toBeTruthy();
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
  });

  it('should reject duplicate email with 409', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password456',
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Email already exists');
  });

  it('should reject invalid email format with 400', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'invalid-email',
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid email format');
  });

  it('should reject missing password with 400', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Password must be at least 6 characters');
  });

  it('should reject short password with 400', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: '12345',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Password must be at least 6 characters');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });
  });

  it('should successfully log in existing user', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
  });

  it('should reject wrong password with 401', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should reject non-existent email with 401', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should reject missing credentials with 400', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Email and password are required');
  });
});

describe('POST /auth/refresh', () => {
  let refreshToken: string;

  beforeEach(async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    refreshToken = response.body.refreshToken;
  });

  it('should successfully return new access token with valid refresh token', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
  });

  it('should reject invalid refresh token with 401', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid-token' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid or expired token');
  });

  it('should reject missing token with 400', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Refresh token is required');
  });
});

describe('Rate Limiting', () => {
  it('should block 6th request within a minute with 429', async () => {
    // Make 5 requests (should succeed)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/auth/register')
        .send({
          email: `test${i}@example.com`,
          password: 'password123',
        });
    }

    // 6th request should be rate limited
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'test6@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(429);
  });
});
```

**Step 2: Run all integration tests**

Run: `npm test -- tests/auth.test.ts`
Expected: All tests PASS

**Step 3: Commit integration tests**

Run:
```bash
git add tests/auth.test.ts
git commit -m "test: add comprehensive integration tests for auth endpoints"
```

Expected: Commit created

---

## Task 10: README Documentation

**Files:**
- Create: `README.md`

**Step 1: Write comprehensive README**

Create `README.md`:
```markdown
# JWT Authentication System

A production-ready JWT authentication system built with Express, TypeScript, and Prisma. This project demonstrates essential authentication concepts including password hashing, token management, and rate limiting.

## Features

- **User Registration** - Create new user accounts with email/password
- **User Login** - Authenticate existing users
- **Token Refresh** - Exchange refresh tokens for new access tokens
- **Password Security** - Bcrypt hashing with 10 salt rounds
- **JWT Tokens** - Industry-standard token-based authentication
- **Rate Limiting** - Protection against brute force attacks (5 req/min)
- **TypeScript** - Full type safety throughout the application
- **SQLite Database** - Lightweight, zero-configuration database
- **Comprehensive Tests** - Integration tests for all endpoints

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set a strong JWT secret:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
PORT=3000
```

### 3. Run Database Migrations

```bash
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## API Examples

### Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Refresh Access Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Project Structure

```
├── src/
│   ├── index.ts              # Express server setup
│   ├── routes/
│   │   └── auth.ts           # Authentication endpoints
│   ├── services/
│   │   └── authService.ts    # Business logic
│   ├── middleware/
│   │   └── rateLimiter.ts    # Rate limiting
│   ├── utils/
│   │   ├── jwt.ts            # JWT utilities
│   │   └── validation.ts     # Input validation
│   └── types/
│       └── auth.ts           # TypeScript types
├── tests/
│   ├── auth.test.ts          # Integration tests
│   ├── services/
│   │   └── authService.test.ts
│   └── utils/
│       └── jwt.test.ts
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database file path | `file:./dev.db` |
| `JWT_SECRET` | Secret key for signing JWTs | (required) |
| `JWT_ACCESS_EXPIRY` | Access token expiration | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiration | `7d` |
| `PORT` | Server port | `3000` |

## Security Best Practices

### Password Hashing
- Uses bcrypt with 10 salt rounds
- Never stores plaintext passwords
- Passwords must be minimum 6 characters

### Token Management
- **Access Tokens:** Short-lived (15 minutes) for API authentication
- **Refresh Tokens:** Long-lived (7 days) for obtaining new access tokens
- Tokens signed with HS256 algorithm

### Rate Limiting
- 5 requests per minute per IP address
- Prevents brute force attacks
- Returns HTTP 429 when limit exceeded

### Error Messages
- Generic "Invalid credentials" message (doesn't reveal if email exists)
- No stack traces in production
- Server-side error logging for debugging

### Input Validation
- Email format validation (regex)
- Password length validation
- Type checking with TypeScript

## Teaching Points

This project demonstrates:

1. **Token-Based Authentication**
   - Access vs refresh token pattern
   - JWT structure and validation
   - Token expiration handling

2. **Security Fundamentals**
   - Password hashing with bcrypt
   - Rate limiting to prevent abuse
   - Generic error messages
   - Environment-based secrets

3. **Clean Architecture**
   - Separation of concerns (routes/services/middleware)
   - Service-oriented design
   - TypeScript type safety

4. **Testing Best Practices**
   - Integration testing with Supertest
   - Test isolation with fresh database
   - Coverage of happy paths and edge cases

## Possible Enhancements

Students can extend this system to learn more:

- **Token Revocation** - Store refresh tokens in database
- **Email Verification** - Send confirmation emails
- **Password Reset** - Forgot password flow
- **User Profiles** - Profile management endpoints
- **Role-Based Access Control** - User roles and permissions
- **OAuth Integration** - Social login (Google, GitHub)
- **Stronger Validation** - Use Zod or Joi schemas
- **Audit Logging** - Track login attempts
- **Two-Factor Authentication** - TOTP implementation

## License

MIT
```

**Step 2: Commit README**

Run:
```bash
git add README.md
git commit -m "docs: add comprehensive README with setup and API examples"
```

Expected: Commit created

---

## Task 11: Final Verification

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 2: Build TypeScript**

Run: `npm run build`
Expected: Compiles successfully, `dist/` directory created

**Step 3: Start server and test manually**

Run: `npm run dev`

In another terminal, test each endpoint:

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Refresh (use token from previous response)
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<paste-refresh-token-here>"}'
```

Expected: All endpoints return expected responses

**Step 4: Stop development server**

Press Ctrl+C

**Step 5: Verify git status**

Run: `git status`
Expected: Working directory clean (all changes committed)

**Step 6: Review commit history**

Run: `git log --oneline`
Expected: See all commits from this implementation

---

## Success Criteria Checklist

- ✅ All 3 endpoints functional (register, login, refresh)
- ✅ All tests passing (~15-18 tests)
- ✅ Rate limiting working (5 req/min)
- ✅ README with setup instructions and curl examples
- ✅ TypeScript compilation without errors
- ✅ Clean service-oriented code structure
- ✅ Essential security validations (bcrypt, JWT, input validation)
- ✅ SQLite database with Prisma ORM
- ✅ Frequent, meaningful commits throughout

## Notes for Implementation

- **TDD Approach:** Tests written before implementation for each component
- **DRY Principle:** Shared utilities (JWT, validation) extracted to separate files
- **YAGNI:** No over-engineering - only essential features from spec
- **Frequent Commits:** Each logical unit (service, routes, tests) committed separately
- **Type Safety:** Full TypeScript coverage with no `any` types
- **Error Handling:** Comprehensive error handling with appropriate HTTP status codes
