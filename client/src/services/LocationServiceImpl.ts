import type { Coordinates, LocationService } from '@campus-event-finder/shared';

/**
 * Campus boundary polygon loaded from configuration.
 * Stored as an array of [longitude, latitude] pairs forming a closed ring.
 * Requirements: 4.1
 */
const CAMPUS_BOUNDARY: [number, number][] = [
  // TODO: replace with actual campus boundary coordinates
  [-122.4194, 37.7749],
  [-122.4094, 37.7749],
  [-122.4094, 37.7849],
  [-122.4194, 37.7849],
  [-122.4194, 37.7749], // closed ring
];

/**
 * Determines whether a point is inside a polygon using the ray-casting algorithm.
 */
function isPointInPolygon(point: Coordinates, polygon: [number, number][]): boolean {
  const { latitude: y, longitude: x } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Client-side implementation of LocationService using the browser Geolocation API.
 * Requirements: 4.1
 */
export class LocationServiceImpl implements LocationService {
  getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this device'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        }
      );
    });
  }

  isOnCampus(coords: Coordinates): boolean {
    return isPointInPolygon(coords, CAMPUS_BOUNDARY);
  }
}

export { isPointInPolygon };
