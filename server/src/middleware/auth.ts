import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/token';
import { config } from '../config/env';

/**
 * Authentication middleware.
 *
 * Validates a "Bearer <token>" Authorization header using JWT.
 *
 * When NODE_ENV === 'test', a non-JWT bearer value is accepted as a raw
 * user id for integration test convenience. This branch is never active
 * outside NODE_ENV=test.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (payload) {
    (req as AuthenticatedRequest).studentId = payload.studentId;
    next();
    return;
  }

  // Raw bearer IDs are only permitted in NODE_ENV=test.
  // This allows integration tests to use plain user IDs as Bearer values
  // without issuing real JWTs. Never active in production or development.
  if (config.nodeEnv === 'test' && token.length > 0) {
    (req as AuthenticatedRequest).studentId = token;
    next();
    return;
  }

  res.status(401).json({ message: 'Invalid or expired token' });
}

/**
 * Optional authentication middleware.
 *
 * If a valid JWT is present in the Authorization header, attaches studentId
 * to the request. All other cases (no header, malformed header, invalid token,
 * expired token) call next() without setting studentId. This middleware never
 * returns a 4xx — use requireAuth for routes that must be authenticated.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        (req as AuthenticatedRequest).studentId = payload.studentId;
      }
      // Invalid or expired token: silently ignored, request continues unauthenticated.
    }
  }
  next();
}

/** Extends Express Request with the authenticated student id. */
export interface AuthenticatedRequest extends Request {
  studentId: string;
}
