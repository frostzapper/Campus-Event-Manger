import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AuthSession } from '@campus-event-finder/shared';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/asyncHandler';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? 'campus-event-finder-dev-secret';
const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

function generateStudentId(): string {
  return 'student-' + Math.random().toString(36).substring(2, 11);
}

authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ message: 'email and password are required' });
      return;
    }

    const student = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!student) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, student.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000);
    const token = jwt.sign({ studentId: student.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY_SECONDS });

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
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'name, email, and password are required' });
      return;
    }

    const emailLower = email.trim().toLowerCase();

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const studentId = 'student-' + Math.random().toString(36).substring(2, 11);

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: studentId,
          email: emailLower,
          displayName: name.trim(),
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

    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000);
    const token = jwt.sign({ studentId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY_SECONDS });

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

    let payload: { studentId: string };
    try {
      payload = jwt.verify(existingToken, JWT_SECRET) as { studentId: string };
    } catch {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    const student = await prisma.user.findUnique({ where: { id: payload.studentId } });
    if (!student) {
      res.status(401).json({ message: 'Student not found' });
      return;
    }

    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000);
    const newToken = jwt.sign({ studentId: student.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY_SECONDS });

    const session: AuthSession = {
      studentId: student.id,
      token: newToken,
      expiresAt: expiresAt.toISOString(),
    };

    res.status(200).json(session);
  }),
);
