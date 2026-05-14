import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'campus-event-finder-dev-secret';

/**
 * Authentication middleware.
 *
 * Validates a "Bearer <token>" Authorization header using JWT.
 *
 * When `NODE_ENV === 'test'` or `AUTH_RAW_BEARER_IDS=true`, a non-JWT bearer value
 * is accepted as a raw user id (legacy integration / tests).
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

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { studentId: string };
    (req as AuthenticatedRequest).studentId = payload.studentId;
    next();
    return;
  } catch {
    // fall through
  }

  const allowRaw =
    process.env.NODE_ENV === 'test' || process.env.AUTH_RAW_BEARER_IDS === 'true';
  if (allowRaw && token.length > 0) {
    (req as AuthenticatedRequest).studentId = token;
    next();
    return;
  }

  res.status(401).json({ message: 'Invalid or expired token' });
}

/** Extends Express Request with the authenticated student id. */
export interface AuthenticatedRequest extends Request {
  studentId: string;
}
