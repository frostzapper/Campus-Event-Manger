import { z } from 'zod';
import { EventStatus } from '@prisma/client';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
const hhmm = z.string().regex(/^\d{1,2}:\d{2}$/, 'time must be HH:MM');

export const eventCreateBodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().max(20000).optional().default(''),
  date: isoDate,
  time: hhmm,
  locationName: z.string().trim().min(1).max(300),
  campusAddress: z.string().trim().min(1).max(500),
  price: z.number().finite().nonnegative().optional(),
  entryRequirements: z.string().max(2000).optional(),
  deepLinkUrl: z.string().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  maxParticipants: z.number().int().positive().optional(),
  registrationDeadline: z.string().max(80).optional(),
  bannerImage: z.string().max(5_000_000).optional(),
  status: z.enum(['published', 'draft']).optional(),
  isOnline: z.boolean().optional(),
  subtype: z.enum(['sports', 'technical', 'cultural', 'other']).optional(),
});

export const eventUpdateBodySchema = eventCreateBodySchema.partial();

export type EventCreateBody = z.infer<typeof eventCreateBodySchema>;

/** Normalize parsed body (optional URL empty → undefined). */
export function normalizeEventPayload<T extends { deepLinkUrl?: string | null | undefined }>(
  body: T,
): T {
  const next = { ...body };
  if (next.deepLinkUrl === '') {
    delete (next as { deepLinkUrl?: string }).deepLinkUrl;
  }
  return next;
}

export function prismaStatusFromBody(s: EventCreateBody['status']): EventStatus | undefined {
  if (s === undefined) return undefined;
  return s === 'draft' ? EventStatus.draft : EventStatus.published;
}
