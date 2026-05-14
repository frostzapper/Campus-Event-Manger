import request from 'supertest';
import { app } from '../index';
import { Event } from '@campus-event-finder/shared';
import jwt from 'jsonwebtoken';

const todayStr = (): string => new Date().toISOString().slice(0, 10);

/** GET /events returns a paginated envelope `{ events, total, ... }`. */
function eventList(body: unknown): Event[] {
  if (body && typeof body === 'object' && 'events' in body) {
    return (body as { events: Event[] }).events;
  }
  return body as Event[];
}

describe('GET /events', () => {
  it('returns 200 with a paginated envelope containing events', async () => {
    const res = await request(app).get('/events');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('events');
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  it('excludes events with dates before today', async () => {
    const res = await request(app).get('/events');
    const today = todayStr();
    for (const event of eventList(res.body)) {
      expect(event.date >= today).toBe(true);
    }
  });

  it('does not include past events (id=8) in the upcoming list', async () => {
    const res = await request(app).get('/events');
    const ids = eventList(res.body).map((e) => e.id);
    expect(ids).not.toContain('event-past-session');
  });

  it('returns events ordered by date ascending', async () => {
    const res = await request(app).get('/events');
    const events = eventList(res.body);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date >= events[i - 1].date).toBe(true);
    }
  });

  it('returns all required fields on each event', async () => {
    const res = await request(app).get('/events');
    for (const event of eventList(res.body)) {
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('description');
      expect(event).not.toHaveProperty('category');
      expect(event).toHaveProperty('date');
      expect(event).toHaveProperty('time');
      expect(event).toHaveProperty('locationName');
      expect(event).toHaveProperty('campusAddress');
    }
  });
});

describe('GET /events?q=', () => {
  it('returns only events matching the query in title', async () => {
    const res = await request(app).get('/events?q=Career');
    expect(res.status).toBe(200);
    const events = eventList(res.body);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      const combined = `${event.title} ${event.description}`.toLowerCase();
      expect(combined).toContain('career');
    }
  });

  it('returns only events matching the query in description', async () => {
    const res = await request(app).get('/events?q=resume');
    expect(res.status).toBe(200);
    const events = eventList(res.body);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      const combined = `${event.title} ${event.description}`.toLowerCase();
      expect(combined).toContain('resume');
    }
  });


  it('is case-insensitive', async () => {
    const upper = await request(app).get('/events?q=WORKSHOP');
    const lower = await request(app).get('/events?q=workshop');
    expect(upper.status).toBe(200);
    expect(lower.status).toBe(200);
    expect(upper.body.events).toEqual(lower.body.events);
  });

  it('returns an empty events array when no events match', async () => {
    const res = await request(app).get('/events?q=zzznomatch999');
    expect(res.status).toBe(200);
    expect(eventList(res.body)).toEqual([]);
  });

  it('returns the full upcoming list when q is empty string', async () => {
    const withEmpty = await request(app).get('/events?q=');
    const withoutQ = await request(app).get('/events');
    expect(withEmpty.status).toBe(200);
    expect(withEmpty.body.events).toEqual(withoutQ.body.events);
  });

  it('still excludes past events even when a query is provided', async () => {
    const res = await request(app).get('/events?q=Past');
    expect(res.status).toBe(200);
    const ids = eventList(res.body).map((e) => e.id);
    expect(ids).not.toContain('event-past-session');
  });

  it('returns results ordered by date ascending', async () => {
    const res = await request(app).get('/events?q=Hackathon');
    const events = eventList(res.body);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date >= events[i - 1].date).toBe(true);
    }
  });
});

describe('GET /events/:id', () => {
  it('returns 200 and the correct event for a valid id', async () => {
    const res = await request(app).get('/events/event-ai-workshop');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('event-ai-workshop');
    expect(res.body.title).toBe('Introduction to Generative AI');
  });

  it('returns all required detail fields', async () => {
    const res = await request(app).get('/events/event-ai-workshop');
    expect(res.status).toBe(200);
    const event: Event = res.body;
    expect(event).toHaveProperty('id');
    expect(event).toHaveProperty('title');
    expect(event).toHaveProperty('description');
    expect(event).not.toHaveProperty('category');
    expect(event).toHaveProperty('date');
    expect(event).toHaveProperty('time');
    expect(event).toHaveProperty('locationName');
    expect(event).toHaveProperty('campusAddress');
  });

  it('returns price when the event has a price set', async () => {
    const res = await request(app).get('/events/event-hackathon-2026');
    expect(res.status).toBe(200);
    // price is 0 in seed
    expect(res.body.price).toBe(0);
  });

  it('returns entryRequirements when defined', async () => {
    const res = await request(app).get('/events/event-hackathon-2026');
    expect(res.status).toBe(200);
    expect(res.body.entryRequirements).toBeTruthy();
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app).get('/events/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

});
