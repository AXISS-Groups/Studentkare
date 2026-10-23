import { describe, expect, it } from 'vitest';
import type { LiveCatalogItem, LiveOrder, OrderLine } from '@/data/types/workflowTypes';
import { buyAgainBlock, buyAgainEntries, filterOrders, maxQuantity, orderRef, orderStatus, sortItems, trackProgress } from '../studentWebData';

const line = (status: OrderLine['status'], extra: Partial<OrderLine> = {}): OrderLine => ({ id: Math.random().toString(36), itemId: 'i1', name: 'ORS sachets', kind: 'product', quantity: 1, pricePaise: 12000, status, ...extra });
const order = (id: string, lines: OrderLine[], extra: Partial<LiveOrder> = {}): LiveOrder => ({ id, createdAt: 1_000, totalPaise: 12000, delivery: { mode: 'pickup', address: '', city: 'Hyderabad', pincode: '500090' }, requestedSlot: '', paymentStatus: 'PAID', lines, ...extra });
const item = (extra: Partial<LiveCatalogItem> = {}): LiveCatalogItem => ({ id: 'i1', providerId: 'p', kind: 'product', name: 'ORS sachets', brand: 'B', category: 'first-aid', description: 'd', pack: 'Pack of 10', pricePaise: 12000, mrpPaise: 0, stock: 5, active: true, requiresPrescription: false, preparation: '', ...extra });

describe('order status and tracking', () => {
  it('is the least advanced live line, so an order is out for delivery only when nothing still waits', () => {
    expect(orderStatus(order('a', [line('DISPATCHED'), line('REQUESTED')]))).toBe('REQUESTED');
    expect(orderStatus(order('a', [line('DISPATCHED'), line('COMPLETED')]))).toBe('DISPATCHED');
    expect(orderStatus(order('a', [line('COMPLETED'), line('CANCELLED')]))).toBe('COMPLETED');
    expect(orderStatus(order('a', [line('CANCELLED')]))).toBe('CANCELLED');
    expect(orderStatus(order('a', [line('DECLINED')]))).toBe('DECLINED');
  });

  it('tracks only the steps the lines have reached; a closed order has no progress', () => {
    expect(trackProgress(order('a', [line('REQUESTED')]))).toBe(1);
    expect(trackProgress(order('a', [line('DISPATCHED')]))).toBe(3);
    expect(trackProgress(order('a', [line('COMPLETED')]))).toBe(4);
    expect(trackProgress(order('a', [line('CANCELLED')]))).toBe(0);
  });

  it('filters by tab and gives the short reference', () => {
    const orders = [order('active1', [line('ACCEPTED')]), order('past1', [line('COMPLETED')]), order('lab1', [line('COMPLETED', { kind: 'lab' })])];
    expect(filterOrders(orders, 'active').map((o) => o.id)).toEqual(['active1']);
    expect(filterOrders(orders, 'past').map((o) => o.id)).toEqual(['past1', 'lab1']);
    expect(filterOrders(orders, 'lab').map((o) => o.id)).toEqual(['lab1']);
    expect(filterOrders(orders, 'all')).toHaveLength(3);
    expect(orderRef('abcdef123456')).toBe('SK-ABCDEF12');
  });
});

describe('buy again', () => {
  it('lists delivered shop items only, newest first, with units added up', () => {
    const entries = buyAgainEntries([
      order('o1', [line('COMPLETED', { itemId: 'a', name: 'A', quantity: 2 })], { createdAt: 100 }),
      order('o2', [line('COMPLETED', { itemId: 'a', name: 'A' }), line('COMPLETED', { itemId: 'b', name: 'B' })], { createdAt: 300 }),
      order('o3', [line('COMPLETED', { itemId: 'c', name: 'C' })], { createdAt: 200 }),
      // Not yet delivered, cancelled, or a booking: never offered again.
      order('o4', [line('DISPATCHED', { itemId: 'd' }), line('CANCELLED', { itemId: 'e' }), line('COMPLETED', { itemId: 'f', kind: 'lab' })], { createdAt: 400 }),
    ]);
    expect(entries.map((e) => [e.itemId, e.units, e.lastBoughtAt])).toEqual([['a', 3, 300], ['b', 1, 300], ['c', 1, 200]]);
  });

  it('never puts a prescription medicine, an unlisted or out-of-stock item straight back in the cart', () => {
    expect(buyAgainBlock(undefined)).toBe('unlisted');
    expect(buyAgainBlock(item({ active: false }))).toBe('unlisted');
    expect(buyAgainBlock(item({ requiresPrescription: true }))).toBe('prescription');
    expect(buyAgainBlock(item({ stock: 0 }))).toBe('outOfStock');
    expect(buyAgainBlock(item())).toBeNull();
  });
});

describe('catalogue helpers', () => {
  it('sorts the page on screen by price without inventing an order', () => {
    const list = [item({ id: 'x', pricePaise: 300 }), item({ id: 'y', pricePaise: 100 })];
    expect(sortItems(list, 'priceLow').map((i) => i.id)).toEqual(['y', 'x']);
    expect(sortItems(list, 'priceHigh').map((i) => i.id)).toEqual(['x', 'y']);
    expect(sortItems(list, 'name').map((i) => i.id)).toEqual(['x', 'y']);
  });

  it('caps a cart line by stock and the cart limit', () => {
    expect(maxQuantity({ kind: 'product', stock: 3 })).toBe(3);
    expect(maxQuantity({ kind: 'product', stock: 50 })).toBe(10);
    expect(maxQuantity({ kind: 'lab', stock: 0 })).toBe(1);
  });
});

