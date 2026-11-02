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

export type DeliveryMode = 'pickup' | 'delivery';

/** POST /api/orders → 201 (backend/services/workflow_api.py order_payload). */
export interface PlacedOrder {
  id: string;
  createdAt: number;
  totalPaise: number;
  delivery: { mode: DeliveryMode; address: string; city: string; pincode: string };
  requestedSlot: string;
  paymentStatus: string;
}

export function calculateCartItemCount(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateSubtotalPaise(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
}
