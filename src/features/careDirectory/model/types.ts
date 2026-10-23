/**
 * The care directory's contract (GET /api/care-directory, services/care_directory.py).
 * Every listing was verified by StudentKare or a campus; nothing here is a bed count,
 * rating, review or distance. Distance is computed on the device (./geo.ts) only when
 * the student shares their location, and never sent anywhere.
 */
export type FacilityKind = 'HOSPITAL' | 'CLINIC' | 'PHARMACY' | 'AMBULANCE' | 'BLOOD_BANK';
export type FacilitySource = 'CURATED' | 'PARTNER';
export type PlaceSegment = 'hospitals' | 'pharmacies' | 'ambulance';
export type DirectorySegment = PlaceSegment | 'doctors';

export const PLACE_SEGMENTS: readonly PlaceSegment[] = ['hospitals', 'pharmacies', 'ambulance'];
export const DIRECTORY_SEGMENTS: readonly DirectorySegment[] = ['hospitals', 'pharmacies', 'ambulance', 'doctors'];
export const FACILITY_KINDS: readonly FacilityKind[] = ['HOSPITAL', 'CLINIC', 'PHARMACY', 'AMBULANCE', 'BLOOD_BANK'];

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Facility {
  id: string;
  source: FacilitySource;
  kind: FacilityKind;
  name: string;
  departments: string[];
  address: string;
  area: string;
  pincode: string;
  coordinates: Coordinates | null;
  phone: string | null;
  emergency24x7: boolean;
  hoursText: string | null;
  /** ISO date of the last check (always set: unverified listings never reach the app). */
  verifiedOn: string | null;
  /** How it was checked, as the admin wrote it ("" for a partner). */
  sourceNote: string;
  sourceUrl: string | null;
  /** The campus a listing is for; null = every campus. */
  campus: string | null;
}

export interface RegistryStatus {
  provider: string;
  configured: boolean;
  state: 'NOT_CONFIGURED' | 'NOT_BUILT';
  message: string;
}

export interface DirectoryPage {
  items: Facility[];
  total: number;
  rankedBy: string;
  registry: RegistryStatus;
}

export function isPlaceSegment(value: unknown): value is PlaceSegment {
  return typeof value === 'string' && (PLACE_SEGMENTS as readonly string[]).includes(value);
}

export function isDirectorySegment(value: unknown): value is DirectorySegment {
  return typeof value === 'string' && (DIRECTORY_SEGMENTS as readonly string[]).includes(value);
}
