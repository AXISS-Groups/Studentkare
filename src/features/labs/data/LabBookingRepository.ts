import { apiRequest } from '@/data/services/http';

/**
 * A student books a catalogue lab test from the shop (backend POST /api/lab-orders,
 * services/clinical_api.py + services/lab_booking.py).
 *
 * Rule L: none of these clinical endpoints carries a price. The booking returns
 * the opaque id of the order that pays for it (`paymentOrderId`); the amount
 * comes from the order payment path (PaymentRepository), never from here.
 */

export type CollectionMode = 'HOSTEL' | 'HOME' | 'WALK_IN';

export interface LabSlot {
  id: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  booked: number;
  available: number;
}

/** GET /api/lab-tests/{catalogItemId}/booking-options */
export interface BookingOptions {
  lab: { id: string; name: string } | null;
  /** The lab collects in hostels and at home. */
  homeCollection: boolean;
  slots: LabSlot[];
}

export type CollectionAddress =
  | { line1: string; line2: string; pincode: string }
  | { hostelBlock: string; room: string }
  | null;

/** The student's own lab order, as POST /lab-orders and GET /lab-orders return it (the fields used here). */
export interface LabBooking {
  id: string;
  status: string;
  testPanel: string[];
  slotStart: string;
  collectionMode: CollectionMode;
  collectionAddress: CollectionAddress;
  paymentOrderId: string;
  labName?: string;
}

export interface BookingRequest {
  catalogItemId: string;
  slotId: string;
  collectionMode: CollectionMode;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
  hostelBlock?: string;
  hostelRoom?: string;
}

const MODES: readonly string[] = ['HOSTEL', 'HOME', 'WALK_IN'];

/** Only what the server is known to send is trusted; anything else is treated as a failed response. */
export function isLabBooking(value: unknown): value is LabBooking {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && v.id.length > 0 && typeof v.status === 'string' &&
    Array.isArray(v.testPanel) && typeof v.slotStart === 'string' &&
    typeof v.collectionMode === 'string' && MODES.includes(v.collectionMode) &&
    typeof v.paymentOrderId === 'string';
}

function isSlot(value: unknown): value is LabSlot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.id === 'string' && typeof s.slotStart === 'string' && typeof s.slotEnd === 'string' &&
    Number.isInteger(s.capacity) && Number.isInteger(s.booked) && Number.isInteger(s.available);
}

export class LabBookingRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  async options(catalogItemId: string): Promise<BookingOptions> {
    const res = await this.request<BookingOptions>(`/lab-tests/${encodeURIComponent(catalogItemId)}/booking-options`);
    if (!res || !Array.isArray(res.slots)) throw new Error('invalid booking options');
    return { lab: res.lab ?? null, homeCollection: res.homeCollection === true, slots: res.slots.filter(isSlot) };
  }

  /** Holds the slot and creates the unpaid booking. Same key + same body returns the same booking. */
  async book(body: BookingRequest, idempotencyKey: string): Promise<LabBooking> {
    const res = await this.request<unknown>('/lab-orders', {
      method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body),
    });
    if (!isLabBooking(res)) throw new Error('invalid booking response');
    return res;
  }

  /** The student's booking as the server now has it (BOOKED once its order is paid). */
  async find(bookingId: string): Promise<LabBooking | null> {
    const res = await this.request<{ items: unknown[] }>('/lab-orders?limit=20');
    const items = Array.isArray(res?.items) ? res.items.filter(isLabBooking) : [];
    return items.find(item => item.id === bookingId) ?? null;
  }
}

export const labBookingRepository = new LabBookingRepository();
