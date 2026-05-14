import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/HttpError';

/**
 * Central JSON error handler. Keeps API responses consistent for DB and runtime errors.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      issues: err.flatten(),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'Conflict', code: err.code });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Record not found', code: err.code });
      return;
    }
    res.status(400).json({ message: 'Database error', code: err.code });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ message: 'Validation error' });
    return;
  }

  const msg = err instanceof Error ? err.message : 'Internal server error';
  const status = (err as { status?: number }).status ?? 500;
  if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
    res.status(status).json({ message: msg, stack: err.stack });
    return;
  }
  res.status(status).json({ message: status >= 500 ? 'Internal server error' : msg });
}
