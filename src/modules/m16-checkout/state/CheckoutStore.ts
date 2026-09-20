import { makeAutoObservable, runInAction } from 'mobx';
import type { CartLineItem, OrderSummary } from '../domain/Checkout';
import {
  calculateCartItemCount,
  calculateSubtotalPaise,
  calculateDeliveryFeePaise,
  calculateTotalPaise,
} from '../domain/Checkout';
import { checkoutRepository } from '../data/CheckoutRepository';

export type CheckoutStoreStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export class CheckoutStore {
  cartItems: CartLineItem[] = [
    {
      id: 'lab-full-body',
      name: 'Comprehensive Full Body Health Checkup',
      brand: 'Apollo Diagnostics',
      kind: 'lab',
      pricePaise: 149900,
      mrpPaise: 399900,
      quantity: 1,
      stock: 50,
      requiresPrescription: false,
    },
    {
      id: 'prod-dolo-650',
      name: 'Dolo 650mg Paracetamol Tablets',
      brand: 'Micro Labs',
      kind: 'product',
      pricePaise: 3200,
      mrpPaise: 3500,
      quantity: 2,
      stock: 100,
      requiresPrescription: false,
    },
  ];

  deliveryMode: 'pickup' | 'delivery' = 'pickup';
  address = '';
  city = 'Hyderabad';
  pincode = '502285';
  couponCode = '';
  couponDiscountPaise = 0;
  couponError: string | null = null;
  slotDateTime = '';

  status: CheckoutStoreStatus = { kind: 'idle' };
  completedOrder: OrderSummary | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    void this.initFromCache();
  }

  get itemCount(): number {
    return calculateCartItemCount(this.cartItems);
  }

  get itemsSubtotalPaise(): number {
    return calculateSubtotalPaise(this.cartItems);
  }

  get deliveryFeePaise(): number {
    return calculateDeliveryFeePaise(this.itemsSubtotalPaise, this.deliveryMode);
  }

  get totalPaise(): number {
    return calculateTotalPaise(this.itemsSubtotalPaise, this.deliveryFeePaise, this.couponDiscountPaise);
  }

  get needsSlot(): boolean {
    return this.cartItems.some(item => item.kind === 'lab' || item.kind === 'consultation');
  }

  get canSubmit(): boolean {
    if (this.cartItems.length === 0 || this.status.kind === 'submitting') return false;
    if (this.deliveryMode === 'delivery') {
      if (this.address.trim().length < 5 || !/^[1-9][0-9]{5}$/.test(this.pincode)) return false;
    }
    if (this.needsSlot && !this.slotDateTime) return false;
    return true;
  }

  get isSubmitting(): boolean {
    return this.status.kind === 'submitting';
  }

  get errorMessage(): string | null {
    return this.status.kind === 'error' ? this.status.message : null;
  }

  private async initFromCache(): Promise<void> {
    const cached = await checkoutRepository.getCachedCart();
    if (cached.length > 0) {
      runInAction(() => {
        this.cartItems = cached;
      });
    }
  }

  private async persistCart(): Promise<void> {
    await checkoutRepository.saveCart(this.cartItems);
  }

  addItem(item: Omit<CartLineItem, 'quantity'>): void {
    const existing = this.cartItems.find(i => i.id === item.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + 1, item.stock);
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
      item.quantity = Math.min(quantity, item.stock);
      void this.persistCart();
    }
  }

  removeItem(id: string): void {
    this.cartItems = this.cartItems.filter(i => i.id !== id);
    void this.persistCart();
  }

  setDeliveryMode(mode: 'pickup' | 'delivery'): void {
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

  setCouponCode(code: string): void {
    this.couponCode = code.toUpperCase();
    this.couponError = null;
  }

  setSlotDateTime(dateTime: string): void {
    this.slotDateTime = dateTime;
  }

  applyCoupon(): void {
    if (!this.couponCode) return;
    if (this.couponCode === 'CARE10') {
      this.couponDiscountPaise = Math.round(this.itemsSubtotalPaise * 0.1);
      this.couponError = null;
    } else if (this.couponCode === 'STUDENT50') {
      this.couponDiscountPaise = Math.min(5000, this.itemsSubtotalPaise);
      this.couponError = null;
    } else {
      this.couponDiscountPaise = 0;
      this.couponError = 'Invalid coupon code. Try CARE10 or STUDENT50.';
    }
  }

  async submitOrder(): Promise<boolean> {
    if (!this.canSubmit) return false;
    this.status = { kind: 'submitting' };
    try {
      const result = await checkoutRepository.submitOrder({
        items: this.cartItems,
        deliveryMode: this.deliveryMode,
        address: this.address,
        city: this.city,
        pincode: this.pincode,
        totalPaise: this.totalPaise,
        slotDateTime: this.slotDateTime,
      });

      runInAction(() => {
        this.completedOrder = result;
        this.cartItems = [];
        this.status = { kind: 'success' };
      });
      await checkoutRepository.clearCart();
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Failed to place order request.';
        this.status = { kind: 'error', message };
      });
      return false;
    }
  }

  reset(): void {
    this.cartItems = [];
    this.deliveryMode = 'pickup';
    this.address = '';
    this.couponCode = '';
    this.couponDiscountPaise = 0;
    this.couponError = null;
    this.completedOrder = null;
    this.status = { kind: 'idle' };
    void checkoutRepository.clearCart();
  }
}

export const checkoutStore = new CheckoutStore();
