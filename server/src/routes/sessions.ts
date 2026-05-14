import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';
import { dbSessionToShared } from '../db/mappers';
import { generateId } from '../db/id';
import { HttpError } from '../lib/HttpError';
import { sessionCreateBodySchema, sessionUpdateBodySchema } from '../validation/sessions';

export const sessionsRouter = Router();

sessionsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const rows = await prisma.sportsSession.findMany({
      where: {
        isActive: true,
        participantsNeeded: { gte: 1 },
        ...(query
          ? {
              OR: [
                { sport: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(rows.map(dbSessionToShared));
  }),
);

sessionsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const parsed = sessionCreateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Validation failed', parsed.error.flatten());
    }
    const body = parsed.data;
    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new HttpError(400, 'scheduledAt must be a valid date/time');
    }

    const created = await prisma.sportsSession.create({
      data: {
        id: generateId(),
        creatorId: studentId,
        sport: body.sport,
        participantsNeeded: body.participantsNeeded,
        skillLevel: body.skillLevel ?? '',
        scheduledAt,
        description: body.description,
        isActive: true,
      },
    });

    res.status(201).json(dbSessionToShared(created));
  }),
);

sessionsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const { id } = req.params;

    const existing = await prisma.sportsSession.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, `Session post with id '${id}' not found`);
    }
    if (existing.creatorId !== studentId) {
      throw new HttpError(403, 'Forbidden: you are not the owner of this post');
    }

    const parsed = sessionUpdateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Validation failed', parsed.error.flatten());
    }
    const patch = parsed.data;

    const data: {
      sport?: string;
      participantsNeeded?: number;
      scheduledAt?: Date;
      description?: string;
      skillLevel?: string;
      isActive?: boolean;
    } = {};
    if (patch.sport !== undefined) data.sport = patch.sport;
    if (patch.participantsNeeded !== undefined) data.participantsNeeded = patch.participantsNeeded;
    if (patch.scheduledAt !== undefined) {
      const d = new Date(patch.scheduledAt);
      if (Number.isNaN(d.getTime())) {
        throw new HttpError(400, 'scheduledAt must be a valid date/time');
      }
      data.scheduledAt = d;
    }
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.skillLevel !== undefined) data.skillLevel = patch.skillLevel;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;

    const updated = await prisma.sportsSession.update({ where: { id }, data });
    res.json(dbSessionToShared(updated));
  }),
);

sessionsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const { id } = req.params;

    const existing = await prisma.sportsSession.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, `Session post with id '${id}' not found`);
    }
    if (existing.creatorId !== studentId) {
      throw new HttpError(403, 'Forbidden: you are not the owner of this post');
    }

    await prisma.sportsSession.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  }),
);
