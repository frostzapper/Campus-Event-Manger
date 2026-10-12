import jwt from 'jsonwebtoken';
import { config } from '../config/env';

/** Shape of the JWT payload. Must not change without a token rotation migration. */
export interface TokenPayload {
  studentId: string;
  authTime?: number; // Unix seconds when authentication occurred (for session lifetime checks)
  iat?: number;
  exp?: number;
}

const EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours — matches existing behaviour

/**
 * Signs a JWT for the given student and returns the token string.
 * Uses the validated secret from config; never a fallback.
 * Optionally includes authTime (Unix seconds) for session lifetime tracking.
 */
export function signToken(studentId: string, authTime?: number): string {
  const payload: TokenPayload = { studentId };
  if (authTime !== undefined) {
    payload.authTime = authTime;
  }
  return jwt.sign(payload, config.jwtSecret, { expiresIn: EXPIRY_SECONDS });
}

/**
 * Verifies a JWT and returns the payload, or null if the token is invalid or expired.
 * Callers that need to distinguish between invalid and missing should handle null.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    return null;
  }
}
