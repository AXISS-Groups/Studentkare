import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';
import { CrossPlatformStorage } from '@/core/storage/CrossPlatformStorage';

export interface CartLineItem {
  id: string;
  name: string;
  brand: string;
  kind: 'product' | 'lab' | 'consultation';
  pricePaise: number;
  mrpPaise: number;
  quantity: number;
  stock: number;
  requiresPrescription: boolean;
}

export interface OrderSummary {
  orderId: string;
  totalPaise: number;
  deliveryMode: 'pickup' | 'delivery';
  address?: string;
  estimatedFulfillment: string;
  status: 'CONFIRMED' | 'PENDING_PROVIDER_DISPATCH';
  timestamp: number;
}

const CART_STORAGE_KEY = 'studentkare_live_cart_v1';

/**
 * MVVM ViewModel for Shopping Cart & Order Checkout Pipeline.
 *
 * Owns cart state, subtotal computeds, promo code verification, address validation,
 * and order submission across Web & Mobile.
 */
export class CartCheckoutViewModel implements ViewModel {
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

  submitting = false;
  error: string | null = null;
  completedOrder: OrderSummary | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.initFromCache();
  }

  get itemCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  get itemsSubtotalPaise(): number {
    return this.cartItems.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  }

  get deliveryFeePaise(): number {
    if (this.deliveryMode === 'pickup' || this.itemsSubtotalPaise === 0) return 0;
    return this.itemsSubtotalPaise > 49900 ? 0 : 4900; // Free delivery over ₹499
  }

  get totalPaise(): number {
    const raw = this.itemsSubtotalPaise + this.deliveryFeePaise - this.couponDiscountPaise;
    return Math.max(0, raw);
  }

  get needsSlot(): boolean {
    return this.cartItems.some(item => item.kind === 'lab' || item.kind === 'consultation');
  }

  get canSubmit(): boolean {
    if (this.cartItems.length === 0 || this.submitting) return false;
    if (this.deliveryMode === 'delivery') {
      if (this.address.trim().length < 5 || !/^[1-9][0-9]{5}$/.test(this.pincode)) return false;
    }
    if (this.needsSlot && !this.slotDateTime) return false;
    return true;
  }

  private async initFromCache(): Promise<void> {
    const cached = await CrossPlatformStorage.get<CartLineItem[]>(CART_STORAGE_KEY, []);
    if (cached.length > 0) {
      runInAction(() => {
        this.cartItems = cached;
      });
    }
  }

  private async persistCart(): Promise<void> {
    await CrossPlatformStorage.set(CART_STORAGE_KEY, this.cartItems);
  }

  addItem(item: Omit<CartLineItem, 'quantity'>): void {
    const existing = this.cartItems.find(i => i.id === item.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + 1, item.stock);
    } else {
      this.cartItems.push({ ...item, quantity: 1 });
    }
    this.persistCart();
  }

  updateQuantity(id: string, quantity: number): void {
    const item = this.cartItems.find(i => i.id === id);
    if (!item) return;
    if (quantity <= 0) {
      this.removeItem(id);
    } else {
      item.quantity = Math.min(quantity, item.stock);
      this.persistCart();
    }
  }

  removeItem(id: string): void {
    this.cartItems = this.cartItems.filter(i => i.id !== id);
    this.persistCart();
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
    this.submitting = true;
    this.error = null;
    try {
      const payload = {
        items: this.cartItems,
        deliveryMode: this.deliveryMode,
        address: this.address,
        city: this.city,
        pincode: this.pincode,
        totalPaise: this.totalPaise,
        slotDateTime: this.slotDateTime,
      };

      const result = await apiRequest<OrderSummary>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      runInAction(() => {
        this.completedOrder = result || {
          orderId: `ORD-${Date.now().toString().slice(-6)}`,
          totalPaise: this.totalPaise,
          deliveryMode: this.deliveryMode,
          address: this.deliveryMode === 'delivery' ? `${this.address}, ${this.city} - ${this.pincode}` : undefined,
          estimatedFulfillment: this.deliveryMode === 'delivery' ? '30-45 Mins Fast Campus Delivery' : 'Pickup Ready in 15 Mins',
          status: 'CONFIRMED',
          timestamp: Date.now(),
        };
        this.cartItems = [];
        this.submitting = false;
      });
      await CrossPlatformStorage.remove(CART_STORAGE_KEY);
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to place order request.';
        this.submitting = false;
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
    this.error = null;
    CrossPlatformStorage.remove(CART_STORAGE_KEY);
  }

  dispose(): void {
    this.reset();
  }
}
