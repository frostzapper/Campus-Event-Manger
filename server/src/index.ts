import 'dotenv/config';
import express from 'express';
import { config } from './config/env';
import { prisma } from './lib/prisma';
import { eventsRouter } from './routes/events';
import { sessionsRouter } from './routes/sessions';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { followsRouter } from './routes/follows';
import { notificationsRouter } from './routes/notifications';
import { reminderPrefsRouter } from './routes/reminderPrefs';
import { startReminderScheduler } from './services/reminderScheduler';
import { errorHandler } from './middleware/errorHandler';
import { asyncHandler } from './middleware/asyncHandler';

const app = express();

const PORT = config.port;

app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use('/events', eventsRouter);
app.use('/sessions', sessionsRouter);
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/follows', followsRouter);
app.use('/notifications', notificationsRouter);
app.use('/reminder-prefs', reminderPrefsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get(
  '/health/db',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: true });
  }),
);

app.use(errorHandler);

export { app };

if (require.main === module) {
  prisma
    .$connect()
    .then(() => {
      console.log('[DB] Connected to PostgreSQL');
      app.listen(PORT, () => {
        console.log(`Campus Event Finder API listening on port ${PORT}`);
        startReminderScheduler();
      });
    })
    .catch((err) => {
      console.error('[DB] Failed to connect — check DATABASE_URL and that PostgreSQL is running.');
      console.error(err);
      process.exit(1);
    });
}
