import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import type { ReportReview } from '@/features/preventive/models';
import { labResultsRepository } from '../data/LabResultsRepository';
import type { LabResultsRepository } from '../data/LabResultsRepository';
import { ReportCheckViewModel } from './LabValuesViewModels';

/**
 * M2ReportUpload (Tier 1; plan decision D-M2-12, approved 2026-10-21):
 * Add, Check, Saved. There is no value reader, so there is no Read step and
 * nothing pretends to read: the student adds the report (a photo, a PDF, or a
 * report a StudentKare lab already released into their vault), then types its
 * values on the Check step, where every row starts unticked and only ticked
 * rows are saved (ReportCheckViewModel; the server confirms all or nothing).
 *
 * The file goes to POST /health/documents as a LAB record (virus-scanned and
 * stored by the server, as from the vault). Nothing is cached on the device.
 */

/** A file the student picked, ready to send (web: a File; Expo: a camera photo). */
export interface PickedReport {
  name: string;
  /** Sends the file as `file` in a multipart body. */
  append: (form: FormData) => void;
}

/** A released StudentKare lab order, as GET /lab-orders returns it to the student. */
export interface ReleasedLabReport {
  id: string;
  testPanel: string[];
  status: string;
  reportDocumentId: string;
  reviewedAt: number | null;
  updatedAt: number;
}

export type UploadStep = 'add' | 'labs' | 'uploading' | 'check';
export type ReviewAsk = 'idle' | 'asking' | 'asked' | 'error';

const messageOf = (error: unknown): string => (error instanceof ApiError ? error.message : '');

export class ReportUploadViewModel implements ViewModel {
  step: UploadStep = 'add';
  /** The server's message for a refused upload, shown as-is. */
  uploadError = '';
  uploadFailed = false;
  labsPhase: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  labs: ReleasedLabReport[] = [];
  documentId = '';
  check: ReportCheckViewModel | null = null;
  review: ReviewAsk = 'idle';
  reviewStatus: ReportReview['status'] | '' = '';
  reviewError = '';
  private disposed = false;

  constructor(
    /** The report's title in the vault (localised by the caller). */
    private readonly documentTitle: string,
    private readonly request: typeof apiRequest = apiRequest,
    private readonly repository: LabResultsRepository = labResultsRepository,
  ) {
    makeAutoObservable<ReportUploadViewModel, 'documentTitle' | 'request' | 'repository' | 'disposed'>(
      this, { documentTitle: false, request: false, repository: false, disposed: false }, { autoBind: true });
  }

  /** Add · Check · Saved: where the stepper stands (0, 1 or 2). */
  get stage(): number {
    if (this.check?.step === 'saved') return 2;
    return this.step === 'check' ? 1 : 0;
  }

  /** Send the picked file as a LAB record, then open the Check step on it. */
  async upload(file: PickedReport): Promise<void> {
    if (this.step === 'uploading') return;
    this.disposed = false;
    this.step = 'uploading';
    this.uploadError = '';
    this.uploadFailed = false;
    try {
      const form = new FormData();
      form.append('title', this.documentTitle);
      form.append('category', 'LAB');
      file.append(form);
      const res = await this.request<{ id: string }>('/health/documents', { method: 'POST', body: form });
      if (this.disposed) return;
      if (!res || typeof res.id !== 'string' || res.id === '') throw new ApiError('', 502);
      await this.openCheck(res.id);
    } catch (error) {
      if (this.disposed) return;
      runInAction(() => {
        this.uploadError = messageOf(error);
        this.uploadFailed = true;
        this.step = 'add';
      });
    }
  }

  /** "From a StudentKare lab": the student's released reports (nothing to upload). */
  async showLabs(): Promise<void> {
    this.disposed = false;
    this.step = 'labs';
    this.labsPhase = 'loading';
    try {
      const res = await this.request<{ items: ReleasedLabReport[] }>('/lab-orders?limit=50');
      if (this.disposed) return;
      const items = Array.isArray(res?.items) ? res.items : [];
      runInAction(() => {
        this.labs = items.filter((o) => o.status === 'REPORT_RELEASED' && typeof o.reportDocumentId === 'string' && o.reportDocumentId !== '');
        this.labsPhase = 'ready';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.labsPhase = 'error'; });
    }
  }

  backToAdd(): void {
    if (this.step === 'labs') this.step = 'add';
  }

  async pickLab(order: ReleasedLabReport): Promise<void> {
    await this.openCheck(order.reportDocumentId);
  }

  private async openCheck(documentId: string): Promise<void> {
    this.check?.dispose();
    const check = new ReportCheckViewModel(documentId, { valueAbsMax: getSetting('lab_results.value_abs_max') }, this.repository);
    runInAction(() => {
      this.documentId = documentId;
      this.check = check;
      this.step = 'check';
    });
    await check.load();
  }

  /** "Ask a doctor to explain it": a review request for this report, under the existing review and share rules. */
  async askDoctor(): Promise<void> {
    if (!this.documentId || this.review === 'asking') return;
    this.disposed = false;
    this.review = 'asking';
    this.reviewError = '';
    try {
      const res = await this.request<ReportReview>('/preventive/report-reviews', {
        method: 'POST', body: JSON.stringify({ documentId: this.documentId }),
      });
      if (this.disposed) return;
      runInAction(() => { this.review = 'asked'; this.reviewStatus = res?.status ?? ''; });
    } catch (error) {
      if (!this.disposed) runInAction(() => { this.review = 'error'; this.reviewError = messageOf(error); });
    }
  }

  /** Stops late answers from landing after unmount; the next action (a remount, StrictMode) starts listening again. */
  dispose(): void {
    this.disposed = true;
    this.check?.dispose();
  }

  reset(): void {
    this.check?.dispose();
    this.step = 'add';
    this.uploadError = '';
    this.uploadFailed = false;
    this.labsPhase = 'idle';
    this.labs = [];
    this.documentId = '';
    this.check = null;
    this.review = 'idle';
    this.reviewStatus = '';
    this.reviewError = '';
    this.disposed = false;
  }
}
