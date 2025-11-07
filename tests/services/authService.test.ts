import { PrismaClient } from '@prisma/client';
import * as authService from '../../src/services/authService';

const prisma = new PrismaClient();

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

      // Wait 1 second to ensure different timestamp in JWT
      await new Promise(resolve => setTimeout(resolve, 1000));

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
