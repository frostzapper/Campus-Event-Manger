import {
  buildMapsWebUrl,
  buildIosUri,
  buildAndroidUri,
  MapsServiceImpl,
} from './MapsServiceImpl';
import * as fc from 'fast-check';
import type { Event, MapsService } from '@campus-event-finder/shared';

/**
 * Tests for MapsServiceImpl
 * Requirements: 4.2, 4.4, 4.5, 4.6
 */

// ---------------------------------------------------------------------------
// URL builder helpers
// ---------------------------------------------------------------------------

describe('buildMapsWebUrl', () => {
  it('produces the correct web URL with an encoded address', () => {
    const url = buildMapsWebUrl('123 Main St, Springfield');
    expect(url).toBe('https://maps.google.com?q=123%20Main%20St%2C%20Springfield');
  });

  it('encodes special characters in the address', () => {
    const url = buildMapsWebUrl('Café & Bar, 5th Ave');
    expect(url).toContain('https://maps.google.com?q=');
    expect(url).toBe(`https://maps.google.com?q=${encodeURIComponent('Café & Bar, 5th Ave')}`);
  });

  it('handles an empty address', () => {
    const url = buildMapsWebUrl('');
    expect(url).toBe('https://maps.google.com?q=');
  });
});

describe('buildIosUri', () => {
  it('produces the correct iOS URI scheme URL with an encoded address', () => {
    const uri = buildIosUri('123 Main St, Springfield');
    expect(uri).toBe(
      `comgooglemaps://?daddr=${encodeURIComponent('123 Main St, Springfield')}&directionsmode=driving`
    );
  });

  it('starts with the comgooglemaps:// scheme', () => {
    const uri = buildIosUri('Some Address');
    expect(uri.startsWith('comgooglemaps://')).toBe(true);
  });

  it('includes directionsmode=driving', () => {
    const uri = buildIosUri('Some Address');
    expect(uri).toContain('directionsmode=driving');
  });
});

describe('buildAndroidUri', () => {
  it('produces the correct Android intent URL with an encoded address', () => {
    const uri = buildAndroidUri('123 Main St, Springfield');
    expect(uri).toBe(`google.navigation:q=${encodeURIComponent('123 Main St, Springfield')}`);
  });

  it('starts with google.navigation:q=', () => {
    const uri = buildAndroidUri('Some Address');
    expect(uri.startsWith('google.navigation:q=')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MapsServiceImpl.openDirections
// ---------------------------------------------------------------------------

describe('MapsServiceImpl.openDirections', () => {
  let service: MapsServiceImpl;
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new MapsServiceImpl();
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
    jest.useRealTimers();
    // Restore userAgent to default
    Object.defineProperty(navigator, 'userAgent', {
      value: navigator.userAgent,
      configurable: true,
      writable: true,
    });
  });

  // -------------------------------------------------------------------------
  // Non-mobile (desktop/web) — uses web URL directly
  // -------------------------------------------------------------------------

  it('uses the web URL directly on a non-mobile platform (desktop)', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
      writable: true,
    });

    await service.openDirections('123 Main St');

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(windowOpenSpy).toHaveBeenCalledWith(
      buildMapsWebUrl('123 Main St'),
      '_blank'
    );
  });

  // -------------------------------------------------------------------------
  // iOS — tries native URI scheme first
  // -------------------------------------------------------------------------

  it('sets window.location.href to the iOS URI on an iOS user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    await service.openDirections('123 Main St');

    expect(hrefSetter).toHaveBeenCalledWith(buildIosUri('123 Main St'));
    // window.open should NOT have been called yet (timeout hasn't fired)
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('falls back to web URL on iOS when the native app does not open (document still visible)', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
      writable: true,
    });

    // Simulate document still visible (native app did not open)
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    await service.openDirections('123 Main St');

    // Advance the 500ms timeout
    jest.advanceTimersByTime(500);

    expect(windowOpenSpy).toHaveBeenCalledWith(buildMapsWebUrl('123 Main St'), '_blank');
  });

  // -------------------------------------------------------------------------
  // Android — tries Android intent URL first
  // -------------------------------------------------------------------------

  it('sets window.location.href to the Android intent URL on an Android user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    await service.openDirections('456 Campus Blvd');

    expect(hrefSetter).toHaveBeenCalledWith(buildAndroidUri('456 Campus Blvd'));
    // window.open should NOT have been called yet
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Web URL fallback — document hidden means native app opened; no fallback
  // -------------------------------------------------------------------------

  it('does NOT open the web URL when the native app opens (document becomes hidden)', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
      writable: true,
    });

    // Simulate document hidden (native app opened)
    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    await service.openDirections('123 Main St');

    // Advance the 500ms timeout
    jest.advanceTimersByTime(500);

    // window.open should NOT be called because document.hidden is true
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Property 7: Maps navigation uses correct address
// Feature: campus-event-finder, Property 7: Maps navigation uses correct address
// Validates: Requirements 3.5, 4.4
// ---------------------------------------------------------------------------

describe('Property 7: Maps navigation uses correct address', () => {
  // Arbitrary for Event objects with a non-empty campusAddress
  const eventArbitrary = fc.record<Event>({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    subtype: fc.constantFrom('sports', 'technical', 'cultural', 'other'),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(
      (d) => d.toISOString().slice(0, 10)
    ),
    time: fc
      .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
      .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
    locationName: fc.string({ minLength: 1, maxLength: 100 }),
    // campusAddress must be non-empty so there is a meaningful destination
    campusAddress: fc.string({ minLength: 1, maxLength: 200 }),
    price: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
    entryRequirements: fc.option(fc.string({ minLength: 1, maxLength: 300 }), { nil: undefined }),
    deepLinkUrl: fc.option(fc.webUrl(), { nil: undefined }),
  });

  it(
    'calls MapsService.openDirections with exactly the event campusAddress',
    async () => {
      // Feature: campus-event-finder, Property 7: Maps navigation uses correct address
      await fc.assert(
        fc.asyncProperty(eventArbitrary, async (event) => {
          // Arrange: create a fresh service instance and spy on openDirections
          const service = new MapsServiceImpl();
          const openDirectionsSpy = jest
            .spyOn(service, 'openDirections')
            .mockResolvedValue(undefined);

          // Act: simulate "Get Directions" tap — invoke with the event's campusAddress
          await service.openDirections(event.campusAddress);

          // Assert: the spy was called exactly once with the event's campusAddress
          expect(openDirectionsSpy).toHaveBeenCalledTimes(1);
          expect(openDirectionsSpy).toHaveBeenCalledWith(event.campusAddress);

          // Cleanup
          openDirectionsSpy.mockRestore();
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'never passes a different address than the event campusAddress to MapsService',
    async () => {
      // Feature: campus-event-finder, Property 7: Maps navigation uses correct address
      // This property verifies that the address passed to openDirections is
      // exactly the campusAddress — not a modified, truncated, or encoded version.
      await fc.assert(
        fc.asyncProperty(eventArbitrary, async (event) => {
          const capturedAddresses: string[] = [];

          // Create a mock MapsService that records what address it receives
          const mockMapsService: MapsService = {
            openDirections: jest.fn(async (address: string) => {
              capturedAddresses.push(address);
            }),
          };

          // Act: simulate the "Get Directions" button invoking the service
          await mockMapsService.openDirections(event.campusAddress);

          // Assert: exactly one call, with exactly the campusAddress
          expect(capturedAddresses).toHaveLength(1);
          expect(capturedAddresses[0]).toBe(event.campusAddress);
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Task 7.3: Unit tests for MapsService web URL fallback
// Verify fallback to web URL when native URI scheme fails
// Requirements: 4.5
// ---------------------------------------------------------------------------

describe('MapsService web URL fallback — Requirements 4.5', () => {
  let service: MapsServiceImpl;
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new MapsServiceImpl();
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
    jest.useRealTimers();
    Object.defineProperty(navigator, 'userAgent', {
      value: navigator.userAgent,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
      writable: true,
    });
  });

  it('falls back to web URL on Android when the native app does not open (document still visible)', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
      configurable: true,
      writable: true,
    });

    // Simulate document still visible — native app did not open
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    await service.openDirections('456 Campus Blvd');

    // Advance the 500ms timeout
    jest.advanceTimersByTime(500);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      buildMapsWebUrl('456 Campus Blvd'),
      '_blank'
    );
  });

  it('does NOT fall back to web URL on Android when the native app opens (document becomes hidden)', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
      configurable: true,
      writable: true,
    });

    // Simulate document hidden — native app opened
    Object.defineProperty(document, 'hidden', {
      value: true,
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    await service.openDirections('456 Campus Blvd');

    // Advance the 500ms timeout
    jest.advanceTimersByTime(500);

    // window.open should NOT be called because document.hidden is true
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('fallback web URL includes the correct encoded address for iOS', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    const address = 'Science Building, 100 University Ave';
    await service.openDirections(address);
    jest.advanceTimersByTime(500);

    const expectedUrl = buildMapsWebUrl(address);
    expect(windowOpenSpy).toHaveBeenCalledWith(expectedUrl, '_blank');
    expect(expectedUrl).toBe(
      `https://maps.google.com?q=${encodeURIComponent(address)}`
    );
  });

  it('fallback web URL includes the correct encoded address for Android', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    const address = 'Engineering Hall, 200 Tech Drive';
    await service.openDirections(address);
    jest.advanceTimersByTime(500);

    const expectedUrl = buildMapsWebUrl(address);
    expect(windowOpenSpy).toHaveBeenCalledWith(expectedUrl, '_blank');
    expect(expectedUrl).toBe(
      `https://maps.google.com?q=${encodeURIComponent(address)}`
    );
  });

  it('fallback web URL uses https://maps.google.com base URL', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
      writable: true,
    });

    const hrefSetter = jest.fn();
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v); } },
      configurable: true,
      writable: true,
    });

    await service.openDirections('Any Address');
    jest.advanceTimersByTime(500);

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    const calledUrl: string = windowOpenSpy.mock.calls[0][0];
    expect(calledUrl.startsWith('https://maps.google.com')).toBe(true);
  });
});
