import { getSetting } from '@/data/services/config';
import type { Coordinates } from './types';

/**
 * Asking for the device's position, once, when the student taps "Use my location".
 * The answer stays in the view model's memory: it is never sent to the server,
 * stored, or logged. Each platform passes its own `Locate` (the browser's
 * geolocation here; expo-location in src/native/deviceLocation.ts).
 */
export type LocationResult =
  | { status: 'granted'; coordinates: Coordinates }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'timeout' }
  | { status: 'unsupported' };

export type Locate = () => Promise<LocationResult>;

const MS_PER_SECOND = 1000;
// W3C GeolocationPositionError codes.
const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

/** The browser's geolocation, coarse (no high-accuracy fix is needed to sort a list). */
export const browserLocate: Locate = () => new Promise((resolve) => {
  const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
  if (!geo) {
    resolve({ status: 'unsupported' });
    return;
  }
  geo.getCurrentPosition(
    (position) => resolve({ status: 'granted', coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude } }),
    (error) => resolve({ status: error.code === PERMISSION_DENIED ? 'denied' : error.code === TIMEOUT ? 'timeout' : 'unavailable' }),
    {
      enableHighAccuracy: false,
      timeout: getSetting('care_directory.location_timeout_seconds') * MS_PER_SECOND,
      maximumAge: getSetting('care_directory.location_max_age_seconds') * MS_PER_SECOND,
    },
  );
});
