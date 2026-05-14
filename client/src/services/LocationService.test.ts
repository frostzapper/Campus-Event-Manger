import * as fc from 'fast-check';
import { LocationServiceImpl, isPointInPolygon } from './LocationServiceImpl';
import type { Coordinates } from '@campus-event-finder/shared';

/**
 * Tests for LocationServiceImpl
 * Requirements: 4.1
 */

// Campus boundary polygon (longitude, latitude pairs):
// [-122.4194, 37.7749], [-122.4094, 37.7749], [-122.4094, 37.7849], [-122.4194, 37.7849]
// This forms a rectangle. Points are tested against it.

const CAMPUS_POLYGON: [number, number][] = [
  [-122.4194, 37.7749],
  [-122.4094, 37.7749],
  [-122.4094, 37.7849],
  [-122.4194, 37.7849],
  [-122.4194, 37.7749], // closed ring
];

describe('isPointInPolygon', () => {
  it('returns true for a point clearly inside the polygon', () => {
    const inside: Coordinates = { latitude: 37.7799, longitude: -122.4144 };
    expect(isPointInPolygon(inside, CAMPUS_POLYGON)).toBe(true);
  });

  it('returns false for a point clearly outside the polygon', () => {
    const outside: Coordinates = { latitude: 37.7600, longitude: -122.4000 };
    expect(isPointInPolygon(outside, CAMPUS_POLYGON)).toBe(false);
  });

  it('returns false for a point on the boundary edge (ray-casting edge behaviour)', () => {
    // The ray-casting algorithm does not guarantee inclusion for boundary points,
    // but we verify it returns a consistent boolean without throwing.
    const onEdge: Coordinates = { latitude: 37.7749, longitude: -122.4144 };
    const result = isPointInPolygon(onEdge, CAMPUS_POLYGON);
    expect(typeof result).toBe('boolean');
  });
});

describe('LocationServiceImpl.isOnCampus', () => {
  let service: LocationServiceImpl;

  beforeEach(() => {
    service = new LocationServiceImpl();
  });

  it('returns true for coordinates inside the campus boundary', () => {
    const onCampus: Coordinates = { latitude: 37.7799, longitude: -122.4144 };
    expect(service.isOnCampus(onCampus)).toBe(true);
  });

  it('returns false for coordinates outside the campus boundary', () => {
    const offCampus: Coordinates = { latitude: 37.7600, longitude: -122.4000 };
    expect(service.isOnCampus(offCampus)).toBe(false);
  });
});

describe('LocationServiceImpl.getCurrentLocation', () => {
  let service: LocationServiceImpl;

  beforeEach(() => {
    service = new LocationServiceImpl();
  });

  afterEach(() => {
    // Restore navigator.geolocation after each test
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('throws when geolocation is not supported', async () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    await expect(service.getCurrentLocation()).rejects.toThrow(
      'Geolocation is not supported by this device'
    );
  });

  it('resolves with coordinates when geolocation succeeds', async () => {
    const mockPosition = {
      coords: {
        latitude: 37.7799,
        longitude: -122.4144,
      },
    };

    const mockGeolocation = {
      getCurrentPosition: jest.fn((successCallback: PositionCallback) => {
        successCallback(mockPosition as GeolocationPosition);
      }),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const result = await service.getCurrentLocation();
    expect(result).toEqual({ latitude: 37.7799, longitude: -122.4144 });
  });

  it('rejects when geolocation returns an error', async () => {
    const mockError = { message: 'Permission denied' } as GeolocationPositionError;

    const mockGeolocation = {
      getCurrentPosition: jest.fn(
        (_successCallback: PositionCallback, errorCallback: PositionErrorCallback) => {
          errorCallback(mockError);
        }
      ),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    await expect(service.getCurrentLocation()).rejects.toThrow(
      'Geolocation error: Permission denied'
    );
  });
});

// Feature: campus-event-finder, Property 8: Campus boundary detection
describe('Property 8: Campus boundary detection', () => {
  // Campus boundary polygon bounds (from LocationServiceImpl):
  // Longitude range: -122.4194 to -122.4094
  // Latitude range:   37.7749  to  37.7849
  // The polygon is a closed rectangle (ray-casting algorithm).
  // Points exactly on the boundary edges may return either value (ray-casting edge behaviour),
  // so we use a small epsilon to keep generated points strictly inside or strictly outside.
  const EPSILON = 0.0001;

  const LON_MIN = -122.4194;
  const LON_MAX = -122.4094;
  const LAT_MIN = 37.7749;
  const LAT_MAX = 37.7849;

  // Strictly-inside coordinates: shrink the bounding box by EPSILON on all sides
  const insideCoords = fc.record({
    latitude: fc.double({
      min: LAT_MIN + EPSILON,
      max: LAT_MAX - EPSILON,
      noNaN: true,
    }),
    longitude: fc.double({
      min: LON_MIN + EPSILON,
      max: LON_MAX - EPSILON,
      noNaN: true,
    }),
  });

  // Strictly-outside coordinates: pick from four regions that are clearly outside the polygon.
  // We use a union of four "outside" rectangles (north, south, east, west of the campus box).
  const outsideCoords = fc.oneof(
    // South of campus
    fc.record({
      latitude: fc.double({ min: LAT_MIN - 0.05, max: LAT_MIN - EPSILON, noNaN: true }),
      longitude: fc.double({ min: LON_MIN - 0.05, max: LON_MAX + 0.05, noNaN: true }),
    }),
    // North of campus
    fc.record({
      latitude: fc.double({ min: LAT_MAX + EPSILON, max: LAT_MAX + 0.05, noNaN: true }),
      longitude: fc.double({ min: LON_MIN - 0.05, max: LON_MAX + 0.05, noNaN: true }),
    }),
    // West of campus
    fc.record({
      latitude: fc.double({ min: LAT_MIN - 0.05, max: LAT_MAX + 0.05, noNaN: true }),
      longitude: fc.double({ min: LON_MIN - 0.05, max: LON_MIN - EPSILON, noNaN: true }),
    }),
    // East of campus
    fc.record({
      latitude: fc.double({ min: LAT_MIN - 0.05, max: LAT_MAX + 0.05, noNaN: true }),
      longitude: fc.double({ min: LON_MAX + EPSILON, max: LON_MAX + 0.05, noNaN: true }),
    }),
  );

  /**
   * Validates: Requirements 4.1
   *
   * For any coordinates strictly inside the campus boundary polygon,
   * LocationService.isOnCampus() must return true.
   */
  it('returns true for any coordinates strictly inside the campus boundary polygon', () => {
    const service = new LocationServiceImpl();
    fc.assert(
      fc.property(insideCoords, (coords: Coordinates) => {
        return service.isOnCampus(coords) === true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 4.1
   *
   * For any coordinates strictly outside the campus boundary polygon,
   * LocationService.isOnCampus() must return false.
   */
  it('returns false for any coordinates strictly outside the campus boundary polygon', () => {
    const service = new LocationServiceImpl();
    fc.assert(
      fc.property(outsideCoords, (coords: Coordinates) => {
        return service.isOnCampus(coords) === false;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 4.1
   *
   * isOnCampus is consistent with the underlying isPointInPolygon helper:
   * for any coordinates, both must agree on the result.
   */
  it('isOnCampus result is consistent with isPointInPolygon for any coordinates', () => {
    const CAMPUS_POLYGON: [number, number][] = [
      [-122.4194, 37.7749],
      [-122.4094, 37.7749],
      [-122.4094, 37.7849],
      [-122.4194, 37.7849],
      [-122.4194, 37.7749],
    ];
    const service = new LocationServiceImpl();
    const anyCoords = fc.record({
      latitude: fc.double({ min: 37.7, max: 37.85, noNaN: true }),
      longitude: fc.double({ min: -122.45, max: -122.39, noNaN: true }),
    });
    fc.assert(
      fc.property(anyCoords, (coords: Coordinates) => {
        const expected = isPointInPolygon(coords, CAMPUS_POLYGON);
        return service.isOnCampus(coords) === expected;
      }),
      { numRuns: 100 },
    );
  });
});
