import { ApiError, apiRequest } from '@/data/services/http';
import type { MessageKey } from '@/i18n';

/**
 * Health camp booking and hosting (backend services/health_camps.py). Every
 * value a screen shows comes from these replies: the camps, their slots and
 * places left, the student's booking reference and whether it can still be
 * changed. Hosts get counts per slot, never who booked.
 */

export type CampService = 'GENERAL_SCREENING' | 'EYE_CHECK' | 'DENTAL_CHECK' | 'BLOOD_DONATION' | 'VACCINATION';
export type CampEligibility = 'CAMPUS_VERIFIED' | 'CAMPUS_ANY' | 'OPEN';
export type CampStatus = 'PUBLISHED' | 'PENDING_APPROVAL' | 'DECLINED' | 'CANCELLED';
export type BookingStatus = 'BOOKED' | 'WAITLISTED' | 'CANCELLED' | 'REGISTERED';
export type Ineligible = 'NOT_STUDENT' | 'OTHER_CAMPUS' | 'NOT_VERIFIED';

export interface CampBase {
  id: string;
  name: string;
  /** YYYY-MM-DD. */
  date: string;
  location: string;
  whatToBring: string;
  /** "" = every campus. */
  campus: string;
  services: CampService[];
  eligibility: CampEligibility;
  pricePaise: number;
  hostKind: string;
  status: CampStatus;
}

export interface CampListing extends CampBase {
  capacity: number;
  remaining: number;
  slotCount: number;
  ineligibleReason: Ineligible | null;
  myStatus: BookingStatus | null;
}

export interface CampSlotView {
  id: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
  waitlisted: number;
  waitlistOpen: boolean;
  started: boolean;
}

export interface CampBookingView {
  id: string;
  status: BookingStatus;
  bookingCode: string | null;
  checkedIn: boolean;
  camp: CampBase;
  slot: { id: string; slotStart: string; slotEnd: string } | null;
  waitlistPosition: number | null;
  /** Epoch seconds; null when the slot's time can't be read. */
  changeableUntil: number | null;
  canChange: boolean;
  campCancelled: boolean;
  cancelReason: string | null;
  updatedAt: number;
}

/** POST /camps/{id}/book, /waitlist and /reschedule. */
export interface CampConfirmation {
  bookingId: string;
  bookingCode: string;
  status: BookingStatus;
  waitlistPosition: number | null;
  camp: { id: string; name: string; date: string; location: string; whatToBring: string };
  slot: { id: string; slotStart: string; slotEnd: string };
}

const camp = (id: string) => `/camps/${encodeURIComponent(id)}`;
const post = <T,>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const campsApi = {
  list: () => apiRequest<{ items: CampListing[] }>('/camps').then((r) => r.items),
  mine: () => apiRequest<{ items: CampBookingView[] }>('/camps/bookings/me').then((r) => r.items),
  slots: (id: string) => apiRequest<{ items: CampSlotView[] }>(`${camp(id)}/slots`).then((r) => r.items),
  book: (id: string, slotId: string) => post<CampConfirmation>(`${camp(id)}/book`, { slotId }),
  waitlist: (id: string, slotId: string) => post<CampConfirmation>(`${camp(id)}/waitlist`, { slotId }),
  reschedule: (id: string, slotId: string) => post<CampConfirmation>(`${camp(id)}/reschedule`, { slotId }),
  cancel: (id: string) => post<CampBookingView>(`${camp(id)}/cancel`),
};
export type CampsApi = typeof campsApi;

/** The reason codes the server sends (detail.code), and what the app says for each. */
const REFUSALS: Record<string, MessageKey> = {
  SLOT_FULL: 'camps.err.SLOT_FULL',
  SLOT_OPEN: 'camps.err.SLOT_OPEN',
  SLOT_STARTED: 'camps.err.SLOT_STARTED',
  WAITLIST_FULL: 'camps.err.WAITLIST_FULL',
  TOO_LATE: 'camps.err.TOO_LATE',
  CHECKED_IN: 'camps.err.CHECKED_IN',
  SAME_SLOT: 'camps.err.SAME_SLOT',
  NOT_VERIFIED: 'camps.err.NOT_VERIFIED',
  OTHER_CAMPUS: 'camps.err.OTHER_CAMPUS',
  NOT_STUDENT: 'camps.err.NOT_STUDENT',
  PAYMENT_NOT_AVAILABLE: 'camps.err.PAYMENT_NOT_AVAILABLE',
  SERVICE_HELD: 'camps.err.SERVICE_HELD',
  PAID_CAMPS_OFF: 'camps.err.PAID_CAMPS_OFF',
};

/** The message key for a failed camp request: the server's reason when it gave one we know. */
export function refusalKey(error: unknown): MessageKey {
  if (error instanceof ApiError && error.detail && typeof error.detail === 'object' && !Array.isArray(error.detail)) {
    const code = (error.detail as { code?: unknown }).code;
    if (typeof code === 'string' && REFUSALS[code]) return REFUSALS[code];
  }
  if (error instanceof ApiError && error.status === 0) return 'camps.err.offline';
  return 'camps.err.generic';
}

export const SERVICE_KEYS: Record<CampService, MessageKey> = {
  GENERAL_SCREENING: 'camps.service.GENERAL_SCREENING',
  EYE_CHECK: 'camps.service.EYE_CHECK',
  DENTAL_CHECK: 'camps.service.DENTAL_CHECK',
  BLOOD_DONATION: 'camps.service.BLOOD_DONATION',
  VACCINATION: 'camps.service.VACCINATION',
};

export const INELIGIBLE_KEYS: Record<Ineligible, MessageKey> = {
  NOT_STUDENT: 'camps.err.NOT_STUDENT',
  OTHER_CAMPUS: 'camps.err.OTHER_CAMPUS',
  NOT_VERIFIED: 'camps.ineligible.NOT_VERIFIED',
};

/** "BKQ7 M2XA": the reference in two groups of four, easier to read out at a desk. */
export function groupCode(code: string): string {
  return code.length > 4 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}
