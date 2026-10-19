import { apiRequest } from '@/data/services/http';

/**
 * Booking a lab test for yourself (backend services/lab_booking.py).
 *
 * The price is always the server's (the catalogue at booking time). The
 * booking is a real lab order; it reaches the lab only once it is paid, which
 * happens through `PaymentRepository('/lab-orders')`. Nothing here carries a
 * result, a value or a range.
 */

export interface LabPackage {
  id: string;
  name: string;
  pack: string;
  description: string;
  pricePaise: number;
  mrpPaise: number;
  /** The tests the package is made of (names only). */
  includes: string[];
  fastingHours: number;
  reportHours: number;
  preparation: string;
  lab: { id: string; name: string; accreditation: string; homeCollection: boolean };
}

export interface LabSlot {
  id: string;
  slotStart: string;
  slotEnd: string;
  available: number;
}

export type AddressKind = 'HOSTEL' | 'HOME';

export interface LabAddress {
  kind: AddressKind;
  hostelBlock: string;
  room: string;
  line: string;
  city: string;
  pincode: string;
  landmark: string;
}

export type LabPaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';

/** GET /lab-bookings/{id} and POST /lab-bookings. */
export interface LabBooking {
  order: {
    id: string;
    status: string;
    slotStart: string;
    fastingRequired: boolean;
    testPanel: string[];
    collectionAddress: Partial<LabAddress> | null;
    collectorName: string;
    selfBooked: boolean;
    paymentStatus: LabPaymentStatus | null;
    amountPaise: number | null;
  };
  booking: {
    labName: string;
    accreditation: string;
    packageName: string;
    includes: string[];
    fastingHours: number;
    reportHours: number;
    slotEnd: string;
    amountPaise: number | null;
    paymentStatus: LabPaymentStatus | null;
    paymentDueAt: number | null;
  };
}

export class LabBookingRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  async packages(): Promise<LabPackage[]> {
    const res = await this.request<{ items: LabPackage[] }>('/lab-packages');
    if (!Array.isArray(res?.items)) throw new Error('Invalid lab packages response.');
    return res.items;
  }

  async slots(itemId: string): Promise<LabSlot[]> {
    const res = await this.request<{ slots: LabSlot[] }>(`/lab-packages/${encodeURIComponent(itemId)}/slots`);
    if (!Array.isArray(res?.slots)) throw new Error('Invalid slots response.');
    return res.slots;
  }

  /** Same key, same test: the server returns the same booking (a double tap books once). */
  book(itemId: string, slotId: string, address: LabAddress, idempotencyKey: string): Promise<LabBooking> {
    return this.request<LabBooking>('/lab-bookings', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ catalogItemId: itemId, slotId, address: addressBody(address) }),
    });
  }

  /** Move an unpaid booking to another of its lab's slots (the doctor-ordered slot rule). */
  moveSlot(orderId: string, slotId: string): Promise<unknown> {
    return this.request(`/lab-orders/${encodeURIComponent(orderId)}/slot`, {
      method: 'PUT', body: JSON.stringify({ slotId }),
    });
  }

  get(orderId: string): Promise<LabBooking> {
    return this.request<LabBooking>(`/lab-bookings/${encodeURIComponent(orderId)}`);
  }

  /** Cancel an unpaid booking; its slot goes back. */
  cancel(orderId: string): Promise<unknown> {
    return this.request(`/lab-orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }),
    });
  }
}

function addressBody(a: LabAddress) {
  return a.kind === 'HOSTEL'
    ? { kind: 'HOSTEL', hostelBlock: a.hostelBlock.trim(), room: a.room.trim() }
    : { kind: 'HOME', line: a.line.trim(), city: a.city.trim(), pincode: a.pincode.trim(), landmark: a.landmark.trim() };
}

export const labBookingRepository = new LabBookingRepository();
