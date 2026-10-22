import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { AccountsRepository } from '../model/accountsRepository';
import type { PartnerKind } from '@/data/types/workflowTypes';
import type { AccountListQuery, AccountPage, NewStaffAccount } from '../model/types';
import type { StaffAccount } from '@/data/types/workflowTypes';
import { isCampusScopedRole } from '../model/accessRules';

export const ACCOUNTS_PAGE_SIZE = 15;

/** The reason a two-step reset needs, with runs of spaces counted once (as the server does). */
const RESET_REASON_MIN = 10;
const RESET_REASON_MAX = 500;
const normalisedReason = (value: string) => value.split(/\s+/).filter(Boolean).join(' ');

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
  // Required for a partner: it decides which partner dashboard they see. No default, so it is always a choice.
  partnerKind: PartnerKind | '' = '';
  channel = 'EMAIL';
  /** Campus administrators only: the campus they act for. */
  university = '';
  /** Doctors only, and required: their NMC / state medical council registration number. */
  registrationNumber = '';
  creating = false;
  scopeError = '';
  scoping = false;
  createError = '';
  /** The account whose partner type is being changed, and why the last change failed. */
  updatingKindFor = '';
  kindError = '';
  /** The account whose two-step sign-in is about to be reset, while the confirm dialog is open. */
  resetTarget: StaffAccount | null = null;
  resetReason = '';
  /** True when confirm was pressed with a reason that is too short or too long. */
  resetReasonInvalid = false;
  resetting = false;
  resetError = '';
  /** The name of the account just reset, for the confirmation notice ('' = none). */
  resetDoneFor = '';
  private version = 0;
  private controller: AbortController | null = null;
  private requestedKey = '';
  // Bumped on dispose only, so a creation finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly repository: AccountsRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller' | 'requestedKey' | 'generation'>(
      this,
      { repository: false, version: false, controller: false, requestedKey: false, generation: false, data: observableRef, resetTarget: observableRef },
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
  setRole(value: string) { this.role = value; if (value !== 'VENDOR') this.partnerKind = ''; }
  setPartnerKind(value: PartnerKind | '') { this.partnerKind = value; }
  setChannel(value: string) { this.channel = value; }
  setUniversity(value: string) { this.university = value; }
  setRegistrationNumber(value: string) { this.registrationNumber = value; }

  /** The current page again. */
  reload() { void this.load(); }

  /** Sets a campus administrator's campus. True when saved and the screen is still open. */
  async setCampus(accountId: string, university: string): Promise<boolean> {
    if (this.scoping) return false;
    const generation = this.generation;
    this.scoping = true;
    this.scopeError = '';
    try {
      await this.repository.setCampus(accountId, university.trim());
      if (generation !== this.generation) return false;
      this.reload();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.scopeError = reason instanceof Error ? reason.message : 'The request could not be completed.'; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.scoping = false; });
    }
  }

  /** Opens the confirm dialog for resetting this account's two-step sign-in. */
  askResetTwoFactor(account: StaffAccount) {
    this.resetTarget = account;
    this.resetReason = '';
    this.resetReasonInvalid = false;
    this.resetError = '';
    this.resetDoneFor = '';
  }

  /** Cancel is always possible, except while the reset is being sent. */
  cancelResetTwoFactor() {
    if (this.resetting) return;
    this.resetTarget = null;
    this.resetReason = '';
    this.resetReasonInvalid = false;
    this.resetError = '';
  }

  setResetReason(value: string) { this.resetReason = value; this.resetReasonInvalid = false; }

  get resetReasonValid(): boolean {
    const length = normalisedReason(this.resetReason).length;
    return length >= RESET_REASON_MIN && length <= RESET_REASON_MAX;
  }

  /**
   * Resets the target's two-step sign-in (the server also ends their sessions and tells them).
   * Nothing is sent without a valid reason. True when reset and the screen is still open.
   */
  async confirmResetTwoFactor(): Promise<boolean> {
    const target = this.resetTarget;
    if (!target || this.resetting) return false;
    if (!this.resetReasonValid) { this.resetReasonInvalid = true; return false; }
    const generation = this.generation;
    this.resetting = true;
    this.resetError = '';
    try {
      await this.repository.resetTwoFactor(target.id, normalisedReason(this.resetReason));
      if (generation !== this.generation) return false;
      runInAction(() => {
        this.resetDoneFor = target.fullName;
        this.resetTarget = null;
        this.resetReason = '';
      });
      this.reload();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.resetError = reason instanceof Error ? reason.message : 'The request could not be completed.'; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.resetting = false; });
    }
  }

  /** Provisions the staff account. True when it was created and the screen is still open. */
  async create(): Promise<boolean> {
    if (this.creating) return false;
    const generation = this.generation;
    if (this.role === 'VENDOR' && !this.partnerKind) {
      this.createError = 'Choose the partner type: pharmacy, lab, clinic or wellness centre.';
      return false;
    }
    const account: NewStaffAccount = {
      fullName: this.fullName, identifier: this.identifier, channel: this.channel, role: this.role,
      ...(this.role === 'VENDOR' && this.partnerKind ? { partnerKind: this.partnerKind } : {}),
      ...(isCampusScopedRole(this.role) ? { university: this.university.trim() } : {}),
      ...(this.role === 'NMC_DOCTOR' ? { registrationNumber: this.registrationNumber.trim() } : {}),
    };
    this.creating = true;
    this.createError = '';
    try {
      await this.repository.create(account);
      if (generation !== this.generation) return false;
      runInAction(() => { this.fullName = ''; this.identifier = ''; this.partnerKind = ''; this.university = ''; this.registrationNumber = ''; });
      this.reload();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.createError = reason instanceof Error ? reason.message : 'The request could not be completed.'; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.creating = false; });
    }
  }

  /** Changes a partner's type. True when it was saved; the list reloads to show it. */
  async changePartnerKind(accountId: string, partnerKind: PartnerKind): Promise<boolean> {
    if (this.updatingKindFor) return false;
    const generation = this.generation;
    this.updatingKindFor = accountId;
    this.kindError = '';
    try {
      await this.repository.setPartnerKind(accountId, partnerKind);
      if (generation !== this.generation) return false;
      this.reload();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.kindError = reason instanceof Error ? reason.message : 'The partner type could not be changed.'; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.updatingKindFor = ''; });
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
