import { apiRequest } from '@/data/http';
import type { CartLineItem, OrderSummary } from '../domain/Checkout';
import { CheckoutStoragePort } from '../platform/CheckoutStoragePort';

export interface CheckoutPayload {
  items: CartLineItem[];
  deliveryMode: 'pickup' | 'delivery';
  address?: string;
  city?: string;
  pincode?: string;
  totalPaise: number;
  slotDateTime?: string;
}

export class CheckoutRepository {
  async getCachedCart(): Promise<CartLineItem[]> {
    return CheckoutStoragePort.getCachedCart();
  }

  async saveCart(items: CartLineItem[]): Promise<void> {
    await CheckoutStoragePort.setCachedCart(items);
  }

  async clearCart(): Promise<void> {
    await CheckoutStoragePort.clearCachedCart();
  }

  async submitOrder(payload: CheckoutPayload): Promise<OrderSummary> {
    // Fail closed: an order exists only if the server confirms it. A failed
    // request used to return a fabricated CONFIRMED order with a delivery ETA.
    return apiRequest<OrderSummary>('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const checkoutRepository = new CheckoutRepository();
