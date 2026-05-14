import { Router, Request, Response } from 'express';
import { requireAuth as authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';
import { dbEventToShared } from '../db/mappers';
import { createNotification } from '../services/notification.service';
import { EventStatus, RegistrationStatus } from '@prisma/client';
import { HttpError } from '../lib/HttpError';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;

    const [joinedCount, createdCount, savedCount] = await Promise.all([
      prisma.eventRegistration.count({ where: { userId: studentId } }),
      prisma.event.count({ where: { creatorId: studentId } }),
      prisma.savedEvent.count({ where: { userId: studentId } }),
    ]);

    res.json({ joinedCount, createdCount, savedCount });
  }),
);

dashboardRouter.get(
  '/joined',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const regs = await prisma.eventRegistration.findMany({
      where: { userId: studentId },
      include: { event: true },
    });
    res.json(regs.map((r) => dbEventToShared(r.event)));
  }),
);

dashboardRouter.post(
  '/join/:eventId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new HttpError(404, 'Event not found');
    }

    if (event.status !== EventStatus.published) {
      throw new HttpError(400, 'Registration is only open for published events');
    }

    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
        throw new HttpError(400, 'Registration deadline has passed');
      }
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId: studentId, eventId } },
    });

    if (existing) {
      res.json({ registered: true, alreadyRegistered: true });
      return;
    }

    if (event.maxParticipants != null) {
      const current = await prisma.eventRegistration.count({
        where: { eventId, status: RegistrationStatus.confirmed },
      });
      if (current >= event.maxParticipants) {
        throw new HttpError(400, 'This event has reached maximum capacity');
      }
    }

    await prisma.eventRegistration.create({
      data: { userId: studentId, eventId, status: RegistrationStatus.confirmed },
    });

    const ev = dbEventToShared(event);
    await createNotification(
      studentId,
      'registration',
      'Registration confirmed',
      `You're registered for "${ev.title}" on ${ev.date} at ${ev.time}.`,
      { eventId: event.id },
    );

    res.json({ registered: true, alreadyRegistered: false });
  }),
);

dashboardRouter.delete(
  '/join/:eventId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    await prisma.eventRegistration.deleteMany({
      where: { userId: studentId, eventId: req.params.eventId },
    });
    res.json({ registered: false });
  }),
);

dashboardRouter.get(
  '/created',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const events = await prisma.event.findMany({
      where: { creatorId: studentId },
      orderBy: { date: 'asc' },
    });

    const counts = await prisma.eventRegistration.groupBy({
      by: ['eventId'],
      where: { eventId: { in: events.map((e) => e.id) } },
      _count: { id: true },
    });
    const regMap = new Map(counts.map((c) => [c.eventId, c._count.id]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withAnalytics = events.map((e) => {
      const registrations = regMap.get(e.id) ?? 0;
      const isUpcoming = new Date(e.date) >= today;
      return {
        ...dbEventToShared(e),
        analytics: {
          registrations,
          capacity: e.maxParticipants ?? null,
          fillRate: e.maxParticipants ? Math.round((registrations / e.maxParticipants) * 100) : null,
          isUpcoming,
          status: e.status === EventStatus.draft ? 'draft' : 'published',
        },
      };
    });

    res.json(withAnalytics);
  }),
);

dashboardRouter.get(
  '/created/:eventId/participants',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    if (event.creatorId !== studentId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const regs = await prisma.eventRegistration.findMany({
      where: { eventId: req.params.eventId },
      include: { user: true },
    });

    const participants = regs.map((r) => ({
      id: r.user.id,
      displayName: r.user.displayName,
      email: r.user.email,
    }));

    res.json(participants);
  }),
);

dashboardRouter.get(
  '/saved',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const saved = await prisma.savedEvent.findMany({
      where: { userId: studentId },
      include: { event: true },
    });
    res.json(saved.map((s) => dbEventToShared(s.event)));
  }),
);

dashboardRouter.post(
  '/save/:eventId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    await prisma.savedEvent.upsert({
      where: { userId_eventId: { userId: studentId, eventId: req.params.eventId } },
      create: { userId: studentId, eventId: req.params.eventId },
      update: {},
    });
    res.json({ saved: true });
  }),
);

dashboardRouter.delete(
  '/save/:eventId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    await prisma.savedEvent.deleteMany({
      where: { userId: studentId, eventId: req.params.eventId },
    });
    res.json({ saved: false });
  }),
);
