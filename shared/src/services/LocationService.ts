import type { Coordinates } from '../models/Coordinates';

/**
 * Determines the student's location context (on/off campus).
 * Requirements: 4.1
 */
export interface LocationService {
  /**
   * Returns the device's current geographic coordinates.
   * Throws if geolocation is unavailable or permission is denied.
   */
  getCurrentLocation(): Promise<Coordinates>;

  /**
   * Returns true if the given coordinates fall within the campus boundary polygon.
   * Requirements: 4.1
   */
  isOnCampus(coords: Coordinates): boolean;
}
