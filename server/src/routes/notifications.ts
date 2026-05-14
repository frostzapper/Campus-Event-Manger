import { Router, Request, Response } from 'express';
import { requireAuth as authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';
import { dbNotificationToApi } from '../db/mappers';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const rows = await prisma.notification.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows.map(dbNotificationToApi));
  }),
);

notificationsRouter.get(
  '/unread-count',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const count = await prisma.notification.count({
      where: { userId: studentId, read: false },
    });
    res.json({ count });
  }),
);

notificationsRouter.patch(
  '/:id/read',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: studentId },
      data: { read: true },
    });
    res.json({ ok: true });
  }),
);

notificationsRouter.patch(
  '/read-all',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    await prisma.notification.updateMany({
      where: { userId: studentId },
      data: { read: true },
    });
    res.json({ ok: true });
  }),
);

notificationsRouter.delete(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    await prisma.notification.deleteMany({ where: { userId: studentId } });
    res.json({ ok: true });
  }),
);
