import * as fc from 'fast-check';
import type { Event, SessionPost, Student, AuthSession, Coordinates } from './index';

// Feature: campus-event-finder
// These tests verify that the data model interfaces are structurally correct
// and that objects conforming to them satisfy the expected shape.

describe('Event model', () => {
  it('accepts a minimal valid event (no optional fields)', () => {
    const event: Event = {
      id: 'evt-1',
      title: 'Campus Concert',
      description: 'Live music on the quad',
      subtype: 'other',
      date: '2024-09-15',
      time: '18:00',
      locationName: 'Main Quad',
      campusAddress: '1 University Ave',
    };
    expect(event.id).toBe('evt-1');
    expect(event.price).toBeUndefined();
    expect(event.entryRequirements).toBeUndefined();
    expect(event.deepLinkUrl).toBeUndefined();
  });

  it('accepts a fully populated event (all optional fields set)', () => {
    const event: Event = {
      id: 'evt-2',
      title: 'Gala Dinner',
      description: 'Annual fundraiser',
      subtype: 'other',
      date: '2024-10-01',
      time: '19:30',
      locationName: 'Grand Hall',
      campusAddress: '2 University Ave',
      price: 25,
      entryRequirements: 'Must be a club member',
      deepLinkUrl: 'https://example.com/events/evt-2',
    };
    expect(event.price).toBe(25);
    expect(event.entryRequirements).toBe('Must be a club member');
    expect(event.deepLinkUrl).toBe('https://example.com/events/evt-2');
  });

  it('property: any generated Event object has required fields present', () => {
    // Feature: campus-event-finder, Property: Event model completeness
    const eventArb = fc.record<Event>({
      id: fc.uuid(),
      title: fc.string({ minLength: 1 }),
      description: fc.string(),
      subtype: fc.constantFrom('sports', 'technical', 'cultural', 'other'),
      date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(
        (d) => d.toISOString().split('T')[0]
      ),
      time: fc
        .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
        .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
      locationName: fc.string({ minLength: 1 }),
      campusAddress: fc.string({ minLength: 1 }),
    });

    fc.assert(
      fc.property(eventArb, (event) => {
        expect(event.id).toBeDefined();
        expect(event.title).toBeDefined();
        expect(event.description).toBeDefined();
        expect(event.subtype).toBeDefined();
        expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(event.time).toMatch(/^\d{2}:\d{2}$/);
        expect(event.locationName).toBeDefined();
        expect(event.campusAddress).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });
});

describe('SessionPost model', () => {
  it('accepts a valid session post', () => {
    const post: SessionPost = {
      id: 'sp-1',
      creatorId: 'student-42',
      sport: 'Basketball',
      participantsNeeded: 3,
      skillLevel: 'Intermediate',
      scheduledAt: '2024-09-20T15:00:00Z',
      description: 'Looking for 3 more players for a pickup game',
      isActive: true,
    };
    expect(post.participantsNeeded).toBeGreaterThanOrEqual(1);
    expect(post.isActive).toBe(true);
  });

  it('property: participantsNeeded is always >= 1 for valid posts', () => {
    // Feature: campus-event-finder, Property: SessionPost participantsNeeded constraint
    const postArb = fc.record<SessionPost>({
      id: fc.uuid(),
      creatorId: fc.uuid(),
      sport: fc.string({ minLength: 1 }),
      participantsNeeded: fc.integer({ min: 1, max: 100 }),
      skillLevel: fc.constantFrom('Beginner', 'Intermediate', 'Advanced'),
      scheduledAt: fc.date().map((d) => d.toISOString()),
      description: fc.string({ minLength: 1 }),
      isActive: fc.boolean(),
    });

    fc.assert(
      fc.property(postArb, (post) => {
        expect(post.participantsNeeded).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Student model', () => {
  it('accepts a valid student', () => {
    const student: Student = {
      id: 'stu-1',
      email: 'alice@university.edu',
      displayName: 'Alice',
      passwordHash: '$2b$10$hashedpassword',
    };
    expect(student.email).toContain('@');
  });
});

describe('AuthSession model', () => {
  it('accepts a valid auth session', () => {
    const session: AuthSession = {
      studentId: 'stu-1',
      token: 'eyJhbGciOiJIUzI1NiJ9.payload.signature',
      expiresAt: '2024-09-16T00:00:00Z',
    };
    expect(session.token).toBeDefined();
    expect(new Date(session.expiresAt)).toBeInstanceOf(Date);
  });
});

describe('Coordinates model', () => {
  it('accepts valid coordinates', () => {
    const coords: Coordinates = { latitude: 37.7749, longitude: -122.4194 };
    expect(coords.latitude).toBeGreaterThanOrEqual(-90);
    expect(coords.latitude).toBeLessThanOrEqual(90);
    expect(coords.longitude).toBeGreaterThanOrEqual(-180);
    expect(coords.longitude).toBeLessThanOrEqual(180);
  });
});
