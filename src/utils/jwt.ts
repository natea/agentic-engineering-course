import jwt from 'jsonwebtoken';
import { TokenPayload, RefreshTokenPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export function generateAccessToken(userId: number, email: string): string {
  const payload: TokenPayload = { userId, email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY } as any);
}

export function generateRefreshToken(userId: number): string {
  const payload: RefreshTokenPayload = { userId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRY } as any);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
}
