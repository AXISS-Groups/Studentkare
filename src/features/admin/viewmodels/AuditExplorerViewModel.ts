import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { AuditEvent } from '@/data/workflowTypes';
import type { AuditRepository } from '../model/auditRepository';
import type { AuditPage } from '../model/types';

const AUDIT_PAGE_SIZE = 50;

/**
 * Audit explorer: one page of audit events, filtered on the client.
 *
 * Loading mirrors useApiResource, which this replaced: a new page clears the old
 * one and shows loading, a newer request wins over an older one, and an error
 * carries the request's own message.
 */
export class AuditExplorerViewModel {
  page = 0;
  data: AuditPage | null = null;
  // True before the first load, as useApiResource was, so the first render shows loading, not "no activity".
  loading = true;
  error = '';
  search = '';
  from = '';
  to = '';
  actor = '';
  eventType = '';
  selected: AuditEvent | null = null;
  private version = 0;
  private controller: AbortController | null = null;

  constructor(private readonly repository: AuditRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller'>(
      this,
      { repository: false, version: false, controller: false, data: observableRef, selected: observableRef },
      { autoBind: true },
    );
  }

  get items(): AuditEvent[] { return this.data?.items ?? []; }
  get total(): number { return this.data?.total ?? 0; }
  get actors(): string[] { return Array.from(new Set(this.items.map(item => item.actorId))).sort(); }
  get eventTypes(): string[] { return Array.from(new Set(this.items.map(item => item.action))).sort(); }
  get filtering(): boolean { return Boolean(this.search || this.from || this.to || this.actor || this.eventType); }
  get lastPage(): number { return Math.max(0, Math.ceil(this.total / AUDIT_PAGE_SIZE) - 1); }

  /** Filters apply to the loaded page only. */
  get filtered(): AuditEvent[] {
    const needle = this.search.trim().toLowerCase();
    const start = this.from ? new Date(`${this.from}T00:00:00`).getTime() / 1000 : null;
    const end = this.to ? new Date(`${this.to}T23:59:59`).getTime() / 1000 : null;
    return this.items.filter(item => (!needle || [item.action, item.resourceId, item.actorId].some(value => value.toLowerCase().includes(needle)))
      && (!this.actor || item.actorId === this.actor) && (!this.eventType || item.action === this.eventType)
      && (start === null || item.createdAt >= start) && (end === null || item.createdAt <= end));
  }

  setSearch(value: string) { this.search = value; }
  setFrom(value: string) { this.from = value; }
  setTo(value: string) { this.to = value; }
  setActor(value: string) { this.actor = value; }
  setEventType(value: string) { this.eventType = value; }
  select(event: AuditEvent) { this.selected = event; }

  /** Another page: the selection belonged to the old one. */
  goTo(page: number) {
    this.page = page;
    this.selected = null;
    void this.load();
  }

  /** The current page again. */
  reload() { void this.load(); }

  async load() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    this.data = null;
    try {
      const result = await this.repository.listEvents(this.page * AUDIT_PAGE_SIZE, AUDIT_PAGE_SIZE, controller.signal);
      if (version === this.version) runInAction(() => { this.data = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; });
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
