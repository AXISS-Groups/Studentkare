import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import type { Delivery, LiveCatalogItem, LiveOrder } from '@/data/types/workflowTypes';
import type { MessageKey } from '@/i18n';
import { PayStepViewModel } from '@/features/payments/viewmodel/PayStepViewModel';
import { MedicineRepository } from '@/features/marketplace/data/MedicineRepository';
import type { MedicineAlternative } from '@/features/marketplace/data/MedicineRepository';
import { recallListing, rememberListing } from '@/features/phoneKit/listingCache';

/**
 * The phone shop (canvas ShopHome, then ProductList, then ProductDetail, then Cart, then
 * Checkout, then Payment, then OrderSuccess), as one stack of boards.
 *
 * Every price comes from the catalogue (GET /api/catalog) and the order total
 * from the server (POST /api/orders); the client only adds up what it shows.
 * Nothing here reads the health record (Rule L): the shop's lists are the
 * catalogue's, in its own order, never chosen from a person's data. Checking
 * stock and serviceability fails closed: no answer, no order.
 */

export type ShopScreen =
  | { name: 'home' }
  | { name: 'list'; category: string; query: string }
  | { name: 'detail'; itemId: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'pay' }
  | { name: 'success' };

export type Phase = 'idle' | 'loading' | 'ready' | 'error';
export type ListSort = 'name' | 'price' | 'discount';

/** The cart, whoever keeps it (the web's LiveCart, the app's checkout store). */
export interface CartLine { item: LiveCatalogItem; quantity: number }
export interface CartPort {
  lines: readonly CartLine[];
  add: (item: LiveCatalogItem) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}

type Requester = typeof apiRequest;

/** GET /api/catalog returns at most 100 listings a page (its `limit` bound). */
const CATALOG_PAGE_MAX = 100;

/** The cart refuses these (LiveCartContext): a prescription item, or a product with no stock. */
export const cannotAdd = (item: LiveCatalogItem) => item.requiresPrescription || (item.kind === 'product' && item.stock < 1);

function newKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** "YYYY-MM-DD" + "HH:MM" in the device's time zone, or null when not a real future time. */
export function requestedSlot(date: string, time: string, now = Date.now()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const at = new Date(`${date}T${time}:00`);
  if (Number.isNaN(at.getTime()) || at.getTime() <= now) return null;
  return at.toISOString();
}

export class PhoneShopViewModel implements ViewModel {
  stack: ShopScreen[] = [{ name: 'home' }];

  // home
  homePhase: Phase = 'idle';
  featured: LiveCatalogItem[] = [];
  featuredTotal = 0;
  /** Kare points balance, or null when it could not be read (the card says so). */
  points: number | null = null;
  pointsNote = '';
  labFromPaise: number | null = null;

  // list
  listPhase: Phase = 'idle';
  listItems: LiveCatalogItem[] = [];
  listTotal = 0;
  listPage = 0;
  sort: ListSort = 'name';

  // detail
  detailPhase: Phase = 'idle';
  detail: LiveCatalogItem | null = null;
  alternatives: MedicineAlternative[] = [];
  alternativesPhase: Phase = 'idle';
  alternativesRestricted = false;
  composition: string | null = null;

  // checkout
  delivery: Delivery = { mode: 'pickup', address: '', city: '', pincode: '' };
  slotDate = '';
  slotTime = '';
  placing = false;
  /** Why the order was not placed: one of ours, or the server's words. */
  checkoutError: MessageKey | '' = '';
  checkoutErrorText = '';
  order: LiveOrder | null = null;
  payment: PayStepViewModel | null = null;

  private disposed = false;
  private key = { fingerprint: '', id: '' };

  constructor(
    initial: ShopScreen = { name: 'home' },
    private readonly request: Requester = apiRequest,
    private readonly medicines: MedicineRepository = new MedicineRepository(request),
    private readonly makePayment: (orderId: string, amountPaise: number) => PayStepViewModel = (orderId, amountPaise) => new PayStepViewModel(orderId, amountPaise),
  ) {
    this.stack = initial.name === 'home' ? [initial] : [{ name: 'home' }, initial];
    makeAutoObservable<PhoneShopViewModel, 'disposed' | 'key' | 'request' | 'medicines' | 'makePayment'>(
      this, { disposed: false, key: false, request: false, medicines: false, makePayment: false }, { autoBind: true },
    );
  }

  get screen(): ShopScreen {
    return this.stack[this.stack.length - 1] ?? { name: 'home' };
  }

  /** Open the board the stack is showing (fetching what it needs). */
  start(): void {
    this.disposed = false;
    this.enter(this.screen);
  }

  private enter(screen: ShopScreen): void {
    if (screen.name === 'home' && this.homePhase !== 'ready') void this.loadHome();
    if (screen.name === 'list') { this.listPage = 0; void this.loadList(); }
    if (screen.name === 'detail') void this.loadDetail(screen.itemId);
  }

  push(screen: ShopScreen): void {
    this.stack = [...this.stack, screen];
    this.enter(screen);
  }

  /** Back one board; false when already at the shop home (the caller leaves the shop). */
  back(): boolean {
    if (this.stack.length <= 1) return false;
    this.stack = this.stack.slice(0, -1);
    this.enter(this.screen);
    return true;
  }

  /** Back to the shop home (after an order, "Back to shop"). */
  home(): void {
    this.stack = [{ name: 'home' }];
    this.enter(this.screen);
  }

  openList(filter: { category?: string; query?: string }): void {
    this.push({ name: 'list', category: filter.category ?? '', query: filter.query ?? '' });
  }

  openProduct(item: LiveCatalogItem): void {
    rememberListing(item);
    this.push({ name: 'detail', itemId: item.id });
  }

  // ── home ──────────────────────────────────────────────────────────────────

  async loadHome(): Promise<void> {
    this.homePhase = 'loading';
    try {
      const [catalog, points, labs] = await Promise.all([
        this.request<{ items: LiveCatalogItem[]; total: number }>(`/catalog?kind=product&limit=${getSetting('shop.home_featured_count')}&offset=0`),
        // Points are the student's own (GET /api/points/me); without them the card says it could not load.
        this.request<{ balance: number; pointsNote: string }>('/points/me').then((p) => p, () => null),
        this.request<{ items: { pricePaise: number }[] }>('/lab-packages').then((r) => r.items, () => [] as { pricePaise: number }[]),
      ]);
      if (this.disposed) return;
      catalog.items.forEach(rememberListing);
      runInAction(() => {
        this.featured = catalog.items;
        this.featuredTotal = catalog.total;
        this.points = points ? points.balance : null;
        this.pointsNote = points?.pointsNote ?? '';
        this.labFromPaise = labs.length ? Math.min(...labs.map((l) => l.pricePaise)) : null;
        this.homePhase = 'ready';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.homePhase = 'error'; });
    }
  }

  // ── list ──────────────────────────────────────────────────────────────────

  get listFilter(): { category: string; query: string } {
    const s = this.screen;
    return s.name === 'list' ? { category: s.category, query: s.query } : { category: '', query: '' };
  }

  async loadList(): Promise<void> {
    const { category, query } = this.listFilter;
    const size = getSetting('shop.product_list_page_size');
    this.listPhase = 'loading';
    // Lab packages are listed as labs; everything else in the shop list is a product.
    const kind = category === 'labs' ? 'lab' : 'product';
    const path = `/catalog?kind=${kind}&limit=${size}&offset=${this.listPage * size}`
      + `${category && category !== 'labs' ? `&category=${encodeURIComponent(category)}` : ''}&query=${encodeURIComponent(query)}`;
    try {
      const res = await this.request<{ items: LiveCatalogItem[]; total: number }>(path);
      if (this.disposed) return;
      res.items.forEach(rememberListing);
      runInAction(() => {
        this.listItems = this.listPage === 0 ? res.items : [...this.listItems, ...res.items];
        this.listTotal = res.total;
        this.listPhase = 'ready';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.listPhase = 'error'; });
    }
  }

  get canLoadMore(): boolean {
    return this.listPhase === 'ready' && this.listItems.length < this.listTotal;
  }

  loadMore(): void {
    if (!this.canLoadMore) return;
    this.listPage += 1;
    void this.loadList();
  }

  setSort(sort: ListSort): void {
    this.sort = sort;
  }

  /** The list in the chosen order. "Name" is the catalogue's own order. */
  get sortedList(): LiveCatalogItem[] {
    if (this.sort === 'price') return [...this.listItems].sort((a, b) => a.pricePaise - b.pricePaise);
    if (this.sort === 'discount') {
      const off = (i: LiveCatalogItem) => (i.mrpPaise > i.pricePaise ? 1 - i.pricePaise / i.mrpPaise : 0);
      return [...this.listItems].sort((a, b) => off(b) - off(a));
    }
    return this.listItems;
  }

  // ── detail ────────────────────────────────────────────────────────────────

  async loadDetail(itemId: string): Promise<void> {
    let known = recallListing(itemId);
    if (!known) {
      // A product opened by link: the catalogue has no single-item read, so look in its first page.
      this.detailPhase = 'loading';
      this.detail = null;
      try {
        const res = await this.request<{ items: LiveCatalogItem[] }>(`/catalog?kind=product&limit=${CATALOG_PAGE_MAX}&offset=0`);
        if (this.disposed) return;
        res.items.forEach(rememberListing);
        known = res.items.find((i) => i.id === itemId) ?? null;
      } catch {
        known = null;
      }
    }
    const found = known;
    const hasMedicine = Boolean(found && found.kind === 'product' && found.medicineId);
    runInAction(() => {
      this.detail = found;
      this.detailPhase = found ? 'ready' : 'error';
      this.alternatives = [];
      this.alternativesRestricted = false;
      this.composition = found?.composition ?? null;
      this.alternativesPhase = hasMedicine ? 'loading' : 'idle';
    });
    if (!hasMedicine) return;
    try {
      const alt = await this.medicines.alternatives(itemId);
      if (this.disposed) return;
      runInAction(() => {
        this.alternatives = alt.items;
        this.alternativesRestricted = alt.restricted;
        this.composition = alt.composition ?? this.composition;
        this.alternativesPhase = 'ready';
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.alternativesPhase = 'error'; });
    }
  }

  /** Switch the detail to a same-composition listing (cheapest first, OTC only). */
  chooseAlternative(alt: MedicineAlternative): void {
    const current = this.detail;
    if (!current) return;
    const item: LiveCatalogItem = {
      id: alt.id, providerId: '', kind: 'product', name: alt.name, brand: alt.brand, category: current.category, description: '',
      pack: alt.pack, pricePaise: alt.pricePaise, mrpPaise: alt.mrpPaise, stock: alt.stock, active: true,
      requiresPrescription: alt.requiresPrescription, preparation: '', imageUrl: alt.imageUrl, composition: alt.composition,
    };
    rememberListing(item);
    const s = this.screen;
    if (s.name === 'detail') this.stack = [...this.stack.slice(0, -1), { name: 'detail', itemId: alt.id }];
    this.detail = item;
    this.alternatives = this.alternatives.filter((a) => a.id !== alt.id);
  }

  // ── checkout ──────────────────────────────────────────────────────────────

  setDelivery(patch: Partial<Delivery>): void {
    this.delivery = { ...this.delivery, ...patch };
    this.checkoutError = '';
    this.checkoutErrorText = '';
  }

  setSlot(date: string, time: string): void {
    this.slotDate = date;
    this.slotTime = time;
    this.checkoutError = '';
  }

  /** A consultation or vaccine in the cart needs a requested time; products do not. */
  needsSlot(cart: CartPort): boolean {
    return cart.lines.some((l) => l.item.kind !== 'product');
  }

  get addressReady(): boolean {
    const d = this.delivery;
    const pin = /^[1-9]\d{5}$/.test(d.pincode);
    return d.city.trim().length >= 2 && pin && (d.mode === 'pickup' || d.address.trim().length >= 10);
  }

  slotReady(cart: CartPort): boolean {
    return !this.needsSlot(cart) || requestedSlot(this.slotDate, this.slotTime) !== null;
  }

  /** Validate stock and serviceability, place the order (idempotent), then hand over to the Pay step. */
  async placeOrder(cart: CartPort): Promise<void> {
    if (this.placing || cart.lines.length === 0) return;
    if (!this.addressReady) { this.checkoutError = 'phone.checkout.needAddress'; return; }
    if (!this.slotReady(cart)) { this.checkoutError = 'phone.checkout.needSlot'; return; }
    this.placing = true;
    this.checkoutError = '';
    this.checkoutErrorText = '';
    const items = cart.lines.map((l) => ({ id: l.item.id, quantity: l.quantity }));
    try {
      const check = await this.request<{ serviceable: boolean; serviceabilityNote?: string; items: { id: string; available: boolean; reason: string }[] }>(
        '/cart/validate', { method: 'POST', body: JSON.stringify({ items, pincode: this.delivery.pincode }) },
      );
      const blocked = check.items.filter((i) => !i.available);
      if (blocked.length || !check.serviceable) {
        runInAction(() => {
          this.checkoutErrorText = blocked.length ? blocked.map((b) => b.reason).join(', ') : (check.serviceabilityNote ?? '');
          this.checkoutError = blocked.length ? 'phone.checkout.unavailable' : 'phone.checkout.notServiceable';
          this.placing = false;
        });
        return;
      }
    } catch {
      // Fail closed: no check, no order.
      runInAction(() => { this.checkoutError = 'phone.checkout.validateFailed'; this.placing = false; });
      return;
    }
    const slot = this.needsSlot(cart) ? requestedSlot(this.slotDate, this.slotTime) ?? '' : '';
    const body = JSON.stringify({ items, delivery: this.delivery, requestedSlot: slot });
    if (this.key.fingerprint !== body) this.key = { fingerprint: body, id: newKey() };
    try {
      const order = await this.request<LiveOrder>('/orders', { method: 'POST', headers: { 'Idempotency-Key': this.key.id }, body });
      if (this.disposed) return;
      runInAction(() => {
        this.order = order;
        this.payment = this.makePayment(order.id, order.totalPaise);
        this.placing = false;
        this.push({ name: 'pay' });
      });
    } catch (error) {
      if (!this.disposed) runInAction(() => {
        this.checkoutError = 'phone.checkout.placeFailed';
        this.checkoutErrorText = error instanceof Error ? error.message : '';
        this.placing = false;
      });
    }
  }

  /** The Pay step said paid: the cart is spent and the order summary shows. */
  paid(cart: CartPort): void {
    cart.clear();
    // The Pay step reached `paid` only on the server's word (verify or status), so the summary says paid.
    if (this.order) this.order = { ...this.order, paymentStatus: 'PAID' };
    this.stack = [{ name: 'home' }, { name: 'success' }];
  }

  dispose(): void {
    this.disposed = true;
    this.payment?.dispose();
  }

  reset(): void {
    this.stack = [{ name: 'home' }];
    this.order = null;
    this.payment = null;
    this.checkoutError = '';
    this.checkoutErrorText = '';
  }
}
