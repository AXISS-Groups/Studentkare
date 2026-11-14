import { apiRequest } from '@/data/services/http';
import type { CartLineItem, DeliveryMode, PlacedOrder } from '../domain/Checkout';
import { CheckoutStoragePort } from '../platform/CheckoutStoragePort';
import type { SessionScope } from '@/core/session/sessionScope';
import { fetchAreas } from './deliveryAreas';

/** POST /api/orders body (backend OrderInput). Prices are not sent: the server prices the order. */
export interface OrderRequest {
  items: { id: string; quantity: number }[];
  delivery: { mode: DeliveryMode; address: string; city: string; pincode: string; area?: string };
  requestedSlot: string;
}

/** POST /api/cart/validate → per-item availability and pincode serviceability. */
export interface CartValidation {
  serviceable: boolean;
  serviceabilityNote?: string;
  /** NO_PINCODE | AREA_NEEDED | NO_AREA, or empty when delivery is fine. */
  deliveryRefusal?: string;
  items: { id: string; available: boolean; reason: string }[];
}

export class CheckoutRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  async getCachedCart(scope?: SessionScope): Promise<CartLineItem[]> {
    return CheckoutStoragePort.getCachedCart(scope);
  }

  async saveCart(items: CartLineItem[], scope?: SessionScope): Promise<void> {
    await CheckoutStoragePort.setCachedCart(items, scope);
  }

  async clearCart(scope?: SessionScope): Promise<void> {
    await CheckoutStoragePort.clearCachedCart(scope);
  }

  /** The areas the postal directory lists for a pincode; empty means no area is asked for. */
  async areas(pincode: string): Promise<string[]> {
    return fetchAreas(this.request, pincode);
  }

  async validate(order: OrderRequest): Promise<CartValidation> {
    return this.request<CartValidation>('/cart/validate', {
      method: 'POST',
      body: JSON.stringify({ items: order.items, pincode: order.delivery.pincode, mode: order.delivery.mode, ...(order.delivery.area ? { area: order.delivery.area } : {}) }),
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
