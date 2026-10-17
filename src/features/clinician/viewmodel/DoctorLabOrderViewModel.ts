import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { CarePatient, StaffAppointment } from './PrescribeViewModel';

export type CollectionMode = 'WALK_IN' | 'HOME';

/** GET /api/work/lab-tests returns items[]. Names and preparation only: no price reaches the doctor (Rule L). */
export interface OrderableLabTest {
  id: string;
  name: string;
  preparation: string;
  labName: string;
  homeCollection: boolean;
}

/** GET /api/work/doctor-lab-orders returns items[] (orders this doctor placed). */
export interface PlacedLabOrder {
  id: string;
  patientId: string;
  patientName: string;
  testPanel: string[];
  clinicalIndication: string;
  collectionMode: CollectionMode;
  fastingRequired: boolean;
  labName: string;
  status: string;
  createdAt: number;
}

export const INDICATION_MIN = 3;
export const INDICATION_MAX = 500;

/**
 * Doctor-for-patient lab order (design page 5: ClinicianLabOrder, Tier 1), on
 * POST /api/work/doctor-lab-orders.
 *
 * - The patient comes from the doctor's own confirmed or completed
 *   appointments, the same source as Prescribe; the server refuses anyone else.
 * - A typed clinical indication is required. The design's refused row — a full
 *   panel "because the student asked" — cannot be submitted without one.
 * - Nothing is priced or charged here. The ordering doctor reviews the report.
 */
export class DoctorLabOrderViewModel implements ViewModel {
  patients: CarePatient[] | null = null;
  patientsFailed = false;
  tests: OrderableLabTest[] | null = null;
  testsFailed = false;
  orders: PlacedLabOrder[] | null = null;
  ordersFailed = false;

  patientId = '';
  testId = '';
  collectionMode: CollectionMode = 'WALK_IN';
  fastingRequired = false;
  indication = '';

  busy = false;
  error: string | null = null;
  placed: { testName: string; patientName: string } | null = null;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<DoctorLabOrderViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  get selectedTest(): OrderableLabTest | undefined {
    return this.tests?.find((test) => test.id === this.testId);
  }

  /** Hostel collection is offered only when the test's lab does it. */
  get hostelAvailable(): boolean {
    return Boolean(this.selectedTest?.homeCollection);
  }

  get indicationValid(): boolean {
    const length = this.indication.trim().length;
    return length >= INDICATION_MIN && length <= INDICATION_MAX;
  }

  get canSubmit(): boolean {
    if (this.busy || !this.patientId || !this.selectedTest || !this.indicationValid) return false;
    return this.collectionMode === 'WALK_IN' || this.hostelAvailable;
  }

  async load(): Promise<void> {
    this.disposed = false;
    await Promise.all([this.loadPatients(), this.loadTests(), this.loadOrders()]);
  }

  async loadPatients(): Promise<void> {
    this.patientsFailed = false;
    try {
      const res = await this.request<{ items: StaffAppointment[] }>('/work/appointments');
      if (this.disposed) return;
      const seen = new Map<string, CarePatient>();
      for (const appt of res.items) {
        if (appt.status !== 'CONFIRMED' && appt.status !== 'COMPLETED') continue;
        if (!seen.has(appt.patientId)) seen.set(appt.patientId, { patientId: appt.patientId, name: appt.customer, lastVisit: appt.slotStart });
      }
      runInAction(() => { this.patients = [...seen.values()]; });
    } catch {
      if (!this.disposed) runInAction(() => { this.patientsFailed = true; });
    }
  }

  async loadTests(): Promise<void> {
    this.testsFailed = false;
    try {
      const res = await this.request<{ items: OrderableLabTest[] }>('/work/lab-tests');
      if (!this.disposed) runInAction(() => { this.tests = res.items; });
    } catch {
      if (!this.disposed) runInAction(() => { this.testsFailed = true; });
    }
  }

  async loadOrders(): Promise<void> {
    this.ordersFailed = false;
    try {
      const res = await this.request<{ items: PlacedLabOrder[] }>('/work/doctor-lab-orders');
      if (!this.disposed) runInAction(() => { this.orders = res.items; });
    } catch {
      if (!this.disposed) runInAction(() => { this.ordersFailed = true; });
    }
  }

  selectPatient(patientId: string): void { this.patientId = patientId; }

  selectTest(testId: string): void {
    this.testId = testId;
    if (!this.hostelAvailable) this.collectionMode = 'WALK_IN';
  }

  setCollectionMode(mode: CollectionMode): void {
    this.collectionMode = mode === 'HOME' && !this.hostelAvailable ? 'WALK_IN' : mode;
  }

  setFastingRequired(value: boolean): void { this.fastingRequired = value; }
  setIndication(value: string): void { this.indication = value.slice(0, INDICATION_MAX); }

  async submit(): Promise<void> {
    const test = this.selectedTest;
    if (!this.canSubmit || !test) return;
    this.busy = true;
    this.error = null;
    const patientName = this.patients?.find((p) => p.patientId === this.patientId)?.name ?? '';
    try {
      await this.request('/work/doctor-lab-orders', {
        method: 'POST',
        body: JSON.stringify({
          patientId: this.patientId,
          catalogItemId: test.id,
          collectionMode: this.collectionMode,
          fastingRequired: this.fastingRequired,
          clinicalIndication: this.indication.trim(),
        }),
      });
      runInAction(() => {
        this.busy = false;
        this.placed = { testName: test.name, patientName };
      });
      await this.loadOrders();
    } catch (err: unknown) {
      runInAction(() => {
        this.busy = false;
        this.error = err instanceof Error && err.message ? err.message : 'The lab order was not placed. Try again.';
      });
    }
  }

  startAnother(): void {
    this.placed = null;
    this.testId = '';
    this.collectionMode = 'WALK_IN';
    this.fastingRequired = false;
    this.indication = '';
    this.error = null;
  }

  dispose(): void { this.disposed = true; }

  reset(): void {
    this.patientId = '';
    this.startAnother();
  }
}
