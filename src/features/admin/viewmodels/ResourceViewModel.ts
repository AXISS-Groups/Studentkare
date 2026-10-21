import { makeAutoObservable, observableRef, runInAction } from 'mobx';

/**
 * One server resource on a super admin board: loading, then the data or an error
 * (with the server's own message), and a retry. A newer request wins over an older
 * one, and disposing ignores any late answer. Nothing that failed is ever turned
 * into data: a board reading this stays in `error` and shows no figures (fail closed).
 */
export class ResourceViewModel<T> {
  data: T | null = null;
  loading = true;
  /** True when the last request failed; `error` then holds the server's message, if any. */
  failed = false;
  error = '';
  private version = 0;
  private controller: AbortController | null = null;

  constructor(private readonly fetcher: (signal: AbortSignal) => Promise<T>) {
    makeAutoObservable<this, 'fetcher' | 'version' | 'controller'>(
      this,
      { fetcher: false, version: false, controller: false, data: observableRef },
      { autoBind: true },
    );
  }

  get status(): 'loading' | 'error' | 'ready' {
    if (this.loading) return 'loading';
    return this.failed || this.data === null ? 'error' : 'ready';
  }

  load() { void this.fetch(); }
  reload() { void this.fetch(); }

  async fetch() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    this.failed = false;
    this.data = null;
    try {
      const result = await this.fetcher(controller.signal);
      if (version === this.version) runInAction(() => { this.data = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.failed = true; this.error = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  /** Stops the request in flight and ignores its answer. A later load works again. */
  dispose() {
    this.version += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
