import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError } from '@/data/services/http';

/**
 * One server read behind one card of a Mobile 2.0 health screen (M2Insights,
 * M2Profile). Each card loads, fails and retries on its own, so one failing
 * endpoint never blanks the page (plan: "each resource fails independently").
 * Held in memory only: nothing is cached on the device (WP-07 D7-1).
 */
export type ResourcePhase = 'loading' | 'ready' | 'error';

export class Resource<T> {
  phase: ResourcePhase = 'loading';
  data: T | null = null;
  /** The server's own message when it sent one ('' otherwise; the view words the rest). */
  message = '';
  private version = 0;

  constructor(private readonly read: () => Promise<T>) {
    makeAutoObservable<Resource<T>, 'read' | 'version'>(this, { read: false, version: false }, { autoBind: true });
  }

  get ready(): boolean {
    return this.phase === 'ready' && this.data !== null;
  }

  async load(): Promise<void> {
    const version = ++this.version;
    this.phase = 'loading';
    this.message = '';
    try {
      const data = await this.read();
      if (version !== this.version) return;
      runInAction(() => {
        this.data = data;
        this.phase = 'ready';
      });
    } catch (error) {
      if (version !== this.version) return;
      runInAction(() => {
        this.data = null;
        this.phase = 'error';
        this.message = error instanceof ApiError ? error.message : '';
      });
    }
  }

  /** Show what a write returned (the server's own copy of the resource), dropping any older read still on its way. */
  set(data: T): void {
    this.version += 1;
    this.data = data;
    this.phase = 'ready';
    this.message = '';
  }

  /** Forget any reply still on its way (the screen went away). */
  cancel(): void {
    this.version += 1;
  }
}
