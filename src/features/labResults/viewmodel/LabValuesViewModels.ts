import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import {
  labResultsRepository,
  type ConfirmResult,
  type LabResultsRepository,
  type LabValuesList,
  type ReferenceTest,
  type TestTrend,
  type TestWithValues,
} from '../data/LabResultsRepository';
import {
  bodySystemRows,
  filterValues,
  latestReport,
  rowFromValue,
  rowProblems,
  toValueInput,
  trendView,
  type BodySystemRow,
  type CheckLimits,
  type CheckRow,
  type InsightsFilter,
  type RowProblem,
  type TrendView,
} from './labValueModels';

/**
 * View-models for the lab-value parts of M2Insights, M2Trends and the Check /
 * Saved steps of M2ReportUpload, shared by the web and Expo views (MVVM).
 *
 * Copy lives in the views (i18n); these expose states and the server's own
 * messages (`errorText`) only. Nothing is cached on the device.
 */

export type Phase = 'loading' | 'ready' | 'empty' | 'error';

const messageOf = (error: unknown): string => (error instanceof ApiError ? error.message : '');

// ── M2Insights: latest report values and body systems ────────────────────────

export class InsightsValuesViewModel implements ViewModel {
  phase: Phase = 'loading';
  list: LabValuesList | null = null;
  filter: InsightsFilter = 'all';
  private disposed = false;

  constructor(private readonly repository: LabResultsRepository = labResultsRepository) {
    makeAutoObservable<InsightsValuesViewModel, 'repository' | 'disposed'>(
      this, { repository: false, disposed: false }, { autoBind: true });
  }

  get latest() {
    return this.list ? latestReport(this.list) : null;
  }

  /** The count cards use the server's counts for the latest report. */
  get needsLookCount(): number {
    const counts = this.latest?.rangeCounts;
    return counts ? counts.ABOVE + counts.BELOW : 0;
  }

  get inRangeCount(): number {
    return this.latest?.rangeCounts.IN_RANGE ?? 0;
  }

  get rows() {
    return this.latest ? filterValues(this.latest.items, this.filter) : [];
  }

  get bodySystems(): BodySystemRow[] {
    return this.list ? bodySystemRows(this.list) : [];
  }

  /** Press a count card; pressing the pressed one shows every row again (aria-pressed). */
  toggleFilter(filter: Exclude<InsightsFilter, 'all'>): void {
    this.filter = this.filter === filter ? 'all' : filter;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const list = await this.repository.list();
      if (this.disposed) return;
      runInAction(() => {
        this.list = list;
        this.phase = list.total > 0 ? 'ready' : 'empty';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  dispose(): void { this.disposed = true; }

  reset(): void {
    this.phase = 'loading';
    this.list = null;
    this.filter = 'all';
  }
}

// ── M2Trends ─────────────────────────────────────────────────────────────────

export class TrendsViewModel implements ViewModel {
  phase: Phase = 'loading';
  tests: TestWithValues[] = [];
  pinned: string[] = [];
  minPointsForLine = 0;
  selectedKey = '';
  trendPhase: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  trend: TestTrend | null = null;
  pinSaving = false;
  pinError = '';
  private disposed = false;

  constructor(private readonly repository: LabResultsRepository = labResultsRepository) {
    makeAutoObservable<TrendsViewModel, 'repository' | 'disposed'>(
      this, { repository: false, disposed: false }, { autoBind: true });
  }

  get view(): TrendView | null {
    return this.trend ? trendView(this.trend.items, this.trend.minPointsForLine) : null;
  }

  get selectedPinned(): boolean {
    return this.pinned.includes(this.selectedKey);
  }

  /** Load the chips, then the requested test (or the first bookmarked, or the first). */
  async load(preferredKey = ''): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const res = await this.repository.tests();
      if (this.disposed) return;
      const first = [preferredKey, ...res.pinned, res.items[0]?.testKey ?? '']
        .find(key => key !== '' && res.items.some(t => t.testKey === key)) ?? '';
      runInAction(() => {
        this.tests = res.items;
        this.pinned = res.pinned;
        this.minPointsForLine = res.minPointsForLine;
        this.phase = res.items.length > 0 ? 'ready' : 'empty';
      });
      if (first) await this.select(first);
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  async select(testKey: string): Promise<void> {
    this.selectedKey = testKey;
    this.trendPhase = 'loading';
    this.trend = null;
    try {
      const trend = await this.repository.trend(testKey);
      if (this.disposed || this.selectedKey !== testKey) return;
      runInAction(() => { this.trend = trend; this.trendPhase = 'ready'; });
    } catch {
      if (!this.disposed && this.selectedKey === testKey) runInAction(() => { this.trendPhase = 'error'; });
    }
  }

  /** Bookmark or un-bookmark the selected test. The server's list is the only truth (no optimistic state). */
  async togglePin(): Promise<void> {
    if (!this.selectedKey || this.pinSaving) return;
    const next = this.selectedPinned
      ? this.pinned.filter(k => k !== this.selectedKey)
      : [...this.pinned, this.selectedKey];
    this.pinSaving = true;
    this.pinError = '';
    try {
      const saved = await this.repository.setPinned(next);
      if (this.disposed) return;
      runInAction(() => {
        this.pinned = saved.codes;
        this.tests = this.tests.map(t => ({ ...t, pinned: saved.codes.includes(t.testKey) }));
      });
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.pinError = messageOf(error) || 'error'; });
    } finally {
      if (!this.disposed) runInAction(() => { this.pinSaving = false; });
    }
  }

  dispose(): void { this.disposed = true; }

  reset(): void {
    this.phase = 'loading';
    this.tests = [];
    this.pinned = [];
    this.selectedKey = '';
    this.trendPhase = 'idle';
    this.trend = null;
    this.pinSaving = false;
    this.pinError = '';
  }
}

// ── M2ReportUpload: Check and Saved ──────────────────────────────────────────

export type CheckStep = 'loading' | 'check' | 'saving' | 'saved' | 'error';
/** validation: the server refused a value (422) · conflict: values changed while saving (409), nothing saved. */
export type CheckError = '' | 'validation' | 'conflict' | 'network';

let localCounter = 0;
const nextLocalId = () => `row-${++localCounter}`;

const blankRow = (): CheckRow => ({
  localId: nextLocalId(), serverId: null, ticked: false, dirty: true, testCode: null, testName: '',
  value: '', unit: '', refLow: '', refHigh: '', refText: '',
});

export class ReportCheckViewModel implements ViewModel {
  step: CheckStep = 'loading';
  rows: CheckRow[] = [];
  reference: ReferenceTest[] = [];
  collectedOn = '';
  labName = '';
  maxRows = 0;
  error: CheckError = '';
  /** The server's message for a refused save, shown as-is. */
  errorText = '';
  result: ConfirmResult | null = null;
  private disposed = false;

  constructor(
    private readonly documentId: string,
    private readonly limits: CheckLimits,
    private readonly repository: LabResultsRepository = labResultsRepository,
  ) {
    makeAutoObservable<ReportCheckViewModel, 'repository' | 'documentId' | 'limits' | 'disposed'>(
      this, { repository: false, documentId: false, limits: false, disposed: false }, { autoBind: true });
  }

  get tickedRows(): CheckRow[] {
    return this.rows.filter(r => r.ticked);
  }

  problemsOf(localId: string): RowProblem[] {
    const row = this.rows.find(r => r.localId === localId);
    return row ? rowProblems(row, this.limits) : [];
  }

  get reportDateValid(): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(this.collectedOn) && !Number.isNaN(Date.parse(this.collectedOn));
  }

  get canAddRow(): boolean {
    return this.step === 'check' && this.rows.length < this.maxRows;
  }

  /** Only ticked rows are saved, and each of them must be complete. */
  get canSave(): boolean {
    return this.step === 'check' && this.reportDateValid && this.tickedRows.length > 0
      && this.tickedRows.every(r => rowProblems(r, this.limits).length === 0);
  }

  /** Resume drafts already on the server for this report (unticked), and load the test list. */
  async load(): Promise<void> {
    this.disposed = false;
    this.step = 'loading';
    try {
      const [values, reference] = await Promise.all([
        this.repository.reportValues(this.documentId), this.repository.reference(),
      ]);
      if (this.disposed) return;
      const drafts = values.items.filter(v => v.status === 'DRAFT');
      runInAction(() => {
        this.reference = reference;
        this.maxRows = values.maxRows;
        this.rows = drafts.map(v => rowFromValue(v, nextLocalId()));
        if (drafts[0]) {
          this.collectedOn = drafts[0].collectedOn;
          this.labName = drafts[0].labName;
        }
        this.step = 'check';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.step = 'error'; });
    }
  }

  addRow(): void {
    if (this.canAddRow) this.rows.push(blankRow());
  }

  removeRow(localId: string): void {
    this.rows = this.rows.filter(r => r.localId !== localId);
  }

  updateRow(localId: string, patch: Partial<Omit<CheckRow, 'localId' | 'serverId' | 'dirty' | 'ticked'>>): void {
    this.rows = this.rows.map(r => (r.localId === localId ? { ...r, ...patch, dirty: true } : r));
  }

  /** Choose a test from the reference list; its usual unit fills an empty unit field. */
  chooseTest(localId: string, code: string): void {
    const ref = this.reference.find(t => t.code === code);
    if (!ref) return;
    const row = this.rows.find(r => r.localId === localId);
    this.updateRow(localId, { testCode: ref.code, testName: row?.testName || ref.displayName,
      unit: row?.unit || ref.defaultUnit });
  }

  setTicked(localId: string, ticked: boolean): void {
    this.rows = this.rows.map(r => (r.localId === localId ? { ...r, ticked } : r));
  }

  setReport(fields: { collectedOn?: string; labName?: string }): void {
    if (fields.collectedOn !== undefined) this.collectedOn = fields.collectedOn;
    if (fields.labName !== undefined) this.labName = fields.labName;
    this.rows = this.rows.map(r => ({ ...r, dirty: true }));
  }

  /**
   * Send the ticked rows (new ones as drafts, edited ones as corrections), then
   * confirm exactly those ids. The server saves all or nothing and discards the
   * report's unticked drafts.
   */
  async save(): Promise<void> {
    if (!this.canSave) return;
    this.step = 'saving';
    this.error = '';
    this.errorText = '';
    const ticked = this.tickedRows;
    try {
      const fresh = ticked.filter(r => r.serverId === null);
      const edited = ticked.filter(r => r.serverId !== null && r.dirty);
      const ids = new Map<string, string>();
      if (fresh.length > 0) {
        const res = await this.repository.addDrafts(this.documentId, {
          collectedOn: this.collectedOn, labName: this.labName.trim(), rows: fresh.map(toValueInput),
        });
        fresh.forEach((r, i) => { const item = res.items[i]; if (item) ids.set(r.localId, item.id); });
        if (ids.size !== fresh.length) throw new ApiError('The server returned an invalid response.', 502);
      }
      for (const r of edited) {
        if (r.serverId) {
          await this.repository.correctDraft(r.serverId, {
            ...toValueInput(r), collectedOn: this.collectedOn, labName: this.labName.trim(),
          });
        }
      }
      if (this.disposed) return;
      runInAction(() => {
        this.rows = this.rows.map(r => {
          const id = ids.get(r.localId);
          return id || (r.ticked && r.serverId) ? { ...r, serverId: id ?? r.serverId, dirty: false } : r;
        });
      });
      const confirmIds = this.tickedRows.map(r => r.serverId).filter((id): id is string => id !== null);
      const result = await this.repository.confirm(this.documentId, confirmIds);
      if (this.disposed) return;
      runInAction(() => { this.result = result; this.step = 'saved'; });
    } catch (error) {
      if (this.disposed) return;
      runInAction(() => {
        const status = error instanceof ApiError ? error.status : 0;
        this.error = status === 409 ? 'conflict' : status === 422 ? 'validation' : 'network';
        this.errorText = messageOf(error);
        this.step = 'check';
      });
    }
  }

  dispose(): void { this.disposed = true; }

  reset(): void {
    this.step = 'loading';
    this.rows = [];
    this.collectedOn = '';
    this.labName = '';
    this.error = '';
    this.errorText = '';
    this.result = null;
  }
}
