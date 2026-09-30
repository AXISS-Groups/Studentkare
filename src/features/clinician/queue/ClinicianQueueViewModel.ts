import { makeAutoObservable, runInAction } from 'mobx';
import type { ClinicianQueueSource } from './queueSource';
import type { QueueData, QueueEntry } from './queueModel';
import { queueSummary } from './queueModel';

export type QueueStatus = 'loading' | 'ready' | 'empty' | 'unconnected' | 'error';

export class ClinicianQueueViewModel {
  status: QueueStatus = 'loading';
  data: QueueData | null = null;
  selectedId: string | null = null;
  requestingId: string | null = null;
  toast: string | null = null;
  now: Date;
  private clock: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly source: ClinicianQueueSource,
    private readonly nowFn: () => Date = () => new Date(),
  ) {
    this.now = nowFn();
    makeAutoObservable<ClinicianQueueViewModel, 'source' | 'clock' | 'nowFn'>(this, { source: false, clock: false, nowFn: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.status = 'loading';
    try {
      const data = await this.source.load();
      runInAction(() => {
        this.data = data;
        this.now = this.nowFn();
        if (data === null) this.status = 'unconnected';
        else if (data.entries.length === 0) this.status = 'empty';
        else this.status = 'ready';
        // Keep the selection if that student is still here; otherwise the first.
        const ids = data?.entries.map((entry) => entry.id) ?? [];
        if (!this.selectedId || !ids.includes(this.selectedId)) this.selectedId = ids[0] ?? null;
      });
    } catch {
      runInAction(() => {
        this.data = null;
        this.status = 'error';
      });
    }
  }

  /** Waiting times move on a minute clock. Returns a stop function. */
  startClock(): () => void {
    this.stopClock();
    this.clock = setInterval(() => this.tick(), 30_000);
    return this.stopClock;
  }

  stopClock(): void {
    if (this.clock !== null) clearInterval(this.clock);
    this.clock = null;
  }

  tick(): void {
    this.now = this.nowFn();
  }

  get summary(): string {
    return this.data ? queueSummary(this.data) : '';
  }

  get selected(): QueueEntry | null {
    return this.data?.entries.find((entry) => entry.id === this.selectedId) ?? null;
  }

  select(id: string): void {
    if (this.data?.entries.some((entry) => entry.id === id)) this.selectedId = id;
  }

  get canRequest(): boolean {
    return typeof this.source.requestAccess === 'function';
  }

  /**
   * Ask the student to share or renew. The entry is marked requested only once
   * the source accepts; access itself changes only when the student agrees.
   */
  async requestAccess(id: string): Promise<void> {
    const request = this.source.requestAccess;
    const entry = this.data?.entries.find((item) => item.id === id);
    if (!request || !entry || entry.consent === 'active' || entry.requested || this.requestingId) return;
    this.requestingId = id;
    try {
      await request(id);
      runInAction(() => {
        if (this.data) {
          this.data = { ...this.data, entries: this.data.entries.map((item) => (item.id === id ? { ...item, requested: true } : item)) };
        }
        const first = entry.patientName.split(' ')[0];
        this.toast = entry.consent === 'expired'
          ? `Renewal request sent. ${first} decides — nothing opens until they do.`
          : `Access request sent. ${first} decides what to share.`;
      });
    } catch {
      runInAction(() => {
        this.toast = 'Couldn’t send the request. Nothing was sent — try again.';
      });
    } finally {
      runInAction(() => {
        this.requestingId = null;
      });
    }
  }

  clearToast(): void {
    this.toast = null;
  }
}
