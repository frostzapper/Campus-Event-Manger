import type { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateId } from '../db/id';

export async function createNotification(
  recipientId: string,
  type: NotificationType,
  title: string,
  body: string,
  extras: { eventId?: string; actorId?: string } = {},
): Promise<void> {
  await prisma.notification.create({
    data: {
      id: generateId(),
      userId: recipientId,
      type,
      title,
      body,
      eventId: extras.eventId,
      actorId: extras.actorId,
      read: false,
    },
  });
}
