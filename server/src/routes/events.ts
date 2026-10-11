import { Router, Request, Response } from 'express';
import { EventStatus, EventSubtype, Prisma, RegistrationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth as authMiddleware, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { dbEventToShared, parseSubtype } from '../db/mappers';
import { generateId } from '../db/id';
import { createNotification } from '../services/notification.service';
import { HttpError } from '../lib/HttpError';
import {
  eventCreateBodySchema,
  eventUpdateBodySchema,
  normalizeEventPayload,
  prismaStatusFromBody,
} from '../validation/events';

export const eventsRouter = Router();

/** GET /events — upcoming published events with advanced discovery */
eventsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const subtypeStr = typeof req.query.subtype === 'string' ? req.query.subtype : '';
    const subtype =
      subtypeStr === 'sports' || subtypeStr === 'technical' || subtypeStr === 'cultural' || subtypeStr === 'other'
        ? (subtypeStr as EventSubtype)
        : undefined;
    const isFree = req.query.free === 'true';
    const isPaid = req.query.paid === 'true';
    const isOnline = req.query.online === 'true';
    const isOffline = req.query.offline === 'true';
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : '';
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : '';

    let minDate = todayStr;
    if (dateFrom && dateFrom > minDate) minDate = dateFrom;

    const dateClause: Prisma.StringFilter = { gte: minDate };
    if (dateTo) dateClause.lte = dateTo;

    const andParts: Prisma.EventWhereInput[] = [
      { status: EventStatus.published },
      { date: dateClause },
    ];
    if (subtype) andParts.push({ subtype });
    if (isOnline) andParts.push({ isOnline: true });
    if (isOffline) andParts.push({ isOnline: false });
    if (isFree) andParts.push({ OR: [{ price: null }, { price: 0 }] });
    if (isPaid) andParts.push({ price: { gt: 0 } });

    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'date';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    const baseWhere: Prisma.EventWhereInput = { AND: andParts };

    /** DB-level pagination when we can sort by a column (avoids loading entire tables). */
    const useDbPagination = !q && sort !== 'trending' && sort !== 'mostRegistered';

    if (useDbPagination) {
      const orderBy =
        sort === 'newest' ? { id: 'desc' as const } : { date: 'asc' as const };
      const [total, dbRows] = await prisma.$transaction([
        prisma.event.count({ where: baseWhere }),
        prisma.event.findMany({
          where: baseWhere,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            _count: {
              select: { registrations: { where: { status: RegistrationStatus.confirmed } } },
            },
          },
        }),
      ]);
      res.json({
        events: dbRows.map(r => ({ ...dbEventToShared(r), participantCount: r._count.registrations })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      });
      return;
    }

    let rows = await prisma.event.findMany({
      where: baseWhere,
      include: {
        _count: {
          select: { registrations: { where: { status: RegistrationStatus.confirmed } } },
        },
      },
    });

    if (q) {
      rows = rows.filter((e) => {
        const tags = Array.isArray(e.tags) ? (e.tags as string[]) : [];
        return (
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    if (sort === 'newest') {
      rows.sort((a, b) => b.id.localeCompare(a.id));
    } else if (sort === 'trending' || sort === 'mostRegistered') {
      const counts = await prisma.eventRegistration.groupBy({
        by: ['eventId'],
        where: { status: RegistrationStatus.confirmed },
        _count: { id: true },
      });
      const map = new Map(counts.map((c) => [c.eventId, c._count.id]));
      rows.sort((a, b) => (map.get(b.id) ?? 0) - (map.get(a.id) ?? 0));
    } else {
      rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }

    const total = rows.length;
    const start = (page - 1) * limit;
    const pagedEvents = rows.slice(start, start + limit).map(r => ({
      ...dbEventToShared(r),
      participantCount: r._count.registrations,
    }));

    res.json({
      events: pagedEvents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  }),
);

/** GET /events/suggestions — autocomplete suggestions */
eventsRouter.get(
  '/suggestions',
  asyncHandler(async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    if (!q) {
      res.json([]);
      return;
    }

    const rows = await prisma.event.findMany({
      where: {
        status: EventStatus.published,
        title: { contains: q, mode: 'insensitive' },
      },
      take: 5,
      select: { id: true, title: true },
    });

    res.json(rows.map((e) => ({ id: e.id, title: e.title })));
  }),
);

/** GET /events/mine — all events by the authenticated creator (incl. drafts) */
eventsRouter.get(
  '/mine',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const rows = await prisma.event.findMany({
      where: { creatorId: studentId },
      orderBy: { date: 'asc' },
    });
    res.json(rows.map(dbEventToShared));
  }),
);

/** GET /events/:id */
eventsRouter.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentStudentId = (req as AuthenticatedRequest).studentId as string | undefined;

    const row = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { registrations: { where: { status: RegistrationStatus.confirmed } } },
        },
        registrations: currentStudentId ? { where: { userId: currentStudentId, status: RegistrationStatus.confirmed } } : false,
      },
    });

    if (!row) {
      throw new HttpError(404, 'Event not found');
    }

    const event = dbEventToShared(row);
    const isRegistered = currentStudentId ? row.registrations.length > 0 : false;
    const participantCount = row._count.registrations;

    res.json({ ...event, isRegistered, participantCount });
  }),
);

/** POST /events — create event (auth required) */
eventsRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const parsed = eventCreateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Validation failed', parsed.error.flatten());
    }
    const body = normalizeEventPayload(parsed.data);
    const tags = body.tags ?? [];
    const st = prismaStatusFromBody(body.status) ?? EventStatus.published;

    const newRow = await prisma.event.create({
      data: {
        id: generateId(),
        title: body.title,
        description: body.description ?? '',
        date: body.date,
        time: body.time,
        locationName: body.locationName,
        campusAddress: body.campusAddress,
        price: body.price ?? null,
        entryRequirements: body.entryRequirements?.trim() || null,
        deepLinkUrl: body.deepLinkUrl?.trim() || null,
        creatorId: studentId,
        tags: tags as unknown as Prisma.InputJsonValue,
        maxParticipants: body.maxParticipants ?? null,
        registrationDeadline: body.registrationDeadline?.trim() || null,
        bannerImage: body.bannerImage || null,
        status: st,
        isOnline: Boolean(body.isOnline),
        subtype: parseSubtype(body.subtype),
      },
    });

    const newEvent = dbEventToShared(newRow);

    if (newRow.status === EventStatus.published && studentId) {
      const followers = await prisma.follow.findMany({
        where: { followingId: studentId },
        select: { followerId: true },
      });
      for (const { followerId } of followers) {
        await createNotification(followerId, 'new_event', 'New event from someone you follow', `${newEvent.title} — ${newEvent.date} at ${newEvent.time}`, {
          eventId: newEvent.id,
          actorId: studentId,
        });
      }
    }

    res.status(201).json(newEvent);
  }),
);

/** PUT /events/:id — update event (auth required, creator only) */
eventsRouter.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new HttpError(404, 'Event not found');
    }
    if (existing.creatorId !== studentId) {
      throw new HttpError(403, 'Forbidden');
    }

    const parsed = eventUpdateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Validation failed', parsed.error.flatten());
    }
    const patch = normalizeEventPayload(parsed.data);

    if (patch.maxParticipants !== undefined && patch.maxParticipants !== null) {
      const regCount = await prisma.eventRegistration.count({
        where: { eventId: req.params.id, status: RegistrationStatus.confirmed },
      });
      if (patch.maxParticipants < regCount) {
        throw new HttpError(
          400,
          `maxParticipants cannot be less than current registrations (${regCount})`,
        );
      }
    }

    const tags = patch.tags !== undefined ? patch.tags : undefined;

    const data: Prisma.EventUpdateInput = {
      title: patch.title ?? existing.title,
      description: patch.description ?? existing.description,
      date: patch.date ?? existing.date,
      time: patch.time ?? existing.time,
      locationName: patch.locationName ?? existing.locationName,
      campusAddress: patch.campusAddress ?? existing.campusAddress,
      price: patch.price !== undefined ? patch.price : existing.price,
      entryRequirements:
        patch.entryRequirements !== undefined ? patch.entryRequirements ?? null : existing.entryRequirements,
      maxParticipants:
        patch.maxParticipants !== undefined ? patch.maxParticipants ?? null : existing.maxParticipants,
      registrationDeadline:
        patch.registrationDeadline !== undefined
          ? patch.registrationDeadline ?? null
          : existing.registrationDeadline,
      bannerImage: patch.bannerImage !== undefined ? patch.bannerImage ?? null : existing.bannerImage,
      status:
        patch.status !== undefined ? prismaStatusFromBody(patch.status)! : existing.status,
      subtype: patch.subtype !== undefined ? parseSubtype(patch.subtype) : existing.subtype,
      isOnline: patch.isOnline !== undefined ? Boolean(patch.isOnline) : existing.isOnline,
      deepLinkUrl:
        patch.deepLinkUrl !== undefined ? patch.deepLinkUrl?.trim() || null : existing.deepLinkUrl,
    };
    if (tags !== undefined) data.tags = tags as unknown as Prisma.InputJsonValue;

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data,
    });

    const registrants = await prisma.eventRegistration.findMany({
      where: { eventId: updated.id },
      select: { userId: true },
    });
    for (const { userId } of registrants) {
      await createNotification(userId, 'event_updated', 'Event updated', `"${updated.title}" has been updated. Check the latest details.`, {
        eventId: updated.id,
      });
    }

    res.json(dbEventToShared(updated));
  }),
);

/** DELETE /events/:id — delete event (auth required, creator only) */
eventsRouter.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new HttpError(404, 'Event not found');
    }
    if (existing.creatorId !== studentId) {
      throw new HttpError(403, 'Forbidden');
    }

    const registrants = await prisma.eventRegistration.findMany({
      where: { eventId: existing.id },
      select: { userId: true },
    });
    const cancelledTitle = existing.title;
    for (const { userId } of registrants) {
      await createNotification(userId, 'event_cancelled', 'Event cancelled', `"${cancelledTitle}" has been cancelled.`, {
        eventId: existing.id,
      });
    }

    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
