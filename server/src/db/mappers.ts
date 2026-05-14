import type {
  Event as SharedEvent,
  SessionPost,
  Student,
} from '@campus-event-finder/shared';
import type {
  Event as DbEvent,
  Notification as DbNotification,
  SportsSession as DbSportsSession,
  User,
  NotificationType as DbNotificationType,
  EventSubtype as DbEventSubtype,
} from '@prisma/client';
import { EventStatus } from '@prisma/client';

function tagsFromJson(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string');
  return [];
}

export function dbEventToShared(row: DbEvent): SharedEvent {
  const st = row.status === EventStatus.draft ? 'draft' : 'published';
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    locationName: row.locationName,
    campusAddress: row.campusAddress,
    price: row.price ?? undefined,
    entryRequirements: row.entryRequirements ?? undefined,
    deepLinkUrl: row.deepLinkUrl ?? undefined,
    creatorId: row.creatorId ?? undefined,
    tags: tagsFromJson(row.tags),
    maxParticipants: row.maxParticipants ?? undefined,
    registrationDeadline: row.registrationDeadline ?? undefined,
    bannerImage: row.bannerImage ?? undefined,
    status: st,
    isOnline: row.isOnline,
    subtype: row.subtype ? (row.subtype.toLowerCase() as SharedEvent['subtype']) : undefined,
  };
}

export function dbSessionToShared(row: DbSportsSession): SessionPost {
  return {
    id: row.id,
    creatorId: row.creatorId,
    sport: row.sport,
    participantsNeeded: row.participantsNeeded,
    skillLevel: row.skillLevel,
    scheduledAt: row.scheduledAt.toISOString(),
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export function dbUserToStudent(row: User): Student {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
  };
}

/** API payload matches legacy in-memory `Notification` interface */
export function dbNotificationToApi(row: DbNotification): {
  id: string;
  recipientId: string;
  type: DbNotificationType;
  title: string;
  body: string;
  eventId?: string;
  actorId?: string;
  read: boolean;
  createdAt: string;
} {
  return {
    id: row.id,
    recipientId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    eventId: row.eventId ?? undefined,
    actorId: row.actorId ?? undefined,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

export function parseSubtype(
  v: unknown,
): DbEventSubtype | null {
  if (v === 'sports' || v === 'technical' || v === 'cultural' || v === 'other') {
    return v as DbEventSubtype;
  }
  return null;
}

export function sharedStatusToDb(
  s: SharedEvent['status'] | undefined,
): EventStatus {
  return s === 'draft' ? EventStatus.draft : EventStatus.published;
}
