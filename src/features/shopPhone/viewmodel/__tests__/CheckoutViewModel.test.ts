import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../platform/CheckoutStoragePort', () => ({
  CheckoutStoragePort: { getCachedCart: async () => [], setCachedCart: async () => undefined, clearCachedCart: async () => undefined },
}));

import { CheckoutStore, toRequestedSlot } from '../../state/CheckoutStore';
import { CheckoutRepository } from '../../data/CheckoutRepository';
import type { CartLineItem } from '../../domain/Checkout';

type Requester = typeof import('@/data/services/http').apiRequest;
const line = (over: Partial<CartLineItem> = {}): CartLineItem => ({
  id: 'cat_1', name: 'Paracetamol 650', brand: 'Campus Pharmacy', kind: 'product', pricePaise: 3200, mrpPaise: 3500, quantity: 2, stock: 20, requiresPrescription: false, ...over,
});

let orderResult: () => unknown = () => undefined;
let calls: { path: string; init?: RequestInit }[] = [];
let validation = { serviceable: true, items: [{ id: 'cat_1', available: true, reason: '' }] };
const okOrder = (): unknown => ({ id: 'ord_1', createdAt: 1, totalPaise: 6400, delivery: { mode: 'pickup', address: '', city: 'Hyderabad', pincode: '500090' }, requestedSlot: '', paymentStatus: 'NOT_COLLECTED' });

function store(): CheckoutStore {
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    if (path === '/cart/validate') return validation;
    if (path === '/orders') return orderResult();
    throw new Error(`unexpected ${path}`);
  }) as unknown as Requester;
  const s = new CheckoutStore(new CheckoutRepository(request));
  s.cartItems = [line()];
  s.setCity('Hyderabad');
  s.setPincode('500090');
  return s;
}

beforeEach(() => {
  orderResult = okOrder;
  calls = [];
  validation = { serviceable: true, items: [{ id: 'cat_1', available: true, reason: '' }] };
});

describe('native checkout on the real /orders contract', () => {
  it('starts empty, with no pre-filled location', () => {
    const fresh = new CheckoutStore(new CheckoutRepository((async () => ({})) as unknown as Requester));
    expect(fresh.cartItems).toEqual([]);
    expect(fresh.city).toBe('');
    expect(fresh.pincode).toBe('');
  });

  it('totals what the server charges — price × quantity, no invented fees or coupons', () => {
    const s = store();
    expect(s.totalPaise).toBe(6400);
    expect('deliveryFeePaise' in s).toBe(false);
    expect('applyCoupon' in s).toBe(false);
  });

  it('needs city and pincode always, and a 10-character address for delivery', () => {
    const s = store();
    expect(s.canSubmit).toBe(true);
    s.setPincode('');
    expect(s.canSubmit).toBe(false);
    s.setPincode('500090');
    s.setDeliveryMode('delivery');
    s.setAddress('Block A');
    expect(s.canSubmit).toBe(false);
    s.setAddress('Block A, Room 302, VNR hostel');
    expect(s.canSubmit).toBe(true);
  });

  it('validates, then posts only ids and quantities with an idempotency key', async () => {
    const s = store();
    expect(await s.submitOrder()).toBe(true);
    expect(calls.map((c) => c.path)).toEqual(['/cart/validate', '/orders']);
    const order = calls[1];
    expect(JSON.parse(String(order.init?.body))).toEqual({
      items: [{ id: 'cat_1', quantity: 2 }],
      delivery: { mode: 'pickup', address: '', city: 'Hyderabad', pincode: '500090' },
      requestedSlot: '',
    });
    expect((order.init?.headers as Record<string, string>)['Idempotency-Key']).toMatch(/.{8,}/);
    expect(s.completedOrder?.id).toBe('ord_1');
    expect(s.cartItems).toEqual([]);
  });

  it('reuses the same key when the same cart is retried, so it cannot order twice', async () => {
    const s = store();
    orderResult = () => { throw new Error('Network lost'); };
    await s.submitOrder();
    await s.submitOrder();
    const keys = calls.filter((c) => c.path === '/orders').map((c) => (c.init?.headers as Record<string, string>)['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('orders nothing when an item is unavailable', async () => {
    const s = store();
    validation = { serviceable: true, items: [{ id: 'cat_1', available: false, reason: 'Out of stock' }] };
    expect(await s.submitOrder()).toBe(false);
    expect(calls.some((c) => c.path === '/orders')).toBe(false);
    expect(s.errorMessage).toMatch(/Out of stock.*Nothing was ordered/);
    expect(s.cartItems).toHaveLength(1);
  });

  it('fails closed: no confirmation and the cart is kept when the order fails', async () => {
    const s = store();
    orderResult = () => { throw new Error('offline'); };
    expect(await s.submitOrder()).toBe(false);
    expect(s.completedOrder).toBeNull();
    expect(s.errorMessage).toBe('offline');
    expect(s.cartItems).toHaveLength(1);
  });

  it('accepts only a future requested time', () => {
    const now = Date.parse('2026-10-09T10:00:00Z');
    expect(toRequestedSlot('2026-10-08 09:00', now)).toBeNull();
    expect(toRequestedSlot('not a date', now)).toBeNull();
    expect(toRequestedSlot('2026-10-20T09:30', now)).not.toBeNull();
  });
});
