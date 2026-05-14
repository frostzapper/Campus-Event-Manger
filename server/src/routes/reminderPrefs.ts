import { Router, Request, Response } from 'express';
import { requireAuth as authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';
import { getSentEmails, buildReminderEmail, sendEmail } from '../services/emailService';
import { createNotification } from '../services/notification.service';

export const reminderPrefsRouter = Router();

const DEFAULT_PREFS = {
  enabled: true,
  inApp: true,
  email: true,
  remind24h: true,
  remind1h: true,
  remindNow: true,
};

reminderPrefsRouter.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const row = await prisma.reminderPrefs.findUnique({ where: { userId: studentId } });
    if (!row) {
      res.json({ studentId, ...DEFAULT_PREFS });
      return;
    }
    res.json({
      studentId,
      enabled: row.enabled,
      inApp: row.inApp,
      email: row.email,
      remind24h: row.remind24h,
      remind1h: row.remind1h,
      remindNow: row.remindNow,
    });
  }),
);

reminderPrefsRouter.put(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const body = req.body as Record<string, boolean>;

    const allowed = ['enabled', 'inApp', 'email', 'remind24h', 'remind1h', 'remindNow'] as const;
    const data: Partial<Record<(typeof allowed)[number], boolean>> = {};
    for (const key of allowed) {
      if (typeof body[key] === 'boolean') data[key] = body[key];
    }

    const updated = await prisma.reminderPrefs.upsert({
      where: { userId: studentId },
      create: {
        userId: studentId,
        enabled: data.enabled ?? DEFAULT_PREFS.enabled,
        inApp: data.inApp ?? DEFAULT_PREFS.inApp,
        email: data.email ?? DEFAULT_PREFS.email,
        remind24h: data.remind24h ?? DEFAULT_PREFS.remind24h,
        remind1h: data.remind1h ?? DEFAULT_PREFS.remind1h,
        remindNow: data.remindNow ?? DEFAULT_PREFS.remindNow,
      },
      update: data,
    });

    res.json({
      studentId,
      enabled: updated.enabled,
      inApp: updated.inApp,
      email: updated.email,
      remind24h: updated.remind24h,
      remind1h: updated.remind1h,
      remindNow: updated.remindNow,
    });
  }),
);

reminderPrefsRouter.post(
  '/test-send',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req as AuthenticatedRequest;
    const prefs = await prisma.reminderPrefs.findUnique({ where: { userId: studentId } });
    const effective = prefs ?? { enabled: true, inApp: true, email: true };

    const student = await prisma.user.findUnique({ where: { id: studentId } });

    if (!effective.enabled) {
      res.status(400).json({ error: 'Reminders are disabled. Enable them first.' });
      return;
    }

    const sent: string[] = [];

    if (effective.inApp) {
      await createNotification(
        studentId,
        'event_soon',
        '🔔 Test Reminder — Everything looks good!',
        'This is a test notification. Your in-app reminders are working perfectly.',
      );
      sent.push('in-app');
    }

    if (effective.email && student?.email) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const payload = buildReminderEmail({
        to: student.email,
        displayName: student.displayName,
        eventTitle: 'Test Event (Sample)',
        eventDate: dateStr,
        eventTime: '18:00',
        eventLocation: 'Campus Main Hall',
        window: '24h',
      });
      sendEmail(payload);
      sent.push('email');
    }

    res.json({ ok: true, sent });
  }),
);

reminderPrefsRouter.get('/sent-emails', authMiddleware, (_req: Request, res: Response) => {
  res.json(getSentEmails());
});
