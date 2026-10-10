import { composeShareContent, ShareServiceImpl } from './ShareServiceImpl';
import type { Event } from '@campus-event-finder/shared';

/**
 * Tests for ShareServiceImpl and composeShareContent
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */

const baseEvent: Event = {
  id: 'evt-1',
  title: 'Spring Concert',
  description: 'A live music event on the main stage.',
  subtype: 'other',
  date: '2024-04-20',
  time: '18:00',
  locationName: 'Main Auditorium',
  campusAddress: '123 Campus Dr',
};

describe('composeShareContent', () => {
  it('includes event title in the title field', () => {
    const content = composeShareContent(baseEvent);
    expect(content.title).toBe('Spring Concert');
  });

  it('includes date and time in the text', () => {
    const content = composeShareContent(baseEvent);
    expect(content.text).toContain('2024-04-20');
    expect(content.text).toContain('18:00');
  });

  it('includes locationName in the text', () => {
    const content = composeShareContent(baseEvent);
    expect(content.text).toContain('Main Auditorium');
  });

  it('includes description in the text', () => {
    const content = composeShareContent(baseEvent);
    expect(content.text).toContain('A live music event on the main stage.');
  });

  it('includes deepLinkUrl as url when set', () => {
    const event: Event = { ...baseEvent, deepLinkUrl: 'https://campus.edu/events/evt-1' };
    const content = composeShareContent(event);
    expect(content.url).toBe('https://campus.edu/events/evt-1');
  });

  it('does NOT include url when deepLinkUrl is not set', () => {
    const content = composeShareContent(baseEvent);
    expect(content.url).toBeUndefined();
    expect('url' in content).toBe(false);
  });
});

describe('ShareServiceImpl.shareEvent', () => {
  let service: ShareServiceImpl;

  beforeEach(() => {
    service = new ShareServiceImpl();
  });

  afterEach(() => {
    // Restore navigator.share after each test
    Object.defineProperty(globalThis.navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('calls navigator.share with the composed content', async () => {
    const mockShare = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    const event: Event = { ...baseEvent, deepLinkUrl: 'https://campus.edu/events/evt-1' };
    await service.shareEvent(event);

    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare).toHaveBeenCalledWith(composeShareContent(event));
  });

  it('throws "Sharing is not supported on this device" when navigator.share is undefined', async () => {
    Object.defineProperty(globalThis.navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    await expect(service.shareEvent(baseEvent)).rejects.toThrow(
      'Sharing is not supported on this device'
    );
  });

  it('propagates errors thrown by navigator.share', async () => {
    const shareError = new Error('Share cancelled by user');
    const mockShare = jest.fn().mockRejectedValue(shareError);
    Object.defineProperty(globalThis.navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    await expect(service.shareEvent(baseEvent)).rejects.toThrow('Share cancelled by user');
  });
});

// Feature: campus-event-finder, Property 19: Share content composition completeness
import * as fc from 'fast-check';

/**
 * Property 19: Share content composition completeness
 * For any Event object, the composed share content should always include the event's
 * title, date, time, location name, and a plain-text summary; and should include the
 * deepLinkUrl if and only if one is set on the event.
 * Validates: Requirements 9.3, 9.4
 */
describe('Property 19: Share content composition completeness', () => {
  // Arbitrary for a non-empty string (avoids empty strings for meaningful field values)
  const nonEmptyString = fc.string({ minLength: 1, maxLength: 100 });

  // Arbitrary for a valid Event object with optional deepLinkUrl
  const eventArbitrary: fc.Arbitrary<Event> = fc.record({
    id: nonEmptyString,
    title: nonEmptyString,
    description: nonEmptyString,
    subtype: fc.constantFrom('sports', 'technical', 'cultural', 'other') as fc.Arbitrary<'sports' | 'technical' | 'cultural' | 'other'>,
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(
      (d) => d.toISOString().slice(0, 10)
    ),
    time: fc
      .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
      .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
    locationName: nonEmptyString,
    campusAddress: nonEmptyString,
    price: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
    entryRequirements: fc.option(nonEmptyString, { nil: undefined }),
    deepLinkUrl: fc.option(
      fc.webUrl(),
      { nil: undefined }
    ),
  });

  it('always includes title, date, time, locationName, and a plain-text summary', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        const content = composeShareContent(event);

        // title field must equal the event title
        expect(content.title).toBe(event.title);

        // text must contain the event title
        expect(content.text).toContain(event.title);

        // text must contain the event date
        expect(content.text).toContain(event.date);

        // text must contain the event time
        expect(content.text).toContain(event.time);

        // text must contain the location name
        expect(content.text).toContain(event.locationName);

        // text must contain a plain-text summary (description)
        expect(content.text).toContain(event.description);
      }),
      { numRuns: 100 }
    );
  });

  it('includes deepLinkUrl as url if and only if deepLinkUrl is set on the event', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        const content = composeShareContent(event);

        if (event.deepLinkUrl !== undefined) {
          // deepLinkUrl is set — url must be present and equal to deepLinkUrl
          expect(content.url).toBe(event.deepLinkUrl);
        } else {
          // deepLinkUrl is not set — url must be absent
          expect(content.url).toBeUndefined();
          expect('url' in content).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});
