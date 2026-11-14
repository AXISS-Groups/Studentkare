import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/shopPhone/platform/CheckoutStoragePort', () => ({
  CheckoutStoragePort: { getCachedCart: async () => [], setCachedCart: async () => undefined, clearCachedCart: async () => undefined },
}));

import { ShopViewModel } from '../ShopViewModel';
import type { CatalogItem } from '../ShopViewModel';
import { ShopNativeView } from '../../views/ShopNativeView';
import { checkoutStore } from '@/features/shopPhone/state/CheckoutStore';

type Requester = typeof import('@/data/services/http').apiRequest;
const item = (over: Partial<CatalogItem> = {}): CatalogItem => ({
  id: 'cat_1', kind: 'product', name: 'Paracetamol 650', brand: 'Campus Pharmacy', pack: '10 tablets', pricePaise: 3200, mrpPaise: 3500, stock: 5, requiresPrescription: false, ...over,
});

describe('ShopViewModel', () => {
  it('preserves a selected category and query, and clears the category when switching kinds', async () => {
    const request = vi.fn(async () => ({ items: [] })) as unknown as Requester;
    const vm = new ShopViewModel(request);
    vm.category = 'vitamins';
    vm.query = 'test query';
    await vm.load();
    expect(request).toHaveBeenCalledWith('/catalog?kind=product&limit=50&query=test%20query&category=vitamins');
    vm.setKind('lab');
    expect(vm.category).toBe('');
    expect(request).toHaveBeenLastCalledWith('/catalog?kind=lab&limit=50&query=test%20query');
  });
  it('reads the real catalogue by kind and search', async () => {
    const paths: string[] = [];
    const vm = new ShopViewModel((async (path: string) => { paths.push(path); return { items: [] }; }) as unknown as Requester);
    await vm.load();
    vm.setQuery('para cetamol');
    await vm.load();
    vm.setKind('lab');
    await vi.waitFor(() => expect(paths).toHaveLength(3));
    expect(paths).toEqual(['/catalog?kind=product&limit=50', '/catalog?kind=product&limit=50&query=para%20cetamol', '/catalog?kind=lab&limit=50&query=para%20cetamol']);
  });

  it('shows an error state, not an empty shop, when the catalogue fails', async () => {
    const vm = new ShopViewModel((async () => { throw new Error('x'); }) as unknown as Requester);
    await vm.load();
    expect(vm.failed).toBe(true);
  });
});

describe('ShopNativeView', () => {
  it('shows the price, adds to the real cart, and will not offer a prescription-only item', async () => {
    checkoutStore.reset();
    const vm = new ShopViewModel((async () => ({ items: [item(), item({ id: 'cat_rx', name: 'Amoxicillin', requiresPrescription: true })] })) as unknown as Requester);
    await vm.load();
    const openCart = vi.fn();
    render(<ShopNativeView viewModel={vm} links={{ openCart }} />);
    expect(screen.getAllByText('₹32')[0]).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Amoxicillin to cart' })).toBeNull();
    expect(screen.getByText(/Needs a prescription/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Paracetamol 650 to cart' }));
    expect(checkoutStore.cartItems.map((l) => l.id)).toEqual(['cat_1']);
    fireEvent.click(await screen.findByRole('button', { name: 'View cart (1)' }));
    expect(openCart).toHaveBeenCalled();
  });
});
