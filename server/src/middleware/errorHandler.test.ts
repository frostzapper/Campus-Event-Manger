import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError, z } from 'zod';
import { HttpError } from '../lib/HttpError';
import { errorHandler } from './errorHandler';

/**
 * errorHandler tests
 *
 * NOTE: These tests run with NODE_ENV defaulting to 'production' (config.nodeEnv).
 * The tests verify production behavior (no stack traces, generic messages for 500+ errors).
 * Development behavior (stack traces included) is verified through integration tests
 * and manual testing, as unit tests cannot override config.nodeEnv at runtime.
 */

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = mockResponse();
    next = jest.fn();
  });

  it('returns status and message for HttpError', () => {
    const err = new HttpError(403, 'Forbidden');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
  });

  it('returns status, message, and details for HttpError with details', () => {
    const err = new HttpError(400, 'Bad Request', { field: 'email' });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Bad Request',
      details: { field: 'email' },
    });
  });

  it('returns 400 with flattened issues for ZodError', () => {
    const schema = z.object({ name: z.string() });
    try {
      schema.parse({});
    } catch (err) {
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Validation failed',
        issues: expect.any(Object),
      });
    }
  });

  it('returns 409 for Prisma P2002 unique constraint violation', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Conflict', code: 'P2002' });
  });

  it('returns 404 for Prisma P2025 record not found', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '6.0.0',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Record not found', code: 'P2025' });
  });

  it('returns 400 for other Prisma known errors', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Some DB error', {
      code: 'P2003',
      clientVersion: '6.0.0',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Database error', code: 'P2003' });
  });

  it('returns 400 for Prisma validation error', () => {
    const err = new Prisma.PrismaClientValidationError('Invalid query', {
      clientVersion: '6.0.0',
    });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Validation error' });
  });

  it('returns generic 500 without stack in production', () => {
    // When NODE_ENV is production (the default), errors with status >= 500
    // return a generic message and no stack trace for security.
    const err = new Error('Sensitive error details');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('returns generic 500 without stack in test', () => {
    // When NODE_ENV is test, errors with status >= 500 also hide details.
    const err = new Error('Test error details');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('returns status 500 for non-Error unknown values', () => {
    errorHandler('string error', req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('respects custom status on error object when <500', () => {
    const err = { message: 'Client error', status: 418 };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(418);
    // Non-Error objects with status <500 still get generic message (msg is 'Internal server error')
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});
