import { Router, Request, Response } from 'express';
import { requireAuth as authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';
import { dbEventToShared } from '../db/mappers';
import { EventStatus } from '@prisma/client';
import { createNotification } from '../services/notification.service';

export const followsRouter = Router();

// ── Following feed & suggestions (must be before "/:studentId/..." routes) ──

followsRouter.get(
  '/feed',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId: me } = req as AuthenticatedRequest;

    const following = await prisma.follow.findMany({
      where: { followerId: me },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const rows = await prisma.event.findMany({
      where: {
        status: EventStatus.published,
        creatorId: { in: followingIds },
        date: { gte: todayStr },
      },
      orderBy: { date: 'asc' },
    });

    res.json(rows.map(dbEventToShared));
  }),
);

followsRouter.get(
  '/suggestions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId: me } = req as AuthenticatedRequest;

    const withCreators = await prisma.event.findMany({
      where: { creatorId: { not: null } },
      select: { creatorId: true },
    });
    const creatorIds = [
      ...new Set(withCreators.map((c) => c.creatorId).filter((id): id is string => !!id && id !== me)),
    ];

    const suggestions = [];
    for (const id of creatorIds) {
      const already = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: me, followingId: id } },
      });
      if (already) continue;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) continue;

      const eventCount = await prisma.event.count({
        where: { creatorId: id, status: EventStatus.published },
      });
      const followerCount = await prisma.follow.count({ where: { followingId: id } });

      suggestions.push({
        id: user.id,
        displayName: user.displayName,
        followerCount,
        eventCount,
      });
      if (suggestions.length >= 6) break;
    }

    res.json(suggestions);
  }),
);

// ── Organizer profile ─────────────────────────────────────────────────────

followsRouter.get(
  '/profile/:studentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const events = await prisma.event.findMany({
      where: { creatorId: studentId, status: EventStatus.published },
      orderBy: { date: 'asc' },
    });

    const [followerCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: studentId } }),
      prisma.follow.count({ where: { followerId: studentId } }),
    ]);

    res.json({
      id: student.id,
      displayName: student.displayName,
      email: student.email,
      followerCount,
      followingCount,
      eventCount: events.length,
      events: events.map(dbEventToShared),
    });
  }),
);

followsRouter.get(
  '/profile/:studentId/follow-status',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId: me } = req as AuthenticatedRequest;
    const { studentId: target } = req.params;
    const row = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: me, followingId: target } },
    });
    res.json({ following: !!row });
  }),
);

// ── Follow / unfollow ─────────────────────────────────────────────────────

followsRouter.post(
  '/:targetId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId: me } = req as AuthenticatedRequest;
    const { targetId } = req.params;
    if (me === targetId) {
      res.status(400).json({ message: 'Cannot follow yourself' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: me, followingId: targetId } },
      create: { followerId: me, followingId: targetId },
      update: {},
    });

    const follower = await prisma.user.findUnique({ where: { id: me } });
    await createNotification(
      targetId,
      'new_follower',
      'New follower',
      `${follower?.displayName ?? 'Someone'} started following you.`,
      { actorId: me },
    );

    const fc = await prisma.follow.count({ where: { followingId: targetId } });
    res.json({ following: true, followerCount: fc });
  }),
);

followsRouter.delete(
  '/:targetId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId: me } = req as AuthenticatedRequest;
    const { targetId } = req.params;
    await prisma.follow.deleteMany({
      where: { followerId: me, followingId: targetId },
    });
    const fc = await prisma.follow.count({ where: { followingId: targetId } });
    res.json({ following: false, followerCount: fc });
  }),
);

// ── Followers / following lists ───────────────────────────────────────────

followsRouter.get(
  '/:studentId/followers',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await prisma.follow.findMany({
      where: { followingId: req.params.studentId },
      include: { follower: true },
    });
    const users = rows.map((r) => ({
      id: r.follower.id,
      displayName: r.follower.displayName,
    }));
    res.json(users);
  }),
);

followsRouter.get(
  '/:studentId/following',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await prisma.follow.findMany({
      where: { followerId: req.params.studentId },
      include: { following: true },
    });
    const users = rows.map((r) => ({
      id: r.following.id,
      displayName: r.following.displayName,
    }));
    res.json(users);
  }),
);
