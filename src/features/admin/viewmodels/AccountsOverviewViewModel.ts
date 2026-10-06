import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { AccountRole, OpsFeed, OpsFeedEvent } from '@/data/workflowTypes';
import type { AccountsRepository } from '../model/accountsRepository';
import type { OpsRepository } from '../model/opsRepository';
import { appAccess, clinicalAccess, ROLE_ROWS } from '../model/accessRules';

interface CountState { total: number | null; loading: boolean; error: string }
export interface RoleRow { role: AccountRole; name: string; description: string; count: number; access: { label: string; tone: string }; app: string }

const RECENT_LIMIT = 200;
const ROLES = ROLE_ROWS.map(([role]) => role);
const initialCounts = () => Object.fromEntries(ROLES.map(role => [role, { total: null, loading: true, error: '' }])) as Record<AccountRole, CountState>;

/**
 * Accounts & roles: the number of accounts per role, what each role may reach, and the
 * staff accounts created recently. Each role's count loads on its own, the way the five
 * useApiResource calls it replaced did (see AuditExplorerViewModel): the screen waits for
 * all of them and shows the first failure in role order. Recent changes load each time
 * that view opens, as their component did on each mount.
 */
export class AccountsOverviewViewModel {
  counts: Record<AccountRole, CountState> = initialCounts();
  recentFeed: OpsFeed | null = null;
  // True before the first load, so opening the view shows loading rather than "no changes".
  recentLoading = true;
  recentError = '';
  private countVersions = new Map<AccountRole, number>();
  private countControllers = new Map<AccountRole, AbortController>();
  private recentVersion = 0;
  private recentController: AbortController | null = null;

  constructor(private readonly accounts: AccountsRepository, private readonly ops: OpsRepository) {
    makeAutoObservable<this, 'accounts' | 'ops' | 'countVersions' | 'countControllers' | 'recentVersion' | 'recentController'>(
      this,
      { accounts: false, ops: false, countVersions: false, countControllers: false, recentVersion: false, recentController: false, counts: observableRef, recentFeed: observableRef },
      { autoBind: true },
    );
  }

  get loading(): boolean { return ROLES.some(role => this.counts[role].loading); }
  /** The first count that failed, in role order. */
  get error(): string | null {
    const failed = ROLES.find(role => this.counts[role].error);
    return failed ? this.counts[failed].error : null;
  }
  get total(): number { return ROLES.reduce((sum, role) => sum + this.countOf(role), 0); }
  get roleCount(): number { return ROLE_ROWS.length; }
  countOf(role: AccountRole): number { return this.counts[role].total ?? 0; }

  /** One row per role: its count, the clinical data it may reach and the workspace it uses. */
  get roleRows(): RoleRow[] {
    return ROLE_ROWS.map(([role, name, description]) => ({ role, name, description, count: this.countOf(role), access: clinicalAccess(role), app: appAccess(role) }));
  }

  /** Staff accounts created, from the account feed (summaries carry the role only). */
  get recentChanges(): OpsFeedEvent[] { return (this.recentFeed?.items ?? []).filter(event => event.kind === 'STAFF_ACCOUNT_CREATED'); }

  /** Every role's count, in role order. */
  load() { ROLES.forEach(role => { void this.loadCount(role); }); }

  async loadCount(role: AccountRole) {
    const version = (this.countVersions.get(role) ?? 0) + 1;
    this.countVersions.set(role, version);
    this.countControllers.get(role)?.abort();
    const controller = new AbortController();
    this.countControllers.set(role, controller);
    this.setCount(role, { total: null, loading: true, error: '' });
    const current = () => this.countVersions.get(role) === version;
    try {
      const result = await this.accounts.countByRole(role, controller.signal);
      if (current()) this.setCount(role, { total: result.total, loading: false, error: '' });
    } catch (reason) {
      if (current()) this.setCount(role, { total: null, loading: false, error: reason instanceof Error ? reason.message : '' });
    }
  }

  async loadRecentChanges() {
    const version = ++this.recentVersion;
    this.recentController?.abort();
    const controller = new AbortController();
    this.recentController = controller;
    this.recentLoading = true;
    this.recentError = '';
    this.recentFeed = null;
    try {
      const result = await this.ops.domainFeed('ACCOUNT', RECENT_LIMIT, controller.signal);
      if (version === this.recentVersion) runInAction(() => { this.recentFeed = result; });
    } catch (reason) {
      if (version === this.recentVersion) runInAction(() => { this.recentError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.recentVersion) runInAction(() => { this.recentLoading = false; });
    }
  }

  /** Recent changes are no longer shown: stop their request and ignore its answer. */
  stopRecentChanges() {
    this.recentVersion += 1;
    this.recentController?.abort();
    this.recentController = null;
  }

  /** Stops every request in flight and ignores late answers. A later load works again. */
  dispose() {
    ROLES.forEach(role => {
      this.countVersions.set(role, (this.countVersions.get(role) ?? 0) + 1);
      this.countControllers.get(role)?.abort();
    });
    this.countControllers.clear();
    this.stopRecentChanges();
  }

  private setCount(role: AccountRole, state: CountState) { this.counts = { ...this.counts, [role]: state }; }
}
