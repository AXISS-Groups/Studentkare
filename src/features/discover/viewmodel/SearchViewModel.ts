import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import type { HomeArticle, HomeContent, LiveCatalogItem } from '@/data/types/workflowTypes';
import type { LabPackage } from '@/features/labBooking/data/LabBookingRepository';
import { rememberListing } from '@/features/phoneKit/listingCache';

/**
 * Phone search (canvas SearchEntry, then SearchTyping, then SearchLoading, then
 * SearchResults / NoResults, with the LabResults and DoctorResults lists).
 *
 * Everything shown comes from the public catalogue (GET /api/catalog, the
 * commerce plane), the bookable lab packages (GET /api/lab-packages) and the
 * published articles (GET /api/home). Nothing is read from the health record
 * and nothing is ranked by who pays: listings come back in the catalogue's own
 * order (by name). Recent searches live in this object only, for the open
 * screen; they are never stored on the device or sent anywhere.
 */

export type SearchStage = 'entry' | 'typing' | 'results';
export type ResultsPhase = 'idle' | 'loading' | 'ready' | 'error';
export type ResultsTab = 'all' | 'medicines' | 'labs' | 'doctors';
export type LabSort = 'name' | 'price';

/** One row of the typing suggestions or the "All" tab. */
export type SearchHit =
  | { type: 'listing'; item: LiveCatalogItem }
  | { type: 'article'; article: HomeArticle };

type Requester = typeof apiRequest;
type Clock = { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void };

const defaultClock: Clock = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

const words = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);
/** Every word of the query appears somewhere in the text (the catalogue's own rule is a substring match). */
const matchesAll = (query: string, ...fields: string[]) => {
  const hay = fields.join(' ').toLowerCase();
  return words(query).every((w) => hay.includes(w));
};

export class SearchViewModel implements ViewModel {
  query = '';
  stage: SearchStage = 'entry';
  /** The query the results are for (the field may have changed since). */
  searched = '';
  tab: ResultsTab = 'all';
  phase: ResultsPhase = 'idle';
  recents: string[] = [];

  suggestions: LiveCatalogItem[] = [];
  suggestPhase: 'idle' | 'loading' | 'ready' | 'error' = 'idle';

  listings: LiveCatalogItem[] = [];
  total = 0;
  labs: LabPackage[] = [];
  articles: HomeArticle[] = [];
  /** Lab packages could not be read: the lab tab says so instead of "none". */
  labsFailed = false;

  /** Lab list filters (canvas LabResults chips). */
  labHomeOnly = false;
  labNoFasting = false;
  labSort: LabSort = 'name';
  /** Doctor list filter: a consultation category, or '' for all. */
  doctorCategory = '';

  private disposed = false;
  private timer: unknown = null;
  private generation = 0;

  constructor(private readonly request: Requester = apiRequest, private readonly clock: Clock = defaultClock) {
    makeAutoObservable<SearchViewModel, 'disposed' | 'timer' | 'generation' | 'request' | 'clock'>(
      this, { disposed: false, timer: false, generation: false, request: false, clock: false }, { autoBind: true },
    );
  }

  // ── typing ────────────────────────────────────────────────────────────────

  setQuery(value: string): void {
    this.disposed = false;
    this.query = value;
    if (!value.trim()) {
      this.stage = 'entry';
      this.suggestions = [];
      this.suggestPhase = 'idle';
      this.cancelTimer();
      return;
    }
    this.stage = 'typing';
    this.cancelTimer();
    this.suggestPhase = 'loading';
    this.timer = this.clock.set(() => { void this.suggest(); }, getSetting('shop.search_debounce_ms'));
  }

  clear(): void {
    this.setQuery('');
  }

  /** Back from the results to the field (canvas: SearchResults, then SearchTyping). */
  editQuery(): void {
    this.stage = this.query.trim() ? 'typing' : 'entry';
  }

  private cancelTimer(): void {
    if (this.timer !== null) this.clock.clear(this.timer);
    this.timer = null;
  }

  async suggest(): Promise<void> {
    const q = this.query.trim();
    if (!q) return;
    const ticket = ++this.generation;
    try {
      const res = await this.request<{ items: LiveCatalogItem[] }>(
        `/catalog?limit=${getSetting('shop.search_suggestions_max')}&offset=0&query=${encodeURIComponent(q)}`,
      );
      if (this.disposed || ticket !== this.generation) return;
      res.items.forEach(rememberListing);
      runInAction(() => { this.suggestions = res.items; this.suggestPhase = 'ready'; });
    } catch {
      if (this.disposed || ticket !== this.generation) return;
      runInAction(() => { this.suggestions = []; this.suggestPhase = 'error'; });
    }
  }

  // ── results ───────────────────────────────────────────────────────────────

  /** Run the search for `value` (or the field), on `tab`. */
  async submit(value?: string, tab: ResultsTab = 'all'): Promise<void> {
    const q = (value ?? this.query).trim();
    if (!q) return;
    this.disposed = false;
    this.cancelTimer();
    this.query = q;
    this.searched = q;
    this.stage = 'results';
    this.tab = tab;
    this.phase = 'loading';
    this.remember(q);
    const ticket = ++this.generation;
    const max = getSetting('shop.search_results_max');
    try {
      const [catalog, labs, home] = await Promise.all([
        this.request<{ items: LiveCatalogItem[]; total: number }>(`/catalog?limit=${max}&offset=0&query=${encodeURIComponent(q)}`),
        this.request<{ items: LabPackage[] }>('/lab-packages').then((r) => ({ ok: true as const, items: r.items }), () => ({ ok: false as const, items: [] as LabPackage[] })),
        this.request<HomeContent>('/home').then((r) => r.articles ?? [], () => [] as HomeArticle[]),
      ]);
      if (this.disposed || ticket !== this.generation) return;
      catalog.items.forEach(rememberListing);
      runInAction(() => {
        this.listings = catalog.items;
        this.total = catalog.total;
        this.labs = labs.items.filter((p) => matchesAll(q, p.name, p.pack, p.description, ...p.includes));
        this.labsFailed = !labs.ok;
        this.articles = home.filter((a) => matchesAll(q, a.title, a.tag));
        this.phase = 'ready';
      });
    } catch {
      if (this.disposed || ticket !== this.generation) return;
      runInAction(() => { this.phase = 'error'; });
    }
  }

  retry(): void {
    void this.submit(this.searched, this.tab);
  }

  setTab(tab: ResultsTab): void {
    this.tab = tab;
  }

  private remember(q: string): void {
    const max = getSetting('shop.recent_searches_max');
    this.recents = [q, ...this.recents.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, max);
  }

  forget(q: string): void {
    this.recents = this.recents.filter((r) => r !== q);
  }

  clearRecents(): void {
    this.recents = [];
  }

  // ── projections ───────────────────────────────────────────────────────────

  get medicines(): LiveCatalogItem[] {
    return this.listings.filter((i) => i.kind === 'product');
  }

  /** Lab listings from the catalogue (the All tab); the lab tab uses `labList` (bookable packages). */
  get labListings(): LiveCatalogItem[] {
    return this.listings.filter((i) => i.kind === 'lab');
  }

  get doctors(): LiveCatalogItem[] {
    return this.listings.filter((i) => i.kind === 'consultation');
  }

  get doctorCategories(): string[] {
    return Array.from(new Set(this.doctors.map((d) => d.category).filter(Boolean)));
  }

  get doctorList(): LiveCatalogItem[] {
    return this.doctorCategory ? this.doctors.filter((d) => d.category === this.doctorCategory) : this.doctors;
  }

  get labList(): LabPackage[] {
    const list = this.labs.filter((p) => (!this.labHomeOnly || p.lab.homeCollection) && (!this.labNoFasting || p.fastingHours === 0));
    return this.labSort === 'price' ? [...list].sort((a, b) => a.pricePaise - b.pricePaise) : list;
  }

  /** The All tab: listings in catalogue order, then matching articles. */
  get allHits(): SearchHit[] {
    return [
      ...this.listings.map((item): SearchHit => ({ type: 'listing', item })),
      ...this.articles.map((article): SearchHit => ({ type: 'article', article })),
    ];
  }

  /** Nothing anywhere: the NoResults board. */
  get nothingFound(): boolean {
    return this.phase === 'ready' && this.listings.length === 0 && this.labs.length === 0 && this.articles.length === 0;
  }

  /** Other searches to try when nothing matched: each word of a longer query on its own. */
  get retryWords(): string[] {
    const list = words(this.searched).filter((w) => w.length > 2);
    return list.length > 1 ? Array.from(new Set(list)) : [];
  }

  toggleLabHome(): void { this.labHomeOnly = !this.labHomeOnly; }
  toggleLabFasting(): void { this.labNoFasting = !this.labNoFasting; }
  setLabSort(sort: LabSort): void { this.labSort = sort; }
  setDoctorCategory(category: string): void { this.doctorCategory = category; }

  dispose(): void {
    this.disposed = true;
    this.cancelTimer();
  }

  reset(): void {
    this.cancelTimer();
    this.query = '';
    this.searched = '';
    this.stage = 'entry';
    this.tab = 'all';
    this.phase = 'idle';
    this.suggestions = [];
    this.suggestPhase = 'idle';
    this.listings = [];
    this.labs = [];
    this.articles = [];
    this.total = 0;
  }
}
