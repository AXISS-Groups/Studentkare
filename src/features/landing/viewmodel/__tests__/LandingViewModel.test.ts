import { describe, expect, it, vi } from 'vitest';
import { LandingViewModel, kindLabel, parseCatalogPage, rupees } from '../LandingViewModel';
import type { LandingCatalogItem } from '../LandingViewModel';

const item = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'c1', name: 'Vitamin D3 60K', brand: 'Kare', kind: 'product', pack: 'Strip of 4',
  pricePaise: 29900, mrpPaise: 39900, category: 'vitamins', stock: 12, ...over,
});

describe('parseCatalogPage', () => {
  it('keeps only the fields the landing page shows', () => {
    const [row] = parseCatalogPage({ items: [item()], total: 1 }, { limit: 6 });
    expect(row).toEqual({ id: 'c1', name: 'Vitamin D3 60K', brand: 'Kare', kind: 'product', pack: 'Strip of 4', pricePaise: 29900, mrpPaise: 39900 });
  });

  it.each([
    ['a fractional price', { pricePaise: 299.5 }],
    ['a negative price', { pricePaise: -1 }],
    ['a price sent as text', { pricePaise: '29900' }],
    ['an unknown kind', { kind: 'sponsored' }],
    ['a missing name', { name: undefined }],
  ])('rejects the whole page for %s', (_label, over) => {
    expect(() => parseCatalogPage({ items: [item(), item(over)] }, { limit: 6 })).toThrow();
  });

  it('rejects more rows than were asked for, and non-object bodies', () => {
    expect(() => parseCatalogPage({ items: [item(), item()] }, { limit: 1 })).toThrow();
    expect(() => parseCatalogPage(null, { limit: 6 })).toThrow();
    expect(() => parseCatalogPage({ items: 'none' }, { limit: 6 })).toThrow();
  });

  it('rejects a row of a kind that was not asked for', () => {
    expect(parseCatalogPage({ items: [item({ kind: 'lab' })] }, { kind: 'lab', limit: 6 })).toHaveLength(1);
    expect(() => parseCatalogPage({ items: [item({ kind: 'lab' }), item()] }, { kind: 'lab', limit: 6 })).toThrow();
  });
});

describe('LandingViewModel', () => {
  const rows: LandingCatalogItem[] = parseCatalogPage({ items: [item()] }, { limit: 6 });

  it('starts loading, then shows real rows', async () => {
    const vm = new LandingViewModel(vi.fn().mockResolvedValue(rows));
    expect(vm.status).toBe('loading');
    await vm.load();
    expect(vm.status).toBe('ready');
    expect(vm.items).toEqual(rows);
  });

  it('is empty, not ready, when nothing is published', async () => {
    const vm = new LandingViewModel(vi.fn().mockResolvedValue([]));
    await vm.load();
    expect(vm.status).toBe('empty');
  });

  it('fails closed: an error shows no rows, and a retry recovers', async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error('HTTP 503')).mockResolvedValue(rows);
    const vm = new LandingViewModel(list);
    await vm.load();
    expect(vm.status).toBe('error');
    expect(vm.items).toEqual([]);
    expect(vm.error).toBe('HTTP 503');
    await vm.load();
    expect(vm.status).toBe('ready');
  });

  it('ignores a response that lands after dispose', async () => {
    let resolve!: (value: LandingCatalogItem[]) => void;
    const vm = new LandingViewModel(() => new Promise(r => { resolve = r; }));
    const pending = vm.load();
    vm.dispose();
    resolve(rows);
    await pending;
    expect(vm.items).toEqual([]);
  });
});

describe('formatting', () => {
  it('formats paise without floating-point money', () => {
    expect(rupees(29900)).toBe('₹299');
    expect(rupees(149905)).toBe('₹1,499.05');
  });

  it('labels every kind the backend can publish', () => {
    expect(kindLabel('wellness')).toBe('Wellness');
    expect(kindLabel('lab')).toBe('Lab test');
  });
});
