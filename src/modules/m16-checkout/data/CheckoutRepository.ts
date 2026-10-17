import { apiRequest } from '@/data/http';
import type { CartLineItem, DeliveryMode, PlacedOrder } from '../domain/Checkout';
import { CheckoutStoragePort } from '../platform/CheckoutStoragePort';

/** POST /api/orders body (backend OrderInput). Prices are not sent: the server prices the order. */
export interface OrderRequest {
  items: { id: string; quantity: number }[];
  delivery: { mode: DeliveryMode; address: string; city: string; pincode: string };
  requestedSlot: string;
}

/** POST /api/cart/validate → per-item availability and pincode serviceability. */
export interface CartValidation {
  serviceable: boolean;
  serviceabilityNote?: string;
  items: { id: string; available: boolean; reason: string }[];
}

export class CheckoutRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  async getCachedCart(): Promise<CartLineItem[]> {
    return CheckoutStoragePort.getCachedCart();
  }

  async saveCart(items: CartLineItem[]): Promise<void> {
    await CheckoutStoragePort.setCachedCart(items);
  }

  async clearCart(): Promise<void> {
    await CheckoutStoragePort.clearCachedCart();
  }

  async validate(order: OrderRequest): Promise<CartValidation> {
    return this.request<CartValidation>('/cart/validate', {
      method: 'POST',
      body: JSON.stringify({ items: order.items, pincode: order.delivery.pincode }),
    });
  }

  /**
   * Same contract as the web cart. An order exists only if the server returns
   * one; the idempotency key makes a retried tap place it once.
   */
  async submitOrder(order: OrderRequest, idempotencyKey: string): Promise<PlacedOrder> {
    return this.request<PlacedOrder>('/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(order),
    });
  }
}

export const checkoutRepository = new CheckoutRepository();
