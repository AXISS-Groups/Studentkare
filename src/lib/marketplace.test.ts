import { describe, expect, it } from 'vitest';
import { catalog, filterCatalog } from '../data/marketplaceCatalog';
import { cartReducer, emptyCart, calculateCart } from '../data/marketplaceCart';

describe('Marketplace discovery', () => {
  it('searches product names, brands, and categories without case sensitivity', () => {
    expect(filterCatalog({ query: '  VITAMIN C  ' }).map(item => item.id)).toContain('vitamin-c');
    expect(filterCatalog({ query: 'Nourish' }).every(item => item.brand === 'Nourish')).toBe(true);
    expect(filterCatalog({ query: 'does-not-exist' })).toEqual([]);
  });

  it('combines category, brand, and product-type filters', () => {
    const result = filterCatalog({ category: 'vitamins', brand: 'Nourish', kind: 'product' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(item => item.category === 'vitamins' && item.brand === 'Nourish' && item.kind === 'product')).toBe(true);
    expect(filterCatalog({ kind: 'lab' }).every(item => item.kind === 'lab')).toBe(true);
  });

  it('sorts prices without mutating the source catalog', () => {
    const original = catalog.map(item => item.id);
    const ascending = filterCatalog({ sort: 'price-low' });
    const descending = filterCatalog({ sort: 'price-high' });
    expect(ascending.map(item => item.price)).toEqual([...ascending.map(item => item.price)].sort((a, b) => a - b));
    expect(descending[0].price).toBeGreaterThan(descending[descending.length - 1].price);
    expect(catalog.map(item => item.id)).toEqual(original);
  });

  it('sorts by rating and percentage savings', () => {
    const rated = filterCatalog({ sort: 'rating' });
    expect(rated[0].rating).toBe(Math.max(...catalog.map(item => item.rating)));
    const discounted = filterCatalog({ sort: 'discount' });
    expect(discounted[0].id).toBe('full-body');
  });
});

describe('Demo cart', () => {
  it('adds quantities immutably, bounds quantities, and removes items', () => {
    const first = cartReducer(emptyCart, { type: 'add', id: 'vitamin-c' });
    const second = cartReducer(first, { type: 'add', id: 'vitamin-c' });
    expect(first.items).toEqual([{ id: 'vitamin-c', quantity: 1 }]);
    expect(second.items).toEqual([{ id: 'vitamin-c', quantity: 2 }]);
    expect(cartReducer(second, { type: 'quantity', id: 'vitamin-c', quantity: 99 }).items[0].quantity).toBe(10);
    expect(cartReducer(second, { type: 'quantity', id: 'vitamin-c', quantity: 0 }).items).toEqual([]);
    expect(cartReducer(second, { type: 'remove', id: 'vitamin-c' }).items).toEqual([]);
  });

  it('ignores unknown IDs and invalid quantities', () => {
    expect(cartReducer(emptyCart, { type: 'add', id: 'unknown' })).toBe(emptyCart);
    const state = cartReducer(emptyCart, { type: 'add', id: 'vitamin-c' });
    for (const quantity of [NaN, Infinity, -1, 1.5]) {
      expect(cartReducer(state, { type: 'quantity', id: 'vitamin-c', quantity })).toBe(state);
    }
  });

  it('requires a sample prescription for the demo prescription item', () => {
    expect(cartReducer(emptyCart, { type: 'add', id: 'prescription-pack' })).toBe(emptyCart);
    const verified = cartReducer(emptyCart, { type: 'sample-prescription' });
    expect(cartReducer(verified, { type: 'add', id: 'prescription-pack' }).items).toHaveLength(1);
  });

  it('limits each lab package to a single booking', () => {
    const state = cartReducer(emptyCart, { type: 'add', id: 'full-body' });
    expect(cartReducer(state, { type: 'add', id: 'full-body' }).items[0].quantity).toBe(1);
    expect(cartReducer(state, { type: 'quantity', id: 'full-body', quantity: 3 }).items[0].quantity).toBe(1);
  });

  it('calculates an empty cart without delivery fees', () => {
    expect(calculateCart(emptyCart)).toMatchObject({ subtotal: 0, delivery: 0, total: 0, discount: 0, count: 0 });
  });

  it('applies CARE10 once, caps the saving, and reconciles the total', () => {
    const state = cartReducer(emptyCart, { type: 'add', id: 'full-body' });
    const discounted = cartReducer(state, { type: 'coupon', code: ' care10 ' });
    const totals = calculateCart(discounted);
    expect(totals.discount).toBe(Math.min(Math.round(totals.subtotal * 10) / 100, 150));
    expect(totals.delivery).toBe(0);
    expect(totals.total).toBe(totals.subtotal - totals.discount);
    expect(cartReducer(discounted, { type: 'coupon', code: 'CARE10' })).toEqual(discounted);
    expect(cartReducer(state, { type: 'coupon', code: 'INVALID' })).toEqual(state);
  });

  it('charges delivery only for physical items below the threshold', () => {
    const physical = cartReducer(emptyCart, { type: 'add', id: 'first-aid' });
    expect(calculateCart(physical).delivery).toBe(40);
    expect(calculateCart({ ...physical, deliveryMode: 'pickup' }).delivery).toBe(0);
    const larger = cartReducer(physical, { type: 'quantity', id: 'first-aid', quantity: 10 });
    expect(calculateCart(larger).delivery).toBe(0);
  });

  it('retains paise for percentage coupons and applies the cap to large carts', () => {
    const single = cartReducer(emptyCart, { type: 'add', id: 'first-aid' });
    const totals = calculateCart({ ...single, coupon: 'CARE10' });
    expect(totals.discount).toBe(14.9);
    expect(totals.total).toBe(174.1);
    const larger = cartReducer(single, { type: 'quantity', id: 'first-aid', quantity: 10 });
    const mixed = cartReducer(larger, { type: 'add', id: 'vitamin-c' });
    expect(calculateCart({ ...mixed, coupon: 'CARE10' }).discount).toBe(150);
  });

  it('clears the cart after a demo order while keeping the selected city', () => {
    const state = cartReducer(emptyCart, { type: 'city', city: 'Bengaluru' });
    const withItem = cartReducer(state, { type: 'add', id: 'vitamin-c' });
    expect(cartReducer(withItem, { type: 'clear' })).toMatchObject({ items: [], coupon: '', city: 'Bengaluru' });
  });
});
