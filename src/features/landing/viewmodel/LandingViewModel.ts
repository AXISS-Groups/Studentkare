import { makeAutoObservable, runInAction } from 'mobx';

/**
 * Shared by the native landing screen (and available to web). Networking is
 * injected at the platform boundary, as in VaccineDirectoryViewModel.
 *
 * The only data this page shows is the public /catalog. It carries no account,
 * no session and nothing from a health record — Rule L: the landing page is a
 * commercial surface, so nothing clinical is ever read here.
 */

export type CatalogKind = 'product' | 'lab' | 'consultation' | 'vaccine' | 'wellness';

export interface LandingCatalogItem {
  id: string;
  name: string;
  brand: string;
  kind: CatalogKind;
  pack: string;
  pricePaise: number;
  mrpPaise: number;
}

export interface CatalogQuery { kind?: CatalogKind; limit: number }
export type ListLandingCatalog = (query: CatalogQuery) => Promise<LandingCatalogItem[]>;

export type CatalogStatus = 'loading' | 'ready' | 'empty' | 'error';

const KINDS: readonly CatalogKind[] = ['product', 'lab', 'consultation', 'vaccine', 'wellness'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPaise(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isCatalogItem(value: unknown): value is LandingCatalogItem {
  if (!isRecord(value)) return false;
  return ['id', 'name', 'brand', 'pack'].every(key => typeof value[key] === 'string') &&
    typeof value.kind === 'string' && (KINDS as readonly string[]).includes(value.kind) &&
    isPaise(value.pricePaise) && isPaise(value.mrpPaise);
}

/**
 * Validates a /catalog response. Fails closed: one malformed row rejects the
 * whole page, because a price is the one thing on this screen that must be
 * exactly what the server published. So does a row of a kind that was not
 * asked for — the lab page must not show a medicine as a lab test.
 */
export function parseCatalogPage(value: unknown, { kind, limit }: CatalogQuery): LandingCatalogItem[] {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > limit ||
      !value.items.every(isCatalogItem) || (kind && !value.items.every(item => item.kind === kind))) {
    throw new Error('The catalog returned a response we could not read.');
  }
  return value.items.map(({ id, name, brand, kind, pack, pricePaise, mrpPaise }) =>
    ({ id, name, brand, kind, pack, pricePaise, mrpPaise }));
}

export class LandingViewModel {
  items: LandingCatalogItem[] = [];
  status: CatalogStatus = 'loading';
  error = '';
  readonly query: CatalogQuery;
  private version = 0;

  constructor(private readonly list: ListLandingCatalog, query: CatalogQuery = { limit: 6 }) {
    this.query = query;
    makeAutoObservable<this, 'list' | 'version'>(this, { list: false, version: false, query: false }, { autoBind: true });
  }

  dispose() { this.version += 1; }

  async load() {
    const version = ++this.version;
    this.status = 'loading';
    this.error = '';
    this.items = [];
    try {
      const items = await this.list(this.query);
      if (version !== this.version) return;
      runInAction(() => {
        this.items = items;
        this.status = items.length > 0 ? 'ready' : 'empty';
      });
    } catch (reason) {
      if (version !== this.version) return;
      runInAction(() => {
        this.items = [];
        this.status = 'error';
        this.error = reason instanceof Error ? reason.message : 'Prices could not be loaded.';
      });
    }
  }
}

/** Paise to rupees. Integer paise in, no floating-point money arithmetic. */
export function rupees(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const grouped = whole.toLocaleString('en-IN');
  return remainder === 0 ? `₹${grouped}` : `₹${grouped}.${String(remainder).padStart(2, '0')}`;
}

export function kindLabel(kind: CatalogKind): string {
  const labels: Record<CatalogKind, string> = {
    product: 'Medicine',
    lab: 'Lab test',
    consultation: 'Consultation',
    vaccine: 'Vaccine',
    wellness: 'Wellness',
  };
  return labels[kind];
}
