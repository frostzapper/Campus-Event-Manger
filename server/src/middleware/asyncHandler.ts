import type { RequestHandler } from 'express';

/**
 * Wraps async Express handlers so rejected promises surface to error middleware.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
