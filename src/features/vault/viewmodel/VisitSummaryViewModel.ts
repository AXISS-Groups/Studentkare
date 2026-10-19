import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** One row of GET /api/records/visit-summaries (backend/services/workflow_api.py). No clinical text. */
export interface VisitSummaryHeader {
  id: string;
  appointmentId: string;
  /** The booked slot's start, as the server stores it ("2026-10-10T09:00"), or null if unknown. */
  appointmentStart: string | null;
  doctorName: string;
  doctorRegistrationNumber: string;
  /** Epoch seconds. */
  signedAt: number;
}

/** GET /api/records/visit-summaries/{id}: one signed note, opened (and audited) by its student. */
export interface VisitSummary extends VisitSummaryHeader {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  prescriptions: Array<{ id: string; issuedAt: number; status: string }>;
}

export type ListPhase = 'loading' | 'ready' | 'failed';
export type DetailPhase = 'idle' | 'loading' | 'ready' | 'missing' | 'failed';

/**
 * Visit summaries (design ConsultSummary / WebConsultSummary, Tier 1): a
 * student reads the notes a doctor signed after their consultation.
 *
 * Only signed notes ever reach this object; the server never sends a draft.
 * The note text lives in memory only — never storage, analytics or logs — and
 * leaving the screen (`dispose`) drops it.
 */
export class VisitSummaryViewModel implements ViewModel {
  listPhase: ListPhase = 'loading';
  items: VisitSummaryHeader[] = [];
  detailPhase: DetailPhase = 'idle';
  detail: VisitSummary | null = null;
  selectedId: string | null = null;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<VisitSummaryViewModel, 'disposed' | 'request'>(
      this, { disposed: false, request: false }, { autoBind: true },
    );
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.listPhase = 'loading';
    try {
      const response = await this.request<{ items: VisitSummaryHeader[] }>('/records/visit-summaries');
      if (this.disposed) return;
      runInAction(() => {
        this.items = response.items;
        this.listPhase = 'ready';
      });
    } catch {
      if (this.disposed) return;
      runInAction(() => { this.listPhase = 'failed'; });
    }
  }

  async open(id: string): Promise<void> {
    this.disposed = false;
    this.selectedId = id;
    this.detail = null;
    this.detailPhase = 'loading';
    try {
      const summary = await this.request<VisitSummary>(`/records/visit-summaries/${encodeURIComponent(id)}`);
      if (this.disposed || this.selectedId !== id) return;
      runInAction(() => {
        this.detail = summary;
        this.detailPhase = 'ready';
      });
    } catch (error: unknown) {
      if (this.disposed || this.selectedId !== id) return;
      runInAction(() => {
        // A draft, someone else's note and a missing one are all the same 404.
        this.detailPhase = error instanceof ApiError && error.status === 404 ? 'missing' : 'failed';
      });
    }
  }

  close(): void {
    this.selectedId = null;
    this.detail = null;
    this.detailPhase = 'idle';
  }

  reset(): void {
    this.items = [];
    this.listPhase = 'loading';
    this.close();
  }

  dispose(): void {
    this.disposed = true;
    this.reset();
  }
}
