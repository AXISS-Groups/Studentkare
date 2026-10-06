import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { LiveCatalogItem, StaffAccount } from '@/data/workflowTypes';
import type { AccountsRepository } from '../model/accountsRepository';
import type { CatalogueRepository } from '../model/catalogueRepository';
import type { AccountList, CatalogEntryForm, CatalogPage, NewCatalogEntry } from '../model/types';

export const CATALOG_PAGE_SIZE = 15;
const SUMMARY_SAMPLE = 200;
const FAILED = 'The request could not be completed.';
const EMPTY_FORM: CatalogEntryForm = { name: '', brand: '', kind: 'product', category: 'devices', description: '', pack: '', price: '', stock: '', providerId: '', preparation: '', requiresPrescription: false };

/**
 * Catalogue ops: a summary from the first 200 entries, a searchable page of entries,
 * the accounts that can be assigned as providers, and the changes an admin makes.
 *
 * Each of the three loads independently, the way useApiResource did (see
 * AuditExplorerViewModel); the list reloads only when its query changes. Entry changes
 * (publish, stock, hide/publish) share one lock and one error, and photo changes
 * (upload, remove) share another, as the two useMutation calls they replace did: one at
 * a time, the error kept until the next attempt, and no state change after the screen
 * has gone. Every successful change reloads the list (not the summary). Stock edits
 * stay as typed after a save.
 */
export class CatalogueViewModel {
  summary: CatalogPage | null = null;
  summaryLoading = true;
  summaryError = '';
  page = 0;
  query = '';
  list: CatalogPage | null = null;
  listLoading = true;
  listError = '';
  accounts: AccountList | null = null;
  accountsError = '';
  form: CatalogEntryForm = { ...EMPTY_FORM };
  stockEdits: Record<string, string> = {};
  saving = false;
  actionError = '';
  imageBusy = false;
  imageError = '';
  private summaryVersion = 0;
  private listVersion = 0;
  private accountsVersion = 0;
  private controllers: Partial<Record<'summary' | 'list' | 'accounts', AbortController>> = {};
  private requestedKey = '';
  // Bumped on dispose only, so a change finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly catalogue: CatalogueRepository, private readonly accountsRepository: AccountsRepository) {
    makeAutoObservable<this, 'catalogue' | 'accountsRepository' | 'summaryVersion' | 'listVersion' | 'accountsVersion' | 'controllers' | 'requestedKey' | 'generation'>(
      this,
      { catalogue: false, accountsRepository: false, summaryVersion: false, listVersion: false, accountsVersion: false, controllers: false, requestedKey: false, generation: false, summary: observableRef, list: observableRef, accounts: observableRef },
      { autoBind: true },
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  get sampled(): LiveCatalogItem[] { return this.summary?.items ?? []; }
  /** The summary counts only the sampled entries when the catalogue is larger than the sample. */
  get summaryIsPartial(): boolean { return (this.summary?.total ?? 0) > this.sampled.length; }
  get productCount(): number { return this.sampled.filter(item => item.kind === 'product').length; }
  get serviceCount(): number { return this.sampled.filter(item => item.kind !== 'product').length; }
  /** Stock is tracked for products only; the other kinds always carry 0. */
  get outOfStockCount(): number { return this.sampled.filter(item => item.kind === 'product' && item.stock === 0).length; }

  // ── List ───────────────────────────────────────────────────────────────────
  get items(): LiveCatalogItem[] { return this.list?.items ?? []; }
  get total(): number { return this.list?.total || 0; }

  /** A new search starts from the first page. */
  setQuery(query: string) { this.query = query; this.page = 0; this.refreshList(); }
  setPage(page: number) { this.page = page; this.refreshList(); }

  // ── Publish form ───────────────────────────────────────────────────────────
  /** Active accounts of the role the entry type needs: clinicians for consultations, partners otherwise. */
  get providers(): StaffAccount[] {
    const role = this.form.kind === 'consultation' ? 'NMC_DOCTOR' : 'VENDOR';
    return this.accounts?.items.filter(item => item.active && item.role === role) || [];
  }

  setField<K extends keyof CatalogEntryForm>(key: K, value: CatalogEntryForm[K]) { this.form = { ...this.form, [key]: value }; }
  /** Another entry type needs another kind of provider, so the provider choice is cleared. */
  setKind(kind: string) { this.form = { ...this.form, kind, providerId: '' }; }

  // ── Stock ──────────────────────────────────────────────────────────────────
  /** What an entry's stock field shows: the admin's edit, or the stock the server reports. */
  stockText(item: LiveCatalogItem): string { return this.stockEdits[item.id] ?? String(item.stock); }
  editStock(itemId: string, value: string) { this.stockEdits = { ...this.stockEdits, [itemId]: value }; }
  /** Only a whole number can be saved. */
  canSaveStock(item: LiveCatalogItem): boolean { return /^[0-9]+$/.test(this.stockText(item)); }

  // ── Entry changes (one lock) ───────────────────────────────────────────────
  /** Publishes the form, then uploads its photo if one was chosen. True when it all succeeded and the screen is still open. */
  publish(image: Blob | null): Promise<boolean> {
    const { price, ...payload } = this.form;
    const entry: NewCatalogEntry = { ...payload, stock: Number(this.form.stock || 0), pricePaise: Math.round(Number(price) * 100) };
    return this.change(async () => {
      const created = await this.catalogue.create(entry);
      if (image && created?.id) await this.catalogue.uploadImage(created.id, image);
    }, () => { this.form = { ...EMPTY_FORM }; });
  }

  saveStock(item: LiveCatalogItem): Promise<boolean> {
    const change = { stock: Number(this.stockEdits[item.id] ?? item.stock), active: item.active };
    return this.change(() => this.catalogue.update(item.id, change));
  }

  togglePublished(item: LiveCatalogItem): Promise<boolean> {
    return this.change(() => this.catalogue.update(item.id, { stock: item.stock, active: !item.active }));
  }

  // ── Photo changes (another lock) ───────────────────────────────────────────
  uploadImage(itemId: string, image: Blob): Promise<boolean> {
    return this.changeImage(() => this.catalogue.uploadImage(itemId, image));
  }

  removeImage(itemId: string): Promise<boolean> {
    return this.changeImage(() => this.catalogue.removeImage(itemId));
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  /** The summary, the first page and the accounts, in that order. */
  load() {
    void this.loadSummary();
    void this.loadList();
    void this.loadAccounts();
  }

  reloadSummary() { void this.loadSummary(); }
  reloadList() { void this.loadList(); }

  async loadSummary() {
    const version = ++this.summaryVersion;
    const signal = this.restart('summary');
    this.summaryLoading = true;
    this.summaryError = '';
    this.summary = null;
    try {
      const result = await this.catalogue.sample(SUMMARY_SAMPLE, signal);
      if (version === this.summaryVersion) runInAction(() => { this.summary = result; });
    } catch (reason) {
      if (version === this.summaryVersion) runInAction(() => { this.summaryError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.summaryVersion) runInAction(() => { this.summaryLoading = false; });
    }
  }

  async loadList() {
    const version = ++this.listVersion;
    const query = { limit: CATALOG_PAGE_SIZE, offset: this.page * CATALOG_PAGE_SIZE, query: this.query };
    this.requestedKey = JSON.stringify(query);
    const signal = this.restart('list');
    this.listLoading = true;
    this.listError = '';
    this.list = null;
    try {
      const result = await this.catalogue.list(query, signal);
      if (version === this.listVersion) runInAction(() => { this.list = result; });
    } catch (reason) {
      if (version === this.listVersion) runInAction(() => { this.listError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.listVersion) runInAction(() => { this.listLoading = false; });
    }
  }

  async loadAccounts() {
    const version = ++this.accountsVersion;
    const signal = this.restart('accounts');
    this.accountsError = '';
    this.accounts = null;
    try {
      const result = await this.accountsRepository.listAll(signal);
      if (version === this.accountsVersion) runInAction(() => { this.accounts = result; });
    } catch (reason) {
      if (version === this.accountsVersion) runInAction(() => { this.accountsError = reason instanceof Error ? reason.message : ''; });
    }
  }

  /** Stops every request in flight and ignores late answers. A later load works again. */
  dispose() {
    this.summaryVersion += 1;
    this.listVersion += 1;
    this.accountsVersion += 1;
    this.generation += 1;
    Object.values(this.controllers).forEach(controller => controller?.abort());
    this.controllers = {};
    this.requestedKey = '';
  }

  /** Loads the list only when its query differs from the one last requested. */
  private refreshList() {
    const key = JSON.stringify({ limit: CATALOG_PAGE_SIZE, offset: this.page * CATALOG_PAGE_SIZE, query: this.query });
    if (key !== this.requestedKey) void this.loadList();
  }

  /** Cancels the previous request of this kind and returns the signal for the next. */
  private restart(kind: 'summary' | 'list' | 'accounts'): AbortSignal {
    this.controllers[kind]?.abort();
    const controller = new AbortController();
    this.controllers[kind] = controller;
    return controller.signal;
  }

  private async change(task: () => Promise<unknown>, onSuccess?: () => void): Promise<boolean> {
    if (this.saving) return false;
    const generation = this.generation;
    this.saving = true;
    this.actionError = '';
    try {
      await task();
      if (generation !== this.generation) return false;
      runInAction(() => onSuccess?.());
      this.reloadList();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.actionError = reason instanceof Error ? reason.message : FAILED; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.saving = false; });
    }
  }

  private async changeImage(task: () => Promise<unknown>): Promise<boolean> {
    if (this.imageBusy) return false;
    const generation = this.generation;
    this.imageBusy = true;
    this.imageError = '';
    try {
      await task();
      if (generation !== this.generation) return false;
      this.reloadList();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.imageError = reason instanceof Error ? reason.message : FAILED; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.imageBusy = false; });
    }
  }
}
