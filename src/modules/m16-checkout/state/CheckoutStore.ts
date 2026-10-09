import { makeAutoObservable, runInAction } from 'mobx';
import type { CartLineItem, DeliveryMode, PlacedOrder } from '../domain/Checkout';
import { calculateCartItemCount, calculateSubtotalPaise } from '../domain/Checkout';
import { checkoutRepository } from '../data/CheckoutRepository';
import type { CheckoutRepository, OrderRequest } from '../data/CheckoutRepository';

type CheckoutStoreStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

const PINCODE = /^[1-9][0-9]{5}$/;

/** Unique per order attempt. Not a secret, so a non-crypto fallback is fine where randomUUID is missing. */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `sk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** "2026-10-12 09:30" or "2026-10-12T09:30" → ISO, or null if it isn't a future time. */
export function toRequestedSlot(input: string, now: number = Date.now()): string | null {
  const parsed = new Date(input.trim().replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now) return null;
  return parsed.toISOString();
}

/**
 * Native cart and order request, on the same contract as the web cart
 * (POST /api/cart/validate, then POST /api/orders with an Idempotency-Key).
 *
 * The total shown is what the server will charge: price × quantity. This used
 * to add an invented ₹49 delivery fee, accept made-up coupon codes, and post to
 * /orders/checkout, which does not exist.
 */
export class CheckoutStore {
  // Starts empty. This used to be pre-filled with a branded lab package and a
  // medicine the user never chose.
  cartItems: CartLineItem[] = [];

  deliveryMode: DeliveryMode = 'pickup';
  address = '';
  city = '';
  pincode = '';
  slotDateTime = '';

  status: CheckoutStoreStatus = { kind: 'idle' };
  completedOrder: PlacedOrder | null = null;
  private attempt: { fingerprint: string; key: string } | null = null;

  constructor(private readonly repository: CheckoutRepository = checkoutRepository) {
    makeAutoObservable<CheckoutStore, 'attempt' | 'repository'>(this, { attempt: false, repository: false }, { autoBind: true });
    void this.initFromCache();
  }

  get itemCount(): number {
    return calculateCartItemCount(this.cartItems);
  }

  /** What the server charges: price × quantity. Delivery charges, if any, are agreed with the provider. */
  get totalPaise(): number {
    return calculateSubtotalPaise(this.cartItems);
  }

  get needsSlot(): boolean {
    return this.cartItems.some(item => item.kind === 'lab' || item.kind === 'consultation');
  }

  get canSubmit(): boolean {
    if (this.cartItems.length === 0 || this.status.kind === 'submitting') return false;
    if (this.city.trim().length < 2 || !PINCODE.test(this.pincode)) return false;
    if (this.deliveryMode === 'delivery' && this.address.trim().length < 10) return false;
    if (this.needsSlot && !toRequestedSlot(this.slotDateTime)) return false;
    return true;
  }

  get isSubmitting(): boolean {
    return this.status.kind === 'submitting';
  }

  get errorMessage(): string | null {
    return this.status.kind === 'error' ? this.status.message : null;
  }

  private async initFromCache(): Promise<void> {
    const cached = await this.repository.getCachedCart();
    if (cached.length > 0) {
      runInAction(() => {
        this.cartItems = cached;
      });
    }
  }

  private async persistCart(): Promise<void> {
    await this.repository.saveCart(this.cartItems);
  }

  addItem(item: Omit<CartLineItem, 'quantity'>): void {
    const existing = this.cartItems.find(i => i.id === item.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + 1, item.stock, 10);
    } else {
      this.cartItems.push({ ...item, quantity: 1 });
    }
    void this.persistCart();
  }

  updateQuantity(id: string, quantity: number): void {
    const item = this.cartItems.find(i => i.id === id);
    if (!item) return;
    if (quantity <= 0) {
      this.removeItem(id);
    } else {
      // The backend accepts 1–10 of a line.
      item.quantity = Math.min(quantity, item.stock, 10);
      void this.persistCart();
    }
  }

  removeItem(id: string): void {
    this.cartItems = this.cartItems.filter(i => i.id !== id);
    void this.persistCart();
  }

  setDeliveryMode(mode: DeliveryMode): void {
    this.deliveryMode = mode;
  }

  setAddress(address: string): void {
    this.address = address;
  }

  setCity(city: string): void {
    this.city = city;
  }

  setPincode(pincode: string): void {
    this.pincode = pincode.replace(/\D/g, '').slice(0, 6);
  }

  setSlotDateTime(dateTime: string): void {
    this.slotDateTime = dateTime;
  }

  private orderRequest(): OrderRequest {
    return {
      items: this.cartItems.map(item => ({ id: item.id, quantity: item.quantity })),
      delivery: { mode: this.deliveryMode, address: this.deliveryMode === 'delivery' ? this.address.trim() : '', city: this.city.trim(), pincode: this.pincode },
      requestedSlot: this.needsSlot ? toRequestedSlot(this.slotDateTime) ?? '' : '',
    };
  }

  async submitOrder(): Promise<boolean> {
    if (!this.canSubmit) return false;
    this.status = { kind: 'submitting' };
    const order = this.orderRequest();
    try {
      const check = await this.repository.validate(order);
      const blocked = check.items.filter(item => !item.available);
      if (blocked.length || !check.serviceable) {
        const message = blocked.length
          ? `Some items are unavailable: ${blocked.map(item => item.reason).join(', ')}. Nothing was ordered.`
          : check.serviceabilityNote || 'This pincode is not served yet. Nothing was ordered.';
        runInAction(() => { this.status = { kind: 'error', message }; });
        return false;
      }

      // Same cart, same key: a retry after a dropped response can't order twice.
      const fingerprint = JSON.stringify(order);
      const attempt = this.attempt?.fingerprint === fingerprint ? this.attempt : { fingerprint, key: newIdempotencyKey() };
      this.attempt = attempt;
      const placed = await this.repository.submitOrder(order, attempt.key);

      runInAction(() => {
        this.completedOrder = placed;
        this.cartItems = [];
        this.attempt = null;
        this.status = { kind: 'success' };
      });
      await this.repository.clearCart();
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error && err.message ? err.message : 'Your order wasn’t sent. Nothing was ordered — try again.';
        this.status = { kind: 'error', message };
      });
      return false;
    }
  }

  reset(): void {
    this.cartItems = [];
    this.deliveryMode = 'pickup';
    this.address = '';
    this.city = '';
    this.pincode = '';
    this.slotDateTime = '';
    this.completedOrder = null;
    this.attempt = null;
    this.status = { kind: 'idle' };
    void this.repository.clearCart();
  }
}

export const checkoutStore = new CheckoutStore();
