import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { MedicineRepository } from '@/features/marketplace/data/MedicineRepository';
import type { MedicineAlternative } from '@/features/marketplace/data/MedicineRepository';
import { recallListing, rememberListing, rememberViewed } from '@/features/phoneKit/listingCache';

/**
 * Mobile 2.0 medicine page (M2Product, Tier 1; plan package A, D-M2-1 and
 * D-M2-2, approved by Krishna Chintakayala 2026-10-21), shared by the web
 * phone shop and the Expo app.
 *
 * Commerce only (Rule L): the catalogue (GET /catalog), its same-composition
 * listings (GET /catalog/{id}/alternatives, student-safe) and stock
 * (GET /inventory/{id}). Nothing here reads the health record: "do not take
 * with" is never checked against the student's own medicines here.
 *
 * Prescription medicines (D-M2-2): the server returns no alternatives and the
 * cart refuses them, so the page offers no stepper and no "Add to cart"; the
 * actions are "Add Rx" and "Send your prescription to a pharmacy". Reviewed
 * medicine information (uses, side effects, do not take with) does not exist
 * yet (D-M2-1, Gap 5), so that section is not drawn.
 */
export type ProductPhase = 'loading' | 'ready' | 'missing';
export type SidePhase = 'idle' | 'loading' | 'ready' | 'error';

/** GET /api/catalog returns at most 100 listings a page. */
const CATALOG_PAGE_MAX = 100;

export class M2ProductViewModel implements ViewModel {
  phase: ProductPhase = 'loading';
  item: LiveCatalogItem | null = null;
  composition: string | null = null;
  alternatives: MedicineAlternative[] = [];
  alternativesPhase: SidePhase = 'idle';
  /** True for a prescription listing: the server lists no other makers. */
  restricted = false;
  /** From GET /inventory/{id}; null until read or when it could not be read. */
  available: boolean | null = null;
  stockPhase: SidePhase = 'idle';
  quantity = 1;
  private version = 0;

  constructor(
    private readonly request: typeof apiRequest = apiRequest,
    private readonly medicines: MedicineRepository = new MedicineRepository(request),
  ) {
    makeAutoObservable<M2ProductViewModel, 'request' | 'medicines' | 'version'>(this, { request: false, medicines: false, version: false }, { autoBind: true });
  }

  /** The stepper's top: the server's per-line limit (setting shop.cart_line_max), never more than the stock. */
  get maxQuantity(): number {
    const limit = getSetting('shop.cart_line_max');
    const stock = this.item?.stock ?? 0;
    return Math.max(1, Math.min(limit, stock > 0 ? stock : 1));
  }

  get prescription(): boolean {
    return this.item?.requiresPrescription === true;
  }

  /** The cart takes it: an OTC product the stock read says is available. */
  get canAdd(): boolean {
    const item = this.item;
    if (!item || item.requiresPrescription || item.kind !== 'product') return false;
    return this.available === true;
  }

  setQuantity(next: number): void {
    this.quantity = Math.min(this.maxQuantity, Math.max(1, Math.round(next)));
  }

  async load(itemId: string): Promise<void> {
    const version = ++this.version;
    this.phase = 'loading';
    this.item = null;
    this.alternatives = [];
    this.alternativesPhase = 'idle';
    this.restricted = false;
    this.available = null;
    this.stockPhase = 'idle';
    this.quantity = 1;
    let found = recallListing(itemId);
    if (!found) {
      try {
        // The catalogue has no single-item read: a product opened by link is looked up in its first page.
        const res = await this.request<{ items: LiveCatalogItem[] }>(`/catalog?kind=product&limit=${CATALOG_PAGE_MAX}&offset=0`);
        res.items.forEach(rememberListing);
        found = res.items.find((i) => i.id === itemId) ?? null;
      } catch {
        found = null;
      }
    }
    if (version !== this.version) return;
    if (found) rememberViewed(found);
    runInAction(() => {
      this.item = found;
      this.composition = found?.composition ?? null;
      this.phase = found ? 'ready' : 'missing';
    });
    if (!found) return;
    await Promise.all([this.loadStock(found.id, version), this.loadAlternatives(found, version)]);
  }

  private async loadStock(itemId: string, version: number): Promise<void> {
    runInAction(() => { this.stockPhase = 'loading'; });
    try {
      const res = await this.request<{ available: boolean; stock: number }>(`/inventory/${encodeURIComponent(itemId)}`);
      if (version !== this.version) return;
      runInAction(() => {
        this.available = res.available === true;
        this.stockPhase = 'ready';
      });
    } catch {
      // No answer, no add: the stock check fails closed.
      if (version === this.version) runInAction(() => { this.available = null; this.stockPhase = 'error'; });
    }
  }

  private async loadAlternatives(item: LiveCatalogItem, version: number): Promise<void> {
    if (item.kind !== 'product' || !item.medicineId) return;
    runInAction(() => { this.alternativesPhase = 'loading'; });
    try {
      const alt = await this.medicines.alternatives(item.id);
      if (version !== this.version) return;
      runInAction(() => {
        // A prescription listing never shows other makers, even if a response carried some.
        this.restricted = alt.restricted || item.requiresPrescription;
        this.alternatives = this.restricted ? [] : [...alt.items].sort((a, b) => a.pricePaise - b.pricePaise);
        this.composition = alt.composition ?? this.composition;
        this.alternativesPhase = 'ready';
      });
    } catch {
      if (version === this.version) runInAction(() => { this.alternativesPhase = 'error'; });
    }
  }

  retryStock(): void {
    if (this.item) void this.loadStock(this.item.id, this.version);
  }

  retryAlternatives(): void {
    if (this.item) void this.loadAlternatives(this.item, this.version);
  }

  /** A same-composition listing as a catalogue item (to open its own page). */
  static asItem(alt: MedicineAlternative, category: string): LiveCatalogItem {
    return {
      id: alt.id, providerId: '', kind: 'product', name: alt.name, brand: alt.brand, category, description: '',
      pack: alt.pack, pricePaise: alt.pricePaise, mrpPaise: alt.mrpPaise, stock: alt.stock, active: true,
      requiresPrescription: alt.requiresPrescription, preparation: '', imageUrl: alt.imageUrl, composition: alt.composition,
    };
  }

  dispose(): void {
    this.version += 1;
  }

  reset(): void {
    this.dispose();
    this.phase = 'loading';
    this.item = null;
  }
}
