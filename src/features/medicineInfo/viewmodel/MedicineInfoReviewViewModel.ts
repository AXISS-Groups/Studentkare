import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';

/**
 * Medicine information review (AdminMedicineInfo, plan
 * docs/plans/tier1-medicine-info-2026-10-22.md). One screen for a pharmacist
 * (pharmacy partner console) and a super admin (operations console).
 *
 * - Anyone here edits a field's text and its source; every edit needs a new review.
 * - Only a pharmacist approves (the server refuses anyone else, D-MI-2), and
 *   approves exactly the value on screen: the hash of that value goes with the
 *   approval, so a change made meanwhile is refused (409).
 * - A super admin imports a licensed dataset (everything lands unreviewed).
 * - The history is the server's audit trail for the medicine.
 * Never an AI: no text here is generated; it is typed or imported.
 */
export type ReviewFilter = 'TO_REVIEW' | 'REVIEWED' | 'ALL';
export type FieldName = 'brand' | 'composition' | 'form' | 'pack' | 'manufacturer' | 'schedule' | 'uses' | 'side_effects' | 'warnings' | 'storage' | 'age_availability';

export interface QueueItem {
  id: string;
  brand: string;
  composition: string;
  form: string;
  schedule: string;
  source: string;
  active: boolean;
  published: boolean;
  reviewedCount: number;
  fieldCount: number;
  changedCount: number;
}

export interface AgeItem { band: string; form: string; strength: string }

export interface FieldRow {
  field: FieldName;
  kind: 'identity' | 'monograph';
  value: string | { items: string[] } | { items: AgeItem[] } | null;
  valueHash: string | null;
  state: 'UNREVIEWED' | 'REVIEWED';
  shown: boolean;
  changedSinceReview: boolean;
  sourceTitle: string;
  sourceUrl: string;
  reviewedOn: string | null;
  reviewedByYou: boolean;
  reviewedBy: string | null;
  updatedAt: number | null;
}

export interface HistoryEntry { id: string; field: string; action: 'IMPORTED' | 'EDITED' | 'REVIEWED' | 'REVIEW_WITHDRAWN'; actorRole: string; byYou: boolean; at: number }

export interface WorkDetail {
  medicine: QueueItem;
  fields: FieldRow[];
  history: HistoryEntry[];
  canApprove: boolean;
  bands: string[];
  forms: string[];
}

export interface ImportResult {
  id: string; filename: string; dataset: string; licence: string; rowsTotal: number; rowsCreated: number; rowsMatched: number;
  rowsRejected: number; errors: { row: number; reason: string }[]; createdAt: number;
}

export interface Draft { text: string; sourceTitle: string; sourceUrl: string }

const WORK = '/work/medicine-info';

/** The editable text of a monograph value: one line per item; age entries as BAND:FORM:strength. */
export function valueToText(row: FieldRow): string {
  if (!row.value || typeof row.value === 'string') return '';
  return row.value.items.map((item) => (typeof item === 'string' ? item : `${item.band}:${item.form}:${item.strength}`)).join('\n');
}

export function textToValue(field: FieldName, text: string): { items: (string | AgeItem)[] } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (field !== 'age_availability') return { items: lines };
  return {
    items: lines.map((line) => {
      const [band = '', form = '', ...rest] = line.split(':').map((p) => p.trim());
      return { band, form, strength: rest.join(':') };
    }),
  };
}

export class MedicineInfoReviewViewModel implements ViewModel {
  phase: 'loading' | 'ready' | 'error' = 'loading';
  items: QueueItem[] = [];
  total = 0;
  filter: ReviewFilter = 'TO_REVIEW';
  query = '';
  canApprove = false;
  canImport = false;

  detail: WorkDetail | null = null;
  detailPhase: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  drafts: Partial<Record<FieldName, Draft>> = {};
  busyField: FieldName | null = null;
  fieldError: { field: FieldName; message: string } | null = null;
  notice: 'saved' | 'approved' | 'withdrawn' | 'imported' | null = null;

  importOpen = false;
  importing = false;
  importError: string | null = null;
  importResult: ImportResult | null = null;

  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<MedicineInfoReviewViewModel, 'request' | 'disposed'>(this, { request: false, disposed: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const q = encodeURIComponent(this.query.trim());
      const res = await this.request<{ items: QueueItem[]; total: number; canApprove: boolean; canImport: boolean }>(`${WORK}?state=${this.filter}&query=${q}&limit=100`);
      if (this.disposed) return;
      runInAction(() => {
        this.items = res.items;
        this.total = res.total;
        this.canApprove = res.canApprove;
        this.canImport = res.canImport;
        this.phase = 'ready';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.phase = 'error'; });
    }
  }

  setFilter(filter: ReviewFilter): void {
    this.filter = filter;
    void this.load();
  }

  setQuery(query: string): void {
    this.query = query;
  }

  private takeDetail(detail: WorkDetail): void {
    this.detail = detail;
    this.detailPhase = 'ready';
    this.canApprove = detail.canApprove;
    const drafts: Partial<Record<FieldName, Draft>> = {};
    for (const row of detail.fields) drafts[row.field] = { text: valueToText(row), sourceTitle: row.sourceTitle, sourceUrl: row.sourceUrl };
    this.drafts = drafts;
  }

  async open(id: string): Promise<void> {
    this.detailPhase = 'loading';
    this.detail = null;
    this.fieldError = null;
    try {
      const res = await this.request<WorkDetail>(`${WORK}/${encodeURIComponent(id)}`);
      if (!this.disposed) runInAction(() => this.takeDetail(res));
    } catch {
      if (!this.disposed) runInAction(() => { this.detailPhase = 'error'; });
    }
  }

  close(): void {
    this.detail = null;
    this.detailPhase = 'idle';
    this.drafts = {};
    this.fieldError = null;
    void this.load();
  }

  setDraft(field: FieldName, patch: Partial<Draft>): void {
    const current = this.drafts[field] ?? { text: '', sourceTitle: '', sourceUrl: '' };
    this.drafts = { ...this.drafts, [field]: { ...current, ...patch } };
  }

  /** The draft differs from what the server holds: approve is off until it is saved. */
  dirty(field: FieldName): boolean {
    const row = this.detail?.fields.find((f) => f.field === field);
    const draft = this.drafts[field];
    if (!row || !draft) return false;
    return draft.sourceTitle !== row.sourceTitle || draft.sourceUrl !== row.sourceUrl || (row.kind === 'monograph' && draft.text !== valueToText(row));
  }

  private async act(field: FieldName, run: () => Promise<WorkDetail>, done: MedicineInfoReviewViewModel['notice']): Promise<void> {
    this.busyField = field;
    this.fieldError = null;
    try {
      const res = await run();
      if (this.disposed) return;
      runInAction(() => {
        this.takeDetail(res);
        this.notice = done;
      });
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.fieldError = { field, message: error instanceof Error ? error.message : '' }; });
    } finally {
      if (!this.disposed) runInAction(() => { this.busyField = null; });
    }
  }

  save(field: FieldName): Promise<void> {
    const id = this.detail?.medicine.id;
    const draft = this.drafts[field];
    const row = this.detail?.fields.find((f) => f.field === field);
    if (!id || !draft || !row) return Promise.resolve();
    const body: Record<string, unknown> = { sourceTitle: draft.sourceTitle, sourceUrl: draft.sourceUrl };
    if (row.kind === 'monograph') body.value = textToValue(field, draft.text);
    return this.act(field, () => this.request<WorkDetail>(`${WORK}/${encodeURIComponent(id)}/fields/${field}`, { method: 'PUT', body: JSON.stringify(body) }), 'saved');
  }

  approve(field: FieldName): Promise<void> {
    const id = this.detail?.medicine.id;
    const row = this.detail?.fields.find((f) => f.field === field);
    if (!id || !row?.valueHash || !this.canApprove) return Promise.resolve();
    const hash = row.valueHash;
    return this.act(field, () => this.request<WorkDetail>(`${WORK}/${encodeURIComponent(id)}/fields/${field}/review`, { method: 'POST', body: JSON.stringify({ valueHash: hash }) }), 'approved');
  }

  withdraw(field: FieldName): Promise<void> {
    const id = this.detail?.medicine.id;
    if (!id) return Promise.resolve();
    return this.act(field, () => this.request<WorkDetail>(`${WORK}/${encodeURIComponent(id)}/fields/${field}/withdraw`, { method: 'POST' }), 'withdrawn');
  }

  clearNotice(): void {
    this.notice = null;
  }

  openImport(): void {
    this.importOpen = true;
    this.importError = null;
    this.importResult = null;
  }

  closeImport(): void {
    this.importOpen = false;
    if (this.importResult) void this.load();
  }

  async importFile(file: File, dataset: string, licence: string, sourceUrl: string): Promise<void> {
    this.importing = true;
    this.importError = null;
    const form = new FormData();
    form.append('file', file);
    form.append('dataset', dataset);
    form.append('licence', licence);
    form.append('sourceUrl', sourceUrl);
    try {
      const res = await this.request<ImportResult>('/ops/medicine-info/import', { method: 'POST', body: form });
      if (!this.disposed) runInAction(() => { this.importResult = res; this.notice = 'imported'; });
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.importError = error instanceof Error ? error.message : ''; });
    } finally {
      if (!this.disposed) runInAction(() => { this.importing = false; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.detail = null;
    this.detailPhase = 'idle';
    this.drafts = {};
    this.importOpen = false;
    this.importResult = null;
  }
}
