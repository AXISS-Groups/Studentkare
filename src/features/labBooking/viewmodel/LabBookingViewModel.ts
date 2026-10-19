import { makeAutoObservable, reaction, runInAction, type IReactionDisposer } from 'mobx';
import type { MessageKey } from '@/i18n';
import { ApiError } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import { PaymentRepository } from '@/features/payments/data/PaymentRepository';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import {
  labBookingRepository,
  type AddressKind,
  type LabAddress,
  type LabBooking,
  type LabBookingRepository,
  type LabPackage,
  type LabSlot,
} from '../data/LabBookingRepository';

export type Phase = 'loading' | 'ready' | 'error';
export type SlotPhase = 'idle' | 'loading' | 'ready' | 'error';
/** browse: the list and the slot sheet · pay: the Pay step · result: ResultLabBooked. */
export type FlowStep = 'browse' | 'pay' | 'result';
/** What the result screen shows, from the server's word on the booking. */
export type ResultOutcome = 'loading' | 'booked' | 'pending' | 'failed' | 'error';

const EMPTY_ADDRESS: LabAddress = { kind: 'HOSTEL', hostelBlock: '', room: '', line: '', city: '', pincode: '', landmark: '' };
const PAID_STATES = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED']);

function newKey(): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `lab-${random}`;
}

/** The booking that is waiting to be paid, and what it was booked with. */
interface Pending { orderId: string; itemId: string; slotId: string; address: string; amountPaise: number }

type PaymentFactory = (orderId: string, amountPaise: number) => PayStepViewModel;

/**
 * Booking a lab test from the shop (canvas LabPackages, then Payment, then ResultLabBooked).
 *
 * The list, a slot and where to collect; then a real lab order is booked and
 * paid through the shared Pay step. Nothing on the client decides a booking is
 * paid or booked: the result screen reads the booking back from the server.
 * Going back from Pay and confirming again reuses the same booking (moving its
 * slot if a different one was picked), so it is never booked twice.
 */
export class LabBookingViewModel implements ViewModel {
  phase: Phase = 'loading';
  packages: LabPackage[] = [];
  selected: LabPackage | null = null;
  slotPhase: SlotPhase = 'idle';
  slots: LabSlot[] = [];
  slotId = '';
  address: LabAddress = { ...EMPTY_ADDRESS };
  /** Shown once the student has tried to confirm with an incomplete address. */
  showAddressErrors = false;
  booking = false;
  error: MessageKey | '' = '';
  /** A server message we could not map to one of ours (shown as-is). */
  errorText = '';
  step: FlowStep = 'browse';
  payment: PayStepViewModel | null = null;
  result: LabBooking | null = null;
  outcome: ResultOutcome = 'loading';
  private pending: Pending | null = null;
  private key = newKey();
  private disposed = false;
  private stopWatchingPayment: IReactionDisposer | null = null;

  constructor(
    private readonly repository: LabBookingRepository = labBookingRepository,
    private readonly makePayment: PaymentFactory =
    (orderId, amountPaise) => new PayStepViewModel(orderId, amountPaise, new PaymentRepository(undefined, '/lab-orders')),
  ) {
    makeAutoObservable<LabBookingViewModel, 'repository' | 'makePayment' | 'pending' | 'key' | 'disposed' | 'stopWatchingPayment'>(
      this,
      { repository: false, makePayment: false, pending: false, key: false, disposed: false, stopWatchingPayment: false },
      { autoBind: true },
    );
  }

  get sheetOpen(): boolean {
    return this.step === 'browse' && this.selected !== null;
  }

  get selectedSlot(): LabSlot | null {
    return this.slots.find(s => s.id === this.slotId) ?? null;
  }

  get addressValid(): boolean {
    const a = this.address;
    if (a.kind === 'HOSTEL') return a.hostelBlock.trim().length > 0 && a.room.trim().length > 0;
    return a.line.trim().length >= 10 && a.city.trim().length >= 2 && /^[1-9][0-9]{5}$/.test(a.pincode.trim());
  }

  get canConfirm(): boolean {
    return this.selectedSlot !== null && this.addressValid && !this.booking;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const items = await this.repository.packages();
      if (this.disposed) return;
      runInAction(() => { this.packages = items; this.phase = 'ready'; });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  /** Open the slot sheet for a package already on the list (or by id once the list has loaded). */
  open(item: LabPackage | string): void {
    const pkg = typeof item === 'string' ? this.packages.find(p => p.id === item) ?? null : item;
    if (!pkg) {
      this.error = 'labbook.error.noLab';
      return;
    }
    this.selected = pkg;
    this.slotId = '';
    this.error = '';
    this.errorText = '';
    this.showAddressErrors = false;
    void this.loadSlots();
  }

  close(): void {
    if (this.booking) return;
    this.selected = null;
    this.slots = [];
    this.slotPhase = 'idle';
    this.slotId = '';
    this.error = '';
    this.errorText = '';
  }

  async loadSlots(): Promise<void> {
    const pkg = this.selected;
    if (!pkg) return;
    this.slotPhase = 'loading';
    this.slots = [];
    try {
      const slots = await this.repository.slots(pkg.id);
      if (this.disposed || this.selected?.id !== pkg.id) return;
      runInAction(() => {
        this.slots = slots.filter(s => s.available > 0);
        this.slotPhase = 'ready';
        if (!this.slots.some(s => s.id === this.slotId)) this.slotId = this.slots[0]?.id ?? '';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.slotPhase = 'error'; });
    }
  }

  chooseSlot(id: string): void {
    if (!this.booking) this.slotId = id;
  }

  setAddressKind(kind: AddressKind): void {
    this.address = { ...this.address, kind };
  }

  setAddress(field: Exclude<keyof LabAddress, 'kind'>, value: string): void {
    this.address = { ...this.address, [field]: value };
  }

  /** Book (or reuse the waiting booking) and move on to Pay. */
  async confirm(): Promise<void> {
    const pkg = this.selected;
    const slot = this.selectedSlot;
    if (!pkg || !slot || this.booking) return;
    if (!this.addressValid) { this.showAddressErrors = true; return; }
    this.booking = true;
    this.error = '';
    this.errorText = '';
    const address = JSON.stringify(this.address);
    try {
      let pending = this.pending;
      if (pending && (pending.itemId !== pkg.id || pending.address !== address)) {
        // A different test or address is a different booking. Give the old slot back now.
        const stale = pending;
        pending = null;
        this.pending = null;
        this.key = newKey();
        await this.repository.cancel(stale.orderId).catch(() => undefined);   // it expires on its own otherwise
      }
      if (pending && pending.slotId !== slot.id) {
        await this.repository.moveSlot(pending.orderId, slot.id);
        pending = { ...pending, slotId: slot.id };
      }
      if (!pending) {
        const res = await this.repository.book(pkg.id, slot.id, this.address, this.key);
        pending = { orderId: res.order.id, itemId: pkg.id, slotId: slot.id, address,
          amountPaise: res.booking.amountPaise ?? pkg.pricePaise };
      }
      if (this.disposed) return;
      const ready = pending;
      runInAction(() => {
        this.pending = ready;
        this.startPayment(ready);
      });
    } catch (cause) {
      if (this.disposed) return;
      runInAction(() => {
        if (cause instanceof ApiError && cause.status === 409) {
          this.error = 'labbook.error.slotTaken';
          void this.loadSlots();
        } else if (cause instanceof ApiError && cause.status === 503) {
          this.error = 'labbook.error.noPayment';
        } else if (cause instanceof ApiError && cause.status === 422 && cause.message) {
          this.errorText = cause.message;
        } else {
          this.error = 'labbook.error.book';
        }
      });
    } finally {
      if (!this.disposed) runInAction(() => { this.booking = false; });
    }
  }

  private startPayment(pending: Pending): void {
    this.stopWatchingPayment?.();
    const payment = this.makePayment(pending.orderId, pending.amountPaise);
    this.payment = payment;
    this.step = 'pay';
    // The Pay step decides nothing: once the server says paid, read the booking back.
    this.stopWatchingPayment = reaction(() => payment.phase, phase => {
      if (phase === 'paid') void this.showResult();
    });
  }

  /** Back from Pay to the sheet. The booking stays and holds its slot until it expires. */
  backToSlot(): void {
    this.stopWatchingPayment?.();
    this.stopWatchingPayment = null;
    this.payment?.dispose();
    this.payment = null;
    this.step = 'browse';
  }

  async showResult(): Promise<void> {
    const orderId = this.pending?.orderId ?? this.result?.order.id;
    if (!orderId) return;
    this.step = 'result';
    this.outcome = 'loading';
    try {
      const booking = await this.repository.get(orderId);
      if (this.disposed) return;
      runInAction(() => {
        this.result = booking;
        const status = booking.booking.paymentStatus ?? '';
        this.outcome = PAID_STATES.has(status) ? 'booked'
          : status === 'UNPAID' ? 'pending' : 'failed';
        if (this.outcome === 'booked') { this.pending = null; this.key = newKey(); }
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.outcome = 'error'; });
    }
  }

  /** From the result screen: book another test. */
  startOver(): void {
    this.stopWatchingPayment?.();
    this.stopWatchingPayment = null;
    this.payment = null;
    this.result = null;
    this.pending = null;
    this.key = newKey();
    this.selected = null;
    this.step = 'browse';
  }

  dispose(): void {
    this.disposed = true;
    this.stopWatchingPayment?.();
    this.stopWatchingPayment = null;
    this.payment?.dispose();
  }

  reset(): void {
    this.dispose();
    this.disposed = false;
    this.phase = 'loading';
    this.packages = [];
    this.selected = null;
    this.slotPhase = 'idle';
    this.slots = [];
    this.slotId = '';
    this.address = { ...EMPTY_ADDRESS };
    this.showAddressErrors = false;
    this.booking = false;
    this.error = '';
    this.errorText = '';
    this.step = 'browse';
    this.payment = null;
    this.result = null;
    this.outcome = 'loading';
    this.pending = null;
    this.key = newKey();
  }
}
