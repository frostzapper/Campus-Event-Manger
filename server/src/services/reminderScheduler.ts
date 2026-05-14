/**
 * Reminder scheduler — polls DB-backed events and registrations.
 */

import { EventStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createNotification } from './notification.service';
import { buildReminderEmail, sendEmail } from './emailService';

const sent = new Set<string>();

function eventStartMs(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

type ReminderWindow = '24h' | '1h' | 'now';

interface WindowDef {
  key: ReminderWindow;
  label: string;
  diffMin: number;
  toleranceMin: number;
  prefKey: 'remind24h' | 'remind1h' | 'remindNow';
}

const WINDOWS: WindowDef[] = [
  { key: '24h', label: '24 hours', diffMin: 24 * 60, toleranceMin: 5, prefKey: 'remind24h' },
  { key: '1h', label: '1 hour', diffMin: 60, toleranceMin: 5, prefKey: 'remind1h' },
  { key: 'now', label: 'right now', diffMin: 0, toleranceMin: 5, prefKey: 'remindNow' },
];

async function check(): Promise<void> {
  const now = Date.now();
  const events = await prisma.event.findMany({
    where: { status: EventStatus.published },
  });

  for (const event of events) {
    const startMs = eventStartMs(event.date, event.time);
    const diffMin = (startMs - now) / 60_000;

    for (const w of WINDOWS) {
      if (Math.abs(diffMin - w.diffMin) > w.toleranceMin) continue;

      const registrants = await prisma.eventRegistration.findMany({
        where: { eventId: event.id },
        select: { userId: true },
      });

      for (const { userId } of registrants) {
        const sentKey = `${event.id}:${userId}:${w.key}:${startMs}`;
        if (sent.has(sentKey)) continue;

        const prefs = await prisma.reminderPrefs.findUnique({ where: { userId } });
        const p = prefs ?? {
          enabled: true,
          remind24h: true,
          remind1h: true,
          remindNow: true,
          inApp: true,
          email: true,
        };

        if (!p.enabled) continue;
        if (!p[w.prefKey]) continue;

        sent.add(sentKey);

        const title =
          w.key === 'now'
            ? `🚀 "${event.title}" is starting now!`
            : `⏰ Reminder: "${event.title}" starts in ${w.label}`;

        const body = `${event.title} — ${event.date} at ${event.time}, ${event.locationName}`;

        if (p.inApp) {
          await createNotification(userId, 'event_soon', title, body, { eventId: event.id });
        }

        if (p.email) {
          const student = await prisma.user.findUnique({ where: { id: userId } });
          if (student?.email) {
            const payload = buildReminderEmail({
              to: student.email,
              displayName: student.displayName,
              eventTitle: event.title,
              eventDate: event.date,
              eventTime: event.time,
              eventLocation: `${event.locationName}${event.campusAddress ? ' — ' + event.campusAddress : ''}`,
              window: w.key,
              eventUrl: event.deepLinkUrl ?? undefined,
            });
            sendEmail(payload);
          }
        }
      }
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler(): void {
  if (intervalId) return;
  console.log('[Reminders] Scheduler started (checking every 60s)');
  void check();
  intervalId = setInterval(() => {
    void check();
  }, 60 * 1000);
}

export function stopReminderScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function runCheckNow(): void {
  void check();
}

export function clearSentSet(): void {
  sent.clear();
}
