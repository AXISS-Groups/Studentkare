import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { ReportReview } from '@/features/preventive/models';
import { toDate } from '@/features/phoneboards/format';
import { LabResultsRepository } from '@/features/labResults/data/LabResultsRepository';
import { InsightsValuesViewModel } from '@/features/labResults/viewmodel/LabValuesViewModels';
import { Resource } from '@/features/m2health/resource';
import { MedsTodayViewModel } from '@/features/reminders/viewmodel/MedsTodayViewModel';
import { WaterViewModel } from '@/features/reminders/viewmodel/WaterViewModel';
import { readWeek } from '@/features/steps/data/stepsApi';
import type { ActivityTrends } from '@/features/steps/data/stepsApi';

/**
 * Mobile 2.0 My health · Insights (M2Insights, Tier 1; plan package A and the
 * stored-values section of package B). Replaces Your Care as the My health
 * destination. Each card has its own read, so one failing endpoint never
 * blanks the page.
 *
 * Rules kept (plan "Rules every screen in this package keeps"):
 * - No value is drawn that the server did not return; whether a value is in
 *   the lab's range is the server's `rangeState` (InsightsValuesViewModel).
 * - The doctor's note is the latest APPROVED review's summary, verbatim, with
 *   the doctor's name and review date. Nothing else on the page interprets a value.
 * - "To do" counts open care actions (D-M2-8): refills set up and tests a
 *   doctor ordered that are not collected yet. Never a count of values.
 * - Links from the care cards go to the refill request and the order's own
 *   collection time (D-M2-9), never to the store, and carry no medicine or test.
 * - "Ask Ayush about this report" is not drawn: record access (D-M2-13) is not built.
 * - Medicines today and Water (reminders ticket) are their own view models,
 *   shared with the M2Reminders and M2Water screens; each loads on its own.
 * - Steps (Steps ticket, 2026-10-21) is a wellness card, not a clinical value:
 *   today's number from GET /activity/trends with its source, never a goal or score.
 */

interface Appointment { id: string; slotStart: string; status: string }
interface Share { id: string; active: boolean }
/**
 * GET /refills/plans. `dueAt` (Unix seconds) is the server's: the last dispense
 * plus its days supply, null when it cannot know (older servers omit it). Never
 * computed or guessed here.
 */
export interface RefillPlan { id: string; name: string; dosage: string; dueAt?: number | null }

/** One refill line: name, dosage, and the due date only when the server sent one. */
export function refillLine(plan: RefillPlan, due: (date: string) => string, date: (seconds: number) => string): string {
  const when = typeof plan.dueAt === 'number' ? date(plan.dueAt) : '';
  return [plan.name, plan.dosage, when ? due(when) : ''].filter(Boolean).join(' · ');
}
export interface LabOrder {
  id: string; status: string; testPanel: string[]; orderedByDoctor?: string; collectedAt: number | null; slotStart: string | null; createdAt: number;
}

const UPCOMING = new Set(['REQUESTED', 'CONFIRMED']);
/** A doctor-ordered test still waiting for its sample (clinical_fulfilment LAB_TRANSITIONS). */
const AWAITING_COLLECTION = new Set(['BOOKED', 'ASSIGNED', 'RECOLLECTION_REQUIRED']);
const REVIEWS_READ = 20;
const ORDERS_READ = 20;

export function nextConsult(items: readonly Appointment[], now = Date.now()): Appointment | null {
  return items
    .filter((a) => UPCOMING.has(a.status) && (toDate(a.slotStart)?.getTime() ?? 0) > now)
    .sort((a, b) => (toDate(a.slotStart)?.getTime() ?? 0) - (toDate(b.slotStart)?.getTime() ?? 0))[0] ?? null;
}

/** Tests a doctor ordered that are still waiting to be collected. */
export function orderedTests(items: readonly LabOrder[]): LabOrder[] {
  return items.filter((o) => Boolean(o.orderedByDoctor) && AWAITING_COLLECTION.has(o.status) && !o.collectedAt);
}

/** The newest review a doctor approved, with its words. */
export function latestNote(items: readonly ReportReview[]): ReportReview | null {
  return items.filter((r) => r.status === 'APPROVED' && r.guidance && r.guidance.summary.trim())
    .sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0))[0] ?? null;
}

export type ReviewAsk = 'idle' | 'sending' | 'sent' | 'error';

export class InsightsViewModel implements ViewModel {
  readonly values: InsightsValuesViewModel;
  readonly appointments: Resource<{ items: Appointment[] }>;
  readonly documents: Resource<{ total: number }>;
  readonly shares: Resource<{ items: Share[] }>;
  readonly reviews: Resource<{ items: ReportReview[] }>;
  readonly refills: Resource<{ items: RefillPlan[] }>;
  readonly labOrders: Resource<{ items: LabOrder[] }>;
  readonly meds: MedsTodayViewModel;
  readonly water: WaterViewModel;
  readonly steps: Resource<ActivityTrends>;
  reviewAsk: ReviewAsk = 'idle';
  reviewAskMessage = '';

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    this.values = new InsightsValuesViewModel(new LabResultsRepository(request));
    this.appointments = new Resource(() => request<{ items: Appointment[] }>('/appointments'));
    this.documents = new Resource(() => request<{ total: number }>('/health/documents?limit=1'));
    this.shares = new Resource(() => request<{ items: Share[] }>('/records/shares'));
    this.reviews = new Resource(() => request<{ items: ReportReview[] }>(`/preventive/report-reviews?limit=${REVIEWS_READ}`));
    this.refills = new Resource(() => request<{ items: RefillPlan[] }>('/refills/plans'));
    this.labOrders = new Resource(() => request<{ items: LabOrder[] }>(`/lab-orders?limit=${ORDERS_READ}`));
    this.meds = new MedsTodayViewModel(request);
    this.water = new WaterViewModel(request);
    this.steps = new Resource(() => readWeek(request));
    makeAutoObservable<InsightsViewModel, 'request'>(this, {
      request: false, values: false, appointments: false, documents: false, shares: false, reviews: false, refills: false, labOrders: false, steps: false,
      meds: false, water: false,
    }, { autoBind: true });
  }

  get next(): Appointment | null {
    return this.appointments.data ? nextConsult(this.appointments.data.items) : null;
  }

  get activeShares(): number | null {
    return this.shares.data ? this.shares.data.items.filter((s) => s.active).length : null;
  }

  get ordered(): LabOrder[] {
    return this.labOrders.data ? orderedTests(this.labOrders.data.items) : [];
  }

  /** "To do" (D-M2-8); null until both of its reads are in. */
  get toDo(): number | null {
    if (!this.refills.data || !this.labOrders.data) return null;
    return this.refills.data.items.length + this.ordered.length;
  }

  get note(): ReportReview | null {
    return this.reviews.data ? latestNote(this.reviews.data.items) : null;
  }

  /** The latest report's review, if one was asked for (its status only is shown). */
  get latestReportReview(): ReportReview | null {
    const doc = this.values.latest?.documentId;
    if (!doc || !this.reviews.data) return null;
    return this.reviews.data.items.find((r) => r.documentId === doc) ?? null;
  }

  /** Whether "Ask a doctor to explain it" applies: a report the student added, with no review yet. */
  get canAskReview(): boolean {
    const latest = this.values.latest;
    return Boolean(latest?.documentId) && this.reviews.phase === 'ready' && this.latestReportReview === null;
  }

  load(): void {
    void this.values.load();
    [this.appointments, this.documents, this.shares, this.reviews, this.refills, this.labOrders, this.steps].forEach((r) => void r.load());
    this.meds.load();
    this.water.load();
  }

  /** Ask a doctor to explain the latest report (POST /preventive/report-reviews, the existing share rules apply). */
  async askReview(): Promise<void> {
    const documentId = this.values.latest?.documentId;
    if (!documentId || this.reviewAsk === 'sending') return;
    this.reviewAsk = 'sending';
    this.reviewAskMessage = '';
    try {
      await this.request('/preventive/report-reviews', { method: 'POST', body: JSON.stringify({ documentId }) });
      runInAction(() => { this.reviewAsk = 'sent'; });
      await this.reviews.load();
    } catch (error) {
      runInAction(() => {
        this.reviewAsk = 'error';
        this.reviewAskMessage = error instanceof ApiError ? error.message : '';
      });
    }
  }

  dispose(): void {
    this.values.dispose();
    [this.appointments, this.documents, this.shares, this.reviews, this.refills, this.labOrders, this.steps].forEach((r) => r.cancel());
    this.meds.dispose();
    this.water.dispose();
  }

  reset(): void {
    this.dispose();
    this.values.reset();
    this.meds.reset();
    this.water.reset();
  }
}
