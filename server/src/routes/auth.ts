import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
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
let dummyHash: string;
bcrypt.hash('dummy', config.bcryptCost).then((hash) => {
  dummyHash = hash;
});

authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
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
    } else if (dummyHash) {
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

    const { randomUUID } = await import('crypto');
    const passwordHash = await bcrypt.hash(password, config.bcryptCost);
    // User IDs: new users get "student-" prefix + UUID. Existing ids may use
    // the legacy format "student-<9 random chars>". Both formats are valid.
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
      // If the email unique constraint was violated, return 409
      // Any other database error is a server error
      if (err instanceof Error && err.message.includes('Unique constraint failed')) {
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
