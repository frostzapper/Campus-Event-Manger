import request from 'supertest';
import { app } from '../index';
import { prisma } from '../lib/prisma';
import { SessionPost } from '@campus-event-finder/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_HEADER = 'Bearer student-test';
const OTHER_AUTH_HEADER = 'Bearer student-other';

/**
 * Reset the sessions store to a known state before each test that mutates it.
 * We splice the array in place so the reference held by the route module stays valid.
 */
const seedSessions: SessionPost[] = [
  {
    id: 'seed-1',
    creatorId: 'student-test',
    sport: 'Basketball',
    participantsNeeded: 3,
    skillLevel: 'Intermediate',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    description: 'Looking for 3 more players for a casual 5v5 game.',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    creatorId: 'student-alice',
    sport: 'Tennis',
    participantsNeeded: 1,
    skillLevel: 'Beginner',
    scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    description: 'Need one more person for doubles.',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-3',
    creatorId: 'student-bob',
    sport: 'Soccer',
    participantsNeeded: 0,
    skillLevel: 'Any',
    scheduledAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    description: 'Session is full.',
    isActive: false,
    createdAt: new Date().toISOString(),
  },
];

async function resetStore(): Promise<void> {
  await prisma.sportsSession.deleteMany({});
  for (const s of seedSessions) {
    await prisma.sportsSession.create({
      data: {
        id: s.id,
        creatorId: s.creatorId,
        sport: s.sport,
        participantsNeeded: s.participantsNeeded,
        skillLevel: s.skillLevel,
        scheduledAt: new Date(s.scheduledAt),
        description: s.description,
        isActive: s.isActive,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Task 3.1 — GET /sessions (active posts with open slots)
// ---------------------------------------------------------------------------

describe('GET /sessions', () => {
  beforeEach(() => resetStore());

  it('returns 200 with an array', async () => {
    const res = await request(app).get('/sessions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('only returns posts where isActive is true', async () => {
    const res = await request(app).get('/sessions');
    for (const post of res.body as SessionPost[]) {
      expect(post.isActive).toBe(true);
    }
  });

  it('only returns posts where participantsNeeded >= 1', async () => {
    const res = await request(app).get('/sessions');
    for (const post of res.body as SessionPost[]) {
      expect(post.participantsNeeded).toBeGreaterThanOrEqual(1);
    }
  });

  it('excludes inactive posts (isActive = false)', async () => {
    const res = await request(app).get('/sessions');
    const ids = (res.body as SessionPost[]).map((s) => s.id);
    expect(ids).not.toContain('seed-3');
  });

  it('returns all required fields on each post', async () => {
    const res = await request(app).get('/sessions');
    for (const post of res.body as SessionPost[]) {
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('creatorId');
      expect(post).toHaveProperty('sport');
      expect(post).toHaveProperty('participantsNeeded');
      expect(post).toHaveProperty('skillLevel');
      expect(post).toHaveProperty('scheduledAt');
      expect(post).toHaveProperty('description');
      expect(post).toHaveProperty('isActive');
    }
  });
});

// ---------------------------------------------------------------------------
// Task 3.3 — GET /sessions?q={query} (keyword search)
// ---------------------------------------------------------------------------

describe('GET /sessions?q=', () => {
  beforeEach(() => resetStore());

  it('returns posts matching the query in sport name', async () => {
    const res = await request(app).get('/sessions?q=Basketball');
    expect(res.status).toBe(200);
    const posts: SessionPost[] = res.body;
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      const combined = `${post.sport} ${post.description}`.toLowerCase();
      expect(combined).toContain('basketball');
    }
  });

  it('returns posts matching the query in description', async () => {
    const res = await request(app).get('/sessions?q=doubles');
    expect(res.status).toBe(200);
    const posts: SessionPost[] = res.body;
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      const combined = `${post.sport} ${post.description}`.toLowerCase();
      expect(combined).toContain('doubles');
    }
  });

  it('is case-insensitive', async () => {
    const upper = await request(app).get('/sessions?q=BASKETBALL');
    const lower = await request(app).get('/sessions?q=basketball');
    expect(upper.status).toBe(200);
    expect(lower.status).toBe(200);
    expect(upper.body).toEqual(lower.body);
  });

  it('returns an empty array when no posts match', async () => {
    const res = await request(app).get('/sessions?q=zzznomatch999');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns the full active list when q is empty string', async () => {
    const withEmpty = await request(app).get('/sessions?q=');
    const withoutQ = await request(app).get('/sessions');
    expect(withEmpty.status).toBe(200);
    expect(withEmpty.body).toEqual(withoutQ.body);
  });

  it('still excludes inactive posts even when a query is provided', async () => {
    // seed-3 is inactive and has "Soccer" as sport
    const res = await request(app).get('/sessions?q=Soccer');
    const ids = (res.body as SessionPost[]).map((s) => s.id);
    expect(ids).not.toContain('seed-3');
  });
});

// ---------------------------------------------------------------------------
// Task 3.5 — POST /sessions (create session post, auth required)
// ---------------------------------------------------------------------------

describe('POST /sessions', () => {
  beforeEach(() => resetStore());

  const validPayload = {
    sport: 'Volleyball',
    participantsNeeded: 2,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    description: 'Looking for two more players for a beach volleyball session.',
    skillLevel: 'Intermediate',
  };

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).post('/sessions').send(validPayload);
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is malformed', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', 'Token bad-format')
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it('creates a session post and returns 201 with the new post', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.sport).toBe('Volleyball');
    expect(res.body.participantsNeeded).toBe(2);
    expect(res.body.isActive).toBe(true);
  });

  it('associates the post with the authenticated student id', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.creatorId).toBe('student-test');
  });

  it('new post appears in GET /sessions list', async () => {
    const createRes = await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send(validPayload);
    expect(createRes.status).toBe(201);
    const newId = createRes.body.id;

    const listRes = await request(app).get('/sessions');
    const ids = (listRes.body as SessionPost[]).map((s) => s.id);
    expect(ids).toContain(newId);
  });

  it('returns 400 when sport is missing', async () => {
    const { sport: _sport, ...payload } = validPayload;
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.missingFields).toContain('sport');
  });

  it('returns 400 when participantsNeeded is missing', async () => {
    const { participantsNeeded: _pn, ...payload } = validPayload;
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.missingFields).toContain('participantsNeeded');
  });

  it('returns 400 when participantsNeeded is less than 1', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send({ ...validPayload, participantsNeeded: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when scheduledAt is missing', async () => {
    const { scheduledAt: _sa, ...payload } = validPayload;
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.missingFields).toContain('scheduledAt');
  });

  it('returns 400 when description is missing', async () => {
    const { description: _desc, ...payload } = validPayload;
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.missingFields).toContain('description');
  });

  it('does not publish the post when validation fails', async () => {
    const listBefore = await request(app).get('/sessions');
    const countBefore = (listBefore.body as SessionPost[]).length;

    await request(app)
      .post('/sessions')
      .set('Authorization', AUTH_HEADER)
      .send({ sport: 'Rugby' }); // missing required fields

    const listAfter = await request(app).get('/sessions');
    expect((listAfter.body as SessionPost[]).length).toBe(countBefore);
  });
});

// ---------------------------------------------------------------------------
// Task 3.9 — PUT /sessions/:id (edit session post, auth required, owner only)
// ---------------------------------------------------------------------------

describe('PUT /sessions/:id', () => {
  beforeEach(() => resetStore());

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).put('/sessions/seed-1').send({ sport: 'Rugby' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .put('/sessions/nonexistent-id')
      .set('Authorization', AUTH_HEADER)
      .send({ sport: 'Rugby' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when the authenticated student is not the owner', async () => {
    // seed-1 is owned by student-test; student-other should be forbidden
    const res = await request(app)
      .put('/sessions/seed-1')
      .set('Authorization', OTHER_AUTH_HEADER)
      .send({ sport: 'Rugby' });
    expect(res.status).toBe(403);
  });

  it('updates the post and returns the updated data', async () => {
    const res = await request(app)
      .put('/sessions/seed-1')
      .set('Authorization', AUTH_HEADER)
      .send({ sport: 'Rugby', participantsNeeded: 7 });
    expect(res.status).toBe(200);
    expect(res.body.sport).toBe('Rugby');
    expect(res.body.participantsNeeded).toBe(7);
  });

  it('updated values are reflected in GET /sessions list', async () => {
    await request(app)
      .put('/sessions/seed-1')
      .set('Authorization', AUTH_HEADER)
      .send({ sport: 'Rugby' });

    const listRes = await request(app).get('/sessions');
    const updated = (listRes.body as SessionPost[]).find((s) => s.id === 'seed-1');
    expect(updated?.sport).toBe('Rugby');
  });

  it('returns 400 when participantsNeeded is set to less than 1', async () => {
    const res = await request(app)
      .put('/sessions/seed-1')
      .set('Authorization', AUTH_HEADER)
      .send({ participantsNeeded: 0 });
    expect(res.status).toBe(400);
  });

  it('does not change fields that are not included in the request body', async () => {
    const res = await request(app)
      .put('/sessions/seed-1')
      .set('Authorization', AUTH_HEADER)
      .send({ sport: 'Rugby' });
    expect(res.status).toBe(200);
    // description should remain unchanged
    expect(res.body.description).toBe('Looking for 3 more players for a casual 5v5 game.');
  });
});

// ---------------------------------------------------------------------------
// Task 3.10 — DELETE /sessions/:id (delete session post, auth required, owner only)
// ---------------------------------------------------------------------------

describe('DELETE /sessions/:id', () => {
  beforeEach(() => resetStore());

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).delete('/sessions/seed-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .delete('/sessions/nonexistent-id')
      .set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  it('returns 403 when the authenticated student is not the owner', async () => {
    // seed-2 is owned by student-alice; student-test should be forbidden
    const res = await request(app)
      .delete('/sessions/seed-2')
      .set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(403);
  });

  it('returns 204 on successful deletion', async () => {
    const res = await request(app)
      .delete('/sessions/seed-1')
      .set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(204);
  });

  it('deleted post no longer appears in GET /sessions list', async () => {
    await request(app)
      .delete('/sessions/seed-1')
      .set('Authorization', AUTH_HEADER);

    const listRes = await request(app).get('/sessions');
    const ids = (listRes.body as SessionPost[]).map((s) => s.id);
    expect(ids).not.toContain('seed-1');
  });

  it('owner can delete their own post', async () => {
    // seed-1 is owned by student-test
    const res = await request(app)
      .delete('/sessions/seed-1')
      .set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(204);
  });
});
