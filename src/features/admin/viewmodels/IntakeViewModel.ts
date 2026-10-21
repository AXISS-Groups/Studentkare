import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { IntakeRepository } from '../model/intakeRepository';
import type { IntakeQueue, IntakeQueueItem } from '../model/types';

/**
 * Intake & OCR: the documents whose intake is still open (a field waiting for
 * review, or reading queued or failed), with their kind, state and times only.
 * The super admin never sees a document's content or the fields read from it.
 *
 * The queue loads the way useApiResource did (see AuditExplorerViewModel).
 */
export class IntakeViewModel {
  queue: IntakeQueue | null = null;
  // True before the first load, so the first render shows loading rather than an empty queue.
  loading = true;
  error = '';
  private version = 0;
  private controller: AbortController | null = null;

  constructor(private readonly repository: IntakeRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller'>(
      this,
      { repository: false, version: false, controller: false, queue: observableRef },
      { autoBind: true },
    );
  }

  get items(): IntakeQueueItem[] { return this.queue?.items ?? []; }

  reload() { void this.load(); }

  async load() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    this.queue = null;
    try {
      const result = await this.repository.reviewQueue(controller.signal);
      if (version === this.version) runInAction(() => { this.queue = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  /** Stops the queue request in flight and ignores late answers. A later load works again. */
  dispose() {
    this.version += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
