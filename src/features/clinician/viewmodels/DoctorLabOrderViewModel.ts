import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
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
  /**
   * Bumped by dispose(): a reply to a request started before it is stale and
   * dropped, and the request itself is aborted. activate() makes the view model
   * live again, so React's StrictMode (mount, dispose, mount) leaves it working
   * (live-run audit #5: the order form's lists stayed empty).
   */
  private generation = 0;
  private disposed = false;
  private readonly inFlight = new Set<AbortController>();

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<DoctorLabOrderViewModel, 'disposed' | 'request' | 'generation' | 'inFlight'>(
      this, { disposed: false, request: false, generation: false, inFlight: false }, { autoBind: true });
  }

  /** Mounted (again): replies from now on are applied. */
  activate(): void { this.disposed = false; }

  /** Runs `fetch` with an abort signal; resolves to null when the reply is stale or the screen has gone. */
  private async fresh<R>(fetch: (signal: AbortSignal) => Promise<R>): Promise<{ value: R } | { failed: true } | null> {
    const generation = this.generation;
    const controller = new AbortController();
    this.inFlight.add(controller);
    try {
      const value = await fetch(controller.signal);
      return generation === this.generation && !this.disposed ? { value } : null;
    } catch {
      return generation === this.generation && !this.disposed ? { failed: true } : null;
    } finally {
      this.inFlight.delete(controller);
    }
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
    this.activate();
    await Promise.all([this.loadPatients(), this.loadTests(), this.loadOrders()]);
  }

  async loadPatients(): Promise<void> {
    this.patientsFailed = false;
    const reply = await this.fresh((signal) => this.request<{ items: StaffAppointment[] }>('/work/appointments', { signal }));
    if (!reply) return;
    if ('failed' in reply) { runInAction(() => { this.patientsFailed = true; }); return; }
    const seen = new Map<string, CarePatient>();
    for (const appt of reply.value.items) {
      if (appt.status !== 'CONFIRMED' && appt.status !== 'COMPLETED') continue;
      if (!seen.has(appt.patientId)) seen.set(appt.patientId, { patientId: appt.patientId, name: appt.customer, lastVisit: appt.slotStart });
    }
    runInAction(() => { this.patients = [...seen.values()]; });
  }

  async loadTests(): Promise<void> {
    this.testsFailed = false;
    const reply = await this.fresh((signal) => this.request<{ items: OrderableLabTest[] }>('/work/lab-tests', { signal }));
    if (!reply) return;
    runInAction(() => { if ('failed' in reply) this.testsFailed = true; else this.tests = reply.value.items; });
  }

  async loadOrders(): Promise<void> {
    this.ordersFailed = false;
    const reply = await this.fresh((signal) => this.request<{ items: PlacedLabOrder[] }>('/work/doctor-lab-orders', { signal }));
    if (!reply) return;
    runInAction(() => { if ('failed' in reply) this.ordersFailed = true; else this.orders = reply.value.items; });
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

  dispose(): void {
    this.disposed = true;
    this.generation += 1;
    this.inFlight.forEach((controller) => controller.abort());
    this.inFlight.clear();
  }

  reset(): void {
    this.patientId = '';
    this.startAnother();
  }
}
