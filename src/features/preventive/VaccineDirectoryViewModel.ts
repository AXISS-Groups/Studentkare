import { makeAutoObservable, runInAction } from 'mobx';
import type { Page, VaccineOffering } from './models';

export interface VaccineFilters { query: string; pincode: string; provider: string; offset: number; limit: number }
export type ListVaccines = (filters: VaccineFilters) => Promise<Page<VaccineOffering>>;

/** Shared by native and web; networking is injected at the platform boundary. */
export class VaccineDirectoryViewModel {
  query = '';
  pincode = '';
  provider = '';
  items: VaccineOffering[] = [];
  total = 0;
  offset = 0;
  readonly limit = 12;
  loading = false;
  error = '';
  private version = 0;

  constructor(private readonly list: ListVaccines) {
    makeAutoObservable<this, 'list' | 'version'>(this, { list: false, version: false }, { autoBind: true });
  }

  setQuery(value: string) { this.query = value; }
  setPincode(value: string) { this.pincode = value; }
  setProvider(value: string) { this.provider = value; }
  dispose() { this.version += 1; this.loading = false; }

  async search(offset = 0) {
    const version = ++this.version;
    this.error = '';
    this.items = [];
    this.total = 0;
    this.loading = false;
    if (this.pincode.trim() && !/^[1-9][0-9]{5}$/.test(this.pincode.trim())) {
      this.error = 'Enter a valid six-digit Indian pincode.';
      return;
    }
    this.offset = Math.max(0, offset);
    this.loading = true;
    try {
      const result = await this.list({ query: this.query.trim(), pincode: this.pincode.trim(), provider: this.provider, offset: this.offset, limit: this.limit });
      if (version !== this.version) return;
      runInAction(() => { this.items = result.items; this.total = result.total; this.offset = result.offset; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : 'Unable to load vaccine listings.'; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }
}
