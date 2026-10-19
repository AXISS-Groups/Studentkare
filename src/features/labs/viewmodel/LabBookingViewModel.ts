import { makeAutoObservable, reaction, runInAction, type IReactionDisposer } from 'mobx';
import type { MessageKey } from '@/i18n';
import { ApiError } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import {
  labBookingRepository,
  type BookingRequest,
  type CollectionMode,
  type LabBooking,
  type LabBookingRepository,
  type LabSlot,
} from '../data/LabBookingRepository';

export type LabBookingPhase =
  | 'loading'      // reading the lab's open times
  | 'unbookable'   // no lab takes bookings for this test, or no time is open
  | 'loadError'
  | 'form'         // choose a time and where the sample is collected
  | 'booking'      // holding the time and creating the booking
  | 'pay'          // the order payment step (PayStepView)
  | 'confirming'   // paid: asking the server whether the booking reached the lab
  | 'booked'       // the lab has it
  | 'confirmPending'; // paid, but the server has not moved the booking yet

export type AddressField = 'addressLine1' | 'addressLine2' | 'pincode' | 'hostelBlock' | 'hostelRoom';

export interface LabTest {
  catalogItemId: string;
  name: string;
  /** The shop's price, shown before commitment. The Pay step shows the server's amount. */
  pricePaise: number;
  /** The catalogue's preparation instructions, if any (e.g. fasting). */
  preparation: string;
}

const PINCODE = /^[1-9][0-9]{5}$/;

function newKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Booking a lab test from the shop (canvas LabPackages sheet, SK-036, Tier 2),
 * then paying for it on the order Pay step (SK-063), ending on the booked state.
 *
 * The server decides everything that matters: the slot is held when the booking
 * is created, the price comes from the order, and the booking reaches the lab
 * only once that order is paid. Nothing here shows a result or a clinical value.
 */
export class LabBookingViewModel implements ViewModel {
  phase: LabBookingPhase = 'loading';
  labName = '';
  homeCollection = false;
  slots: LabSlot[] = [];
  slotId = '';
  mode: CollectionMode = 'WALK_IN';
  address: Record<AddressField, string> = { addressLine1: '', addressLine2: '', pincode: '', hostelBlock: '', hostelRoom: '' };
  /** Shown once the student has tried to continue. */
  showErrors = false;
  /** A message key, or the server's own sentence for a refusal it explained (409/503). */
  error: { key: MessageKey } | { raw: string } | null = null;
  booking: LabBooking | null = null;
  payment: PayStepViewModel | null = null;
  private idempotency = { fingerprint: '', key: '' };
  private modeChosen = false;
  private stopWatchingPayment: IReactionDisposer | null = null;
  private disposed = false;

  constructor(
    readonly test: LabTest,
    private readonly repository: LabBookingRepository = labBookingRepository,
    private readonly makePayment: (orderId: string, amountPaise: number) => PayStepViewModel =
      (orderId, amountPaise) => new PayStepViewModel(orderId, amountPaise),
  ) {
    makeAutoObservable<LabBookingViewModel, 'idempotency' | 'modeChosen' | 'stopWatchingPayment' | 'disposed' | 'repository' | 'makePayment'>(
      this,
      { test: false, idempotency: false, modeChosen: false, stopWatchingPayment: false, disposed: false, repository: false, makePayment: false },
      { autoBind: true },
    );
  }

  get selectedSlot(): LabSlot | null {
    return this.slots.find(slot => slot.id === this.slotId) ?? null;
  }

  /** Modes this lab offers. Hostel and home need a lab that collects. */
  get modes(): CollectionMode[] {
    return this.homeCollection ? ['HOSTEL', 'HOME', 'WALK_IN'] : ['WALK_IN'];
  }

  /** Field-level problems, mirroring the server's rules (the server checks again). */
  get fieldErrors(): Partial<Record<AddressField | 'slot', MessageKey>> {
    const errors: Partial<Record<AddressField | 'slot', MessageKey>> = {};
    if (!this.selectedSlot) errors.slot = 'care.labBook.error.slot';
    if (this.mode === 'HOME') {
      if (this.address.addressLine1.trim().length < 5) errors.addressLine1 = 'care.labBook.error.address';
      if (!PINCODE.test(this.address.pincode.trim())) errors.pincode = 'care.labBook.error.pincode';
    }
    if (this.mode === 'HOSTEL') {
      if (!this.address.hostelBlock.trim()) errors.hostelBlock = 'care.labBook.error.block';
      if (!this.address.hostelRoom.trim()) errors.hostelRoom = 'care.labBook.error.room';
    }
    return errors;
  }

  get canSubmit(): boolean {
    return this.phase === 'form' && Object.keys(this.fieldErrors).length === 0;
  }

  /** Short reference for copy and support (the lab order's id, never a provider id). */
  get reference(): string {
    return (this.booking?.id ?? '').slice(0, 8).toUpperCase();
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    this.error = null;
    try {
      const options = await this.repository.options(this.test.catalogItemId);
      if (this.disposed) return;
      runInAction(() => {
        const now = Date.now();
        this.labName = options.lab?.name ?? '';
        this.homeCollection = options.homeCollection;
        this.slots = options.slots.filter(slot => Date.parse(slot.slotStart) > now && slot.available > 0);
        if (!this.slots.some(slot => slot.id === this.slotId)) this.slotId = '';
        // The canvas leads with collection at the student's block when the lab offers it.
        if (!this.modeChosen || !this.modes.includes(this.mode)) this.mode = this.modes[0];
        this.phase = options.lab && this.slots.length ? 'form' : 'unbookable';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'loadError'; });
    }
  }

  setSlot(slotId: string): void {
    this.slotId = slotId;
  }

  setMode(mode: CollectionMode): void {
    if (!this.modes.includes(mode)) return;
    this.mode = mode;
    this.modeChosen = true;
  }

  setField(field: AddressField, value: string): void {
    this.address = { ...this.address, [field]: value };
  }

  private request(): BookingRequest {
    const a = this.address;
    const base: BookingRequest = { catalogItemId: this.test.catalogItemId, slotId: this.slotId, collectionMode: this.mode };
    if (this.mode === 'HOME') {
      return { ...base, addressLine1: a.addressLine1.trim(), addressLine2: a.addressLine2.trim(), pincode: a.pincode.trim() };
    }
    if (this.mode === 'HOSTEL') return { ...base, hostelBlock: a.hostelBlock.trim(), hostelRoom: a.hostelRoom.trim() };
    return base;
  }

  async submit(): Promise<void> {
    if (this.phase !== 'form') return;
    this.showErrors = true;
    if (!this.canSubmit) return;
    const body = this.request();
    const fingerprint = JSON.stringify(body);
    // The same request keeps its key, so a retry after a lost answer returns the same booking.
    if (this.idempotency.fingerprint !== fingerprint) this.idempotency = { fingerprint, key: newKey() };
    this.phase = 'booking';
    this.error = null;
    try {
      const booking = await this.repository.book(body, this.idempotency.key);
      if (this.disposed) return;
      runInAction(() => {
        this.booking = booking;
        this.payment = this.makePayment(booking.paymentOrderId, this.test.pricePaise);
        this.phase = 'pay';
      });
      this.watchPayment();
    } catch (error) {
      if (this.disposed) return;
      runInAction(() => {
        this.phase = 'form';
        if (error instanceof ApiError && (error.status === 409 || error.status === 503 || error.status === 404) && error.message) {
          // The server's own sentence: the time was taken, payment isn't connected, or the test is gone.
          this.error = { raw: error.message };
          if (error.status === 409) void this.reloadSlots();
        } else if (error instanceof ApiError && error.status === 422) {
          this.error = { key: 'care.labBook.error.invalid' };
        } else {
          this.error = { key: 'care.labBook.error.submit' };
        }
      });
    }
  }

  private async reloadSlots(): Promise<void> {
    try {
      const options = await this.repository.options(this.test.catalogItemId);
      if (this.disposed) return;
      runInAction(() => {
        const now = Date.now();
        this.slots = options.slots.filter(slot => Date.parse(slot.slotStart) > now && slot.available > 0);
        if (!this.slots.some(slot => slot.id === this.slotId)) this.slotId = '';
      });
    } catch {
      // Keep what is shown; the student can try again.
    }
  }

  private watchPayment(): void {
    this.stopWatchingPayment?.();
    const payment = this.payment;
    if (!payment) return;
    this.stopWatchingPayment = reaction(() => payment.phase, phase => { if (phase === 'paid') void this.confirm(); });
  }

  /** After payment: the booking is the lab's only once the server says BOOKED. */
  async confirm(): Promise<void> {
    const booking = this.booking;
    if (!booking || this.phase === 'confirming') return;
    this.phase = 'confirming';
    try {
      const current = await this.repository.find(booking.id);
      if (this.disposed) return;
      runInAction(() => {
        if (current) this.booking = { ...current, labName: booking.labName };
        this.phase = current?.status === 'BOOKED' ? 'booked' : 'confirmPending';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'confirmPending'; });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopWatchingPayment?.();
    this.stopWatchingPayment = null;
    this.payment?.dispose();
  }

  reset(): void {
    this.dispose();
    this.phase = 'loading';
    this.labName = '';
    this.homeCollection = false;
    this.slots = [];
    this.slotId = '';
    this.mode = 'WALK_IN';
    this.address = { addressLine1: '', addressLine2: '', pincode: '', hostelBlock: '', hostelRoom: '' };
    this.showErrors = false;
    this.error = null;
    this.booking = null;
    this.payment = null;
    this.idempotency = { fingerprint: '', key: '' };
    this.modeChosen = false;
  }
}
