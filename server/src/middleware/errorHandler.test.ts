import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError, z } from 'zod';
import { HttpError } from '../lib/HttpError';
import { errorHandler } from './errorHandler';

/**
 * errorHandler tests
 *
 * NOTE: Jest sets NODE_ENV=test when it is unset, so these tests run in test mode
 * by default. Tests that verify mode-specific behavior use jest.isolateModules to
 * reload config with different NODE_ENV values before importing errorHandler.
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

  it('non-Error values always produce status 500', () => {
    // Plain objects with status field should be ignored - non-Error always 500
    const err = { message: 'Client error', status: 418 };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('string errors produce status 500', () => {
    errorHandler('string error', req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('null errors produce status 500', () => {
    errorHandler(null, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});

describe('errorHandler mode-specific behavior', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = mockResponse();
    next = jest.fn();
  });

  it('returns message and stack in development mode', async () => {
    await jest.isolateModules(async () => {
      process.env.NODE_ENV = 'development';
      // Force reload of config and errorHandler with new NODE_ENV
      jest.resetModules();
      const { errorHandler: devHandler } = await import('./errorHandler');
      
      const err = new Error('Development error');
      devHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Development error',
        stack: expect.stringContaining('Error: Development error'),
      });
    });
  });

  it('returns generic message without stack in production mode', async () => {
    await jest.isolateModules(async () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { errorHandler: prodHandler } = await import('./errorHandler');
      
      const err = new Error('Production error');
      prodHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  it('returns generic message without stack in test mode', async () => {
    await jest.isolateModules(async () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const { errorHandler: testHandler } = await import('./errorHandler');
      
      const err = new Error('Test error');
      testHandler(err, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });
});
