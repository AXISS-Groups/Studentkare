/**
 * M16 Checkout Domain Model.
 * Pure TypeScript entity, type definitions, and pricing invariants.
 * Data Class: commercial. Rule L: Must not touch or import clinical schemas.
 */

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

export function calculateCartItemCount(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateSubtotalPaise(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
}

export function calculateDeliveryFeePaise(subtotalPaise: number, deliveryMode: 'pickup' | 'delivery'): number {
  if (deliveryMode === 'pickup' || subtotalPaise === 0) return 0;
  return subtotalPaise > 49900 ? 0 : 4900; // Free delivery over ₹499
}

export function calculateTotalPaise(subtotalPaise: number, deliveryFeePaise: number, couponDiscountPaise: number): number {
  const raw = subtotalPaise + deliveryFeePaise - couponDiscountPaise;
  return Math.max(0, raw);
}
