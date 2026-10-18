import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import { ApiError } from '../../../data/services/http';
import type { OutboxRepository } from '../model/outboxRepository';
import { OUTBOX_STATUSES } from '../model/types';
import type { OutboxMessage, OutboxRun } from '../model/types';

export type OutboxFilter = 'ALL' | typeof OUTBOX_STATUSES[number];

/** Messages that may be put back in the queue: the ones that failed. The server enforces the same rule. */
export const REQUEUEABLE = new Set(['FAILED']);

/** What the last requeue did, for the notice. */
export type RequeueOutcome = 'requeued' | 'notFound';

/**
 * Content & AI → Message outbox: the notification outbox with a status filter, a
 * "Process now" run and a requeue for failed messages. Rows arrive from the repository
 * with no subject or body and with contacts masked. Loads are version-guarded and
 * abortable; each action runs one at a time, reloads the list after, and changes
 * nothing once the screen has gone.
 */
export class MessageOutboxViewModel {
  messages: OutboxMessage[] | null = null;
  // True before the first load, so the first render shows loading rather than an empty list.
  loading = true;
  error = '';
  filter: OutboxFilter = 'ALL';
  confirmingProcess = false;
  processing = false;
  processError = '';
  /** The server said another worker is already processing the outbox (409). */
  processBusy = false;
  lastRun: OutboxRun | null = null;
  /** The message the requeue confirmation is open for. */
  requeueTarget: OutboxMessage | null = null;
  requeuing = false;
  requeueError = '';
  requeueOutcome: RequeueOutcome | null = null;
  private version = 0;
  private controller: AbortController | null = null;
  private generation = 0;

  constructor(private readonly repository: OutboxRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller' | 'generation'>(
      this,
      { repository: false, version: false, controller: false, generation: false, messages: observableRef, lastRun: observableRef, requeueTarget: observableRef },
      { autoBind: true },
    );
  }

  get visible(): OutboxMessage[] {
    const all = this.messages ?? [];
    return this.filter === 'ALL' ? all : all.filter(message => message.status === this.filter);
  }

  /** Messages per status, or null until the outbox has loaded (unknown, never 0). */
  countOf(status: string): number | null {
    return this.messages ? this.messages.filter(message => message.status === status).length : null;
  }

  get failedCount(): number | null {
    return this.messages ? this.messages.filter(message => REQUEUEABLE.has(message.status)).length : null;
  }

  setFilter(filter: OutboxFilter) { this.filter = filter; }
  reload() { void this.load(); }

  askProcess() { this.confirmingProcess = true; this.processError = ''; this.processBusy = false; }
  cancelProcess() { if (!this.processing) this.confirmingProcess = false; }

  askRequeue(message: OutboxMessage) {
    if (!REQUEUEABLE.has(message.status)) return;
    this.requeueTarget = message;
    this.requeueError = '';
  }
  cancelRequeue() { if (!this.requeuing) this.requeueTarget = null; }

  /** Runs the delivery job once. True when it ran and the screen is still open. */
  async process(): Promise<boolean> {
    if (this.processing) return false;
    const generation = this.generation;
    this.processing = true;
    this.processError = '';
    this.processBusy = false;
    this.lastRun = null;
    try {
      const run = await this.repository.process();
      if (generation !== this.generation) return false;
      runInAction(() => { this.lastRun = run; this.confirmingProcess = false; });
      this.reload();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => {
        this.processBusy = reason instanceof ApiError && reason.status === 409;
        this.processError = reason instanceof Error ? reason.message : '';
      });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.processing = false; });
    }
  }

  /** Puts the chosen failed message back in the queue. True when it was requeued and the screen is still open. */
  async requeue(): Promise<boolean> {
    const target = this.requeueTarget;
    if (this.requeuing || !target) return false;
    const generation = this.generation;
    this.requeuing = true;
    this.requeueError = '';
    this.requeueOutcome = null;
    try {
      const result = await this.repository.requeue(target.id);
      if (generation !== this.generation) return false;
      const outcome: RequeueOutcome = result.status === 'SUCCESS' ? 'requeued' : 'notFound';
      runInAction(() => { this.requeueOutcome = outcome; this.requeueTarget = null; });
      this.reload();
      return outcome === 'requeued';
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.requeueError = reason instanceof Error ? reason.message : ''; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.requeuing = false; });
    }
  }

  async load() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    try {
      const result = await this.repository.list(controller.signal);
      if (version === this.version) runInAction(() => { this.messages = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; this.messages = null; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  /** Stops the request in flight and ignores late answers. A later load works again. */
  dispose() {
    this.version += 1;
    this.generation += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
