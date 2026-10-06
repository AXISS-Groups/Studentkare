import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { AccountsRepository } from '../model/accountsRepository';
import type { AccountListQuery, AccountPage, NewStaffAccount } from '../model/types';

export const ACCOUNTS_PAGE_SIZE = 15;

/**
 * Manage accounts: a page of accounts, searched and filtered by role, and the form that
 * provisions a staff account. The list loads the way useApiResource did (see
 * AuditExplorerViewModel), and only when the query actually changes. Creating behaves as
 * useMutation did: one at a time, its error kept until the next attempt (also across
 * closing the form), and no state change after the screen has gone. A created account
 * clears the name and contact but keeps the role and channel.
 */
export class AccountsListViewModel {
  page = 0;
  query = '';
  roleFilter = '';
  data: AccountPage | null = null;
  // True before the first load, so the first render shows loading rather than an empty list.
  loading = true;
  error = '';
  fullName = '';
  identifier = '';
  role = 'VENDOR';
  channel = 'EMAIL';
  creating = false;
  createError = '';
  private version = 0;
  private controller: AbortController | null = null;
  private requestedKey = '';
  // Bumped on dispose only, so a creation finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly repository: AccountsRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller' | 'requestedKey' | 'generation'>(
      this,
      { repository: false, version: false, controller: false, requestedKey: false, generation: false, data: observableRef },
      { autoBind: true },
    );
  }

  get listQuery(): AccountListQuery {
    return { limit: ACCOUNTS_PAGE_SIZE, offset: this.page * ACCOUNTS_PAGE_SIZE, query: this.query, role: this.roleFilter };
  }

  get total(): number { return this.data?.total || 0; }

  /** A new search starts from the first page. */
  setQuery(query: string) { this.query = query; this.page = 0; this.refresh(); }
  /** A new role filter starts from the first page. */
  setRoleFilter(role: string) { this.roleFilter = role; this.page = 0; this.refresh(); }
  setPage(page: number) { this.page = page; this.refresh(); }

  setFullName(value: string) { this.fullName = value; }
  setIdentifier(value: string) { this.identifier = value; }
  setRole(value: string) { this.role = value; }
  setChannel(value: string) { this.channel = value; }

  /** The current page again. */
  reload() { void this.load(); }

  /** Provisions the staff account. True when it was created and the screen is still open. */
  async create(): Promise<boolean> {
    if (this.creating) return false;
    const generation = this.generation;
    const account: NewStaffAccount = { fullName: this.fullName, identifier: this.identifier, channel: this.channel, role: this.role };
    this.creating = true;
    this.createError = '';
    try {
      await this.repository.create(account);
      if (generation !== this.generation) return false;
      runInAction(() => { this.fullName = ''; this.identifier = ''; });
      this.reload();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.createError = reason instanceof Error ? reason.message : 'The request could not be completed.'; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.creating = false; });
    }
  }

  async load() {
    const version = ++this.version;
    const query = this.listQuery;
    this.requestedKey = JSON.stringify(query);
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    this.data = null;
    try {
      const result = await this.repository.list(query, controller.signal);
      if (version === this.version) runInAction(() => { this.data = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; });
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
    this.requestedKey = '';
  }

  /** Loads only when the query differs from the one last requested. */
  private refresh() {
    if (JSON.stringify(this.listQuery) !== this.requestedKey) void this.load();
  }
}
