import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';

export type ShopKind = 'product' | 'lab';

/** GET /api/catalog → items[] (catalog_payload). */
export interface CatalogItem {
  id: string;
  kind: 'product' | 'lab' | 'consultation' | 'vaccine' | 'wellness';
  name: string;
  brand: string;
  pack: string;
  pricePaise: number;
  mrpPaise: number;
  stock: number;
  requiresPrescription: boolean;
}

/**
 * The native shop: medicines and lab tests from GET /api/catalog, the same
 * source as the web shop. It replaced a view-model whose provider and package
 * lists were always empty because it never called the API.
 *
 * Prescription-only items are listed but cannot be added: the backend refuses
 * them until prescription review is connected, so offering them would only
 * fail at checkout.
 */
export class ShopViewModel implements ViewModel {
  kind: ShopKind = 'product';
  query = '';
  items: CatalogItem[] | null = null;
  failed = false;
  private requestSeq = 0;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<ShopViewModel, 'disposed' | 'request' | 'requestSeq'>(this, { disposed: false, request: false, requestSeq: false }, { autoBind: true });
  }

  get loading(): boolean {
    return this.items === null && !this.failed;
  }

  static orderable(item: CatalogItem): boolean {
    return !item.requiresPrescription && item.stock > 0;
  }

  async load(): Promise<void> {
    this.disposed = false;
    const seq = ++this.requestSeq;
    this.items = null;
    this.failed = false;
    const q = this.query.trim();
    try {
      const res = await this.request<{ items: CatalogItem[] }>(`/catalog?kind=${this.kind}&limit=50${q ? `&query=${encodeURIComponent(q)}` : ''}`);
      // A slower, older answer must not overwrite a newer one.
      if (this.disposed || seq !== this.requestSeq) return;
      runInAction(() => { this.items = res.items; });
    } catch {
      if (!this.disposed && seq === this.requestSeq) runInAction(() => { this.failed = true; });
    }
  }

  setKind(kind: ShopKind): void {
    if (kind === this.kind) return;
    this.kind = kind;
    void this.load();
  }

  setQuery(query: string): void {
    this.query = query;
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.kind = 'product';
    this.query = '';
    this.items = null;
    this.failed = false;
  }
}
