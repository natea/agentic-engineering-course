import jwt, { SignOptions } from 'jsonwebtoken';
import { TokenPayload, RefreshTokenPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export function generateAccessToken(userId: number, email: string): string {
  const payload: TokenPayload = { userId, email };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as SignOptions['expiresIn']
  });
}

export function generateRefreshToken(userId: number): string {
  const payload: RefreshTokenPayload = { userId };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as SignOptions['expiresIn']
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
}
