import type { Coordinates } from './types';

/**
 * Distance and hand-offs computed on the device. The student's position is
 * passed in from memory and never leaves this module: no request, no storage.
 */
const EARTH_RADIUS_KM = 6371.0088;
const DEGREES_TO_RADIANS = Math.PI / 180;
const METRES_PER_KM = 1000;
/** Below this, "850 m"; above it, kilometres. */
const METRES_SHOWN_BELOW_KM = 1;
/** Below this, one decimal ("4.2 km"); above it, whole kilometres. */
const DECIMAL_BELOW_KM = 10;
const METRE_STEP = 50;

/** Great-circle distance (haversine), in kilometres. */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = (to.latitude - from.latitude) * DEGREES_TO_RADIANS;
  const dLon = (to.longitude - from.longitude) * DEGREES_TO_RADIANS;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(from.latitude * DEGREES_TO_RADIANS) * Math.cos(to.latitude * DEGREES_TO_RADIANS) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type DistanceParts = { unit: 'm'; value: number } | { unit: 'km'; value: string };

/** A distance in the units a person reads: 50 m steps under 1 km, then 4.2 km, then 12 km. */
export function distanceParts(km: number): DistanceParts {
  if (km < METRES_SHOWN_BELOW_KM) return { unit: 'm', value: Math.max(METRE_STEP, Math.round((km * METRES_PER_KM) / METRE_STEP) * METRE_STEP) };
  return { unit: 'km', value: km < DECIMAL_BELOW_KM ? km.toFixed(1) : String(Math.round(km)) };
}

/**
 * Directions in the device's maps app: the Google Maps directions URL with the
 * destination's coordinates (no API key; Android and iOS hand it to the maps app,
 * a browser opens Google Maps). The origin is left to the maps app.
 */
export function directionsUrl(to: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.latitude},${to.longitude}`;
}

/** The place itself on a map (the detail's "Open in Maps"). */
export function mapUrl(to: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${to.latitude},${to.longitude}`;
}

/** A dialable tel: link: digits and a leading + only. */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
