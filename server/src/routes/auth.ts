import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuthSession } from '@campus-event-finder/shared';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { signToken, verifyToken } from '../lib/token';
import { registerSchema, loginSchema } from '../validation/auth';
import { config } from '../config/env';

export const authRouter = Router();

const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

// Generate a dummy hash at startup for login timing attack mitigation
// Used when email does not exist so response time doesn't reveal account existence
let dummyHashPromise: Promise<void>;
let dummyHash: string = '';

async function initDummyHash(): Promise<void> {
  dummyHash = await bcrypt.hash('dummy', config.bcryptCost);
}

// Start initialization immediately
dummyHashPromise = initDummyHash();

authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    // Ensure dummy hash is ready before processing login
    await dummyHashPromise;

    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', issues: validation.error.flatten() });
      return;
    }

    const { email, password } = validation.data;

    const student = await prisma.user.findUnique({
      where: { email },
    });

    let passwordValid = false;
    if (student) {
      passwordValid = await bcrypt.compare(password, student.passwordHash);
    } else {
      // Run bcrypt against dummy hash even if user doesn't exist
      // to avoid timing attacks that reveal whether an email is registered
      await bcrypt.compare(password, dummyHash);
    }

    if (!student || !passwordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000);
    const token = signToken(student.id);

    const session: AuthSession = {
      studentId: student.id,
      token,
      expiresAt: expiresAt.toISOString(),
    };

    res.status(200).json(session);
  }),
);

authRouter.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', issues: validation.error.flatten() });
      return;
    }

    const { email, password, displayName } = validation.data;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Registration keeps returning 409 for an existing email. This is a deliberate
      // UX tradeoff that makes the system enumerable. The per-email rate limiter
      // (Phase 2, Task 5) mitigates brute-force enumeration attacks.
      res.status(409).json({ message: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptCost);
    // User IDs: new users are "student-" followed by a 36-character UUID (e.g., student-a1b2c3d4-...).
    // Existing IDs use the legacy format: "student-" followed by 1-9 random characters (e.g., student-abc123).
    // Hand-written seed IDs like "student-dev-lead" or "student-campus-org" are also valid.
    // Both formats authenticate identically. Route-parameter validation in a later phase must accept
    // all three formats and must not assume a fixed length.
    const studentId = 'student-' + randomUUID();

    let user;
    try {
      [user] = await prisma.$transaction([
        prisma.user.create({
          data: {
            id: studentId,
            email,
            displayName,
            passwordHash,
          },
        }),
        // Default preferences
        prisma.reminderPrefs.create({
          data: {
            userId: studentId,
            enabled: true,
            inApp: true,
            email: true,
          },
        }),
      ]);
    } catch (err) {
      // If the email unique constraint was violated, return 409.
      // Prisma throws PrismaClientKnownRequestError with code P2002 for unique violations.
      // Check both the code and the target field to ensure it's the email constraint.
      const isPrismaError = err && typeof err === 'object' && 'code' in err && 'meta' in err;
      if (isPrismaError && (err as any).code === 'P2002' && (err as any).meta?.target?.includes('email')) {
        res.status(409).json({ message: 'An account with this email already exists' });
        return;
      }
      throw err;
    }

    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000);
    const token = signToken(user.id);

    const session: AuthSession = {
      studentId: user.id,
      token,
      expiresAt: expiresAt.toISOString(),
    };

    res.status(201).json(session);
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const existingToken = authHeader.slice('Bearer '.length).trim();
    if (!existingToken) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const payload = verifyToken(existingToken);
    if (!payload) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    const student = await prisma.user.findUnique({ where: { id: payload.studentId } });
    if (!student) {
      res.status(401).json({ message: 'Student not found' });
      return;
    }

    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000);
    const newToken = signToken(student.id);

    const session: AuthSession = {
      studentId: student.id,
      token: newToken,
      expiresAt: expiresAt.toISOString(),
    };

    res.status(200).json(session);
  }),
);
