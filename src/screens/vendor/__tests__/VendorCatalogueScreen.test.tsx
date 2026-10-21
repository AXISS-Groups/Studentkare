import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { liveCatalogueSource, VendorCatalogueScreen } from '../VendorCatalogueScreen';
import type { CatalogueData, CatalogueItem } from '../VendorCatalogueScreen';

const apiRequest = vi.fn();
vi.mock('@/data/services/http', () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'acct-1', fullName: 'Campus Pharmacy', role: 'VENDOR', partnerKind: 'PHARMACY' } }) }));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));

const item = (over: Partial<CatalogueItem> = {}): CatalogueItem => ({
  id: 'c1', providerId: 'acct-1', kind: 'product', name: 'Ashwagandha Stress Balance', brand: 'Root & Ritual', pack: 'Bottle of 60',
  pricePaise: 29900, stock: 45, active: true, requiresPrescription: false, ...over,
});
const data = (items: CatalogueItem[], over: Partial<CatalogueData> = {}): CatalogueData => ({ items, scanned: items.length, total: items.length, ...over });

describe('VendorCatalogue', () => {
  beforeEach(() => { apiRequest.mockReset(); });

  it('shows the partner’s published listings with server prices and stock', async () => {
    render(<VendorCatalogueScreen source={vi.fn(async () => data([item(), item({ id: 'c2', name: 'Daily Defence Sunscreen SPF 50', brand: 'Kindskin', pack: 'Tube of 50 g', pricePaise: 42900, stock: 0 })]))} />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('₹299')).toBeInTheDocument();
    expect(within(table).getAllByText('Out of stock').length).toBeGreaterThan(0);
    expect(screen.getByText('2 published entries · you set price and stock, never position')).toBeInTheDocument();
    // Low stock and Under review have no source.
    expect(screen.getByText('Low stock').previousElementSibling ?? screen.getByText('Low stock').nextElementSibling).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add a product/ })).toBeDisabled();
    expect(screen.getByText(/never by payment/)).toBeInTheDocument();
  });

  it('searches the listings on the page', async () => {
    render(<VendorCatalogueScreen source={vi.fn(async () => data([item(), item({ id: 'c2', name: 'Omega 3', brand: 'Nourish' })]))} />);
    await screen.findByRole('table');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your listings' }), { target: { value: 'nourish' } });
    expect(screen.getByText('Omega 3')).toBeInTheDocument();
    expect(screen.queryByText('Ashwagandha Stress Balance')).toBeNull();
  });

  it('empty and error states', async () => {
    const { unmount } = render(<VendorCatalogueScreen source={vi.fn(async () => data([]))} />);
    expect(await screen.findByRole('heading', { name: 'Nothing in your catalogue yet.' })).toBeInTheDocument();
    unmount();
    render(<VendorCatalogueScreen source={vi.fn(async () => { throw new Error('down'); })} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the catalogue');
  });

  it('the live source keeps only this partner’s listings and says when the scan is partial', async () => {
    apiRequest.mockImplementation(async (path?: string) => {
      // Only the catalogue is answered here; anything else the page asks for stays pending.
      if (!path?.startsWith('/catalog')) return new Promise(() => undefined);
      const offset = Number(new URLSearchParams(path.split('?')[1]).get('offset'));
      const items = Array.from({ length: 100 }, (_, i) => item({ id: `x${offset + i}`, providerId: i === 0 ? 'acct-1' : 'someone-else' }));
      return { items, total: 5000 };
    });
    const result = await liveCatalogueSource('acct-1', new AbortController().signal);
    expect(result.items).toHaveLength(10);
    expect(result.scanned).toBe(1000);
    expect(result.total).toBe(5000);
    render(<VendorCatalogueScreen source={async () => result} />);
    await waitFor(() => expect(screen.getByText(/Checked the first 1000 of 5000/)).toBeInTheDocument());
  });
});
