import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeRequest, listing, pkg } from '@/features/phoneKit/__tests__/fixtures';
import { SearchViewModel } from '../../viewmodel/SearchViewModel';
import { SearchFlow } from '../SearchFlow';
import type { SearchLinks } from '../searchParts';
import { HomeDiscoverView } from '../HomeDiscoverView';

function links(): SearchLinks {
  return {
    exit: vi.fn(), openProduct: vi.fn(), openList: vi.fn(), bookLab: vi.fn(), bookDoctor: vi.fn(), openPrescriptions: vi.fn(),
    openAyush: vi.fn(), openEmergencyCard: vi.fn(), openPass: vi.fn(), openCrisis: vi.fn(),
  };
}

const ROUTES = {
  '/catalog': {
    items: [
      listing({}),
      listing({ id: 'rx', name: 'Vitamin K injection', requiresPrescription: true }),
      listing({ id: 'doc', kind: 'consultation', name: 'Nutrition consult', category: 'nutrition', brand: 'Dr. Rao', pricePaise: 0 }),
    ],
    total: 3,
  },
  '/lab-packages': { items: [pkg({})] },
  '/home': { articles: [] },
};

function setup(routes: Record<string, unknown> = ROUTES) {
  const { request } = fakeRequest(routes);
  const timers: (() => void)[] = [];
  const vm = new SearchViewModel(request, { set: (fn) => { timers.push(fn); return 0; }, clear: () => undefined });
  const l = links();
  render(<SearchFlow vm={vm} links={l} />);
  return { vm, links: l, timers };
}

const online = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
afterEach(() => { if (online) Object.defineProperty(window.navigator, 'onLine', online); });

describe('search boards', () => {
  it('opens on the entry board: prescription shortcut and the popular categories, mic shown as unavailable', () => {
    const { links: l } = setup();
    expect(screen.getByTestId('search-entry')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Voice search isn’t available yet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Have a prescription/ }));
    expect(l.openPrescriptions).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: /^Skin care/ }));
    expect(l.openList).toHaveBeenCalledWith({ category: 'skin' });
    // No recent searches yet: nothing is read from the device.
    expect(screen.queryByText('Recent searches')).toBeNull();
  });

  it('suggests catalogue listings while typing, and searches for the one picked', async () => {
    const { vm, timers } = setup();
    fireEvent.change(screen.getByLabelText('Search medicines, lab tests and doctors'), { target: { value: 'vit' } });
    expect(screen.getByTestId('search-typing')).toBeInTheDocument();
    await act(async () => { timers[timers.length - 1]?.(); });
    const row = await screen.findByRole('link', { name: 'Search for Vitamin D3 60K' });
    fireEvent.click(row);
    await screen.findByTestId('search-results');
    expect(vm.searched).toBe('Vitamin D3 60K');
  });

  it('shows all results with honest tags and a note on ordering, and opens a product in the shop', async () => {
    const { vm, links: l } = setup();
    await act(async () => { await vm.submit('vitamin'); });
    const results = screen.getByTestId('search-results');
    expect(within(results).getByRole('tablist', { name: 'Result types' })).toBeInTheDocument();
    expect(within(results).getByText('Needs Rx')).toBeInTheDocument();
    expect(within(results).getByText('Listed by name — never by paid placement')).toBeInTheDocument();
    // No star ratings: the catalogue has none.
    expect(results.textContent).not.toMatch(/★|rating/i);
    fireEvent.click(within(results).getByRole('link', { name: /^Vitamin D3 60K/ }));
    expect(l.openProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('switches to the lab board, and View slots opens the real booking', async () => {
    const { vm, links: l } = setup();
    await act(async () => { await vm.submit('vitamin'); });
    fireEvent.click(screen.getByRole('tab', { name: 'Lab tests' }));
    const board = screen.getByTestId('lab-results');
    expect(within(board).getByText('NABL')).toBeInTheDocument();
    fireEvent.click(within(board).getByRole('button', { name: 'View slots for Vitamin D Test' }));
    expect(l.bookLab).toHaveBeenCalledWith('l1');
  });

  it('shows the lab first-time state when no package matches', async () => {
    const { vm } = setup({ ...ROUTES, '/lab-packages': { items: [] } });
    await act(async () => { await vm.submit('vitamin', 'labs'); });
    expect(screen.getByTestId('lab-first-time')).toBeInTheDocument();
  });

  it('says it is offline on the lab board and keeps the emergency card and crisis numbers in reach', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
    const { vm, links: l } = setup();
    await act(async () => { await vm.submit('vitamin', 'labs'); });
    expect(screen.getByText('You’re offline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Emergency card' }));
    expect(l.openEmergencyCard).toHaveBeenCalled();
  });

  it('lists doctors with the fee before booking, and narrows them in a sheet', async () => {
    const { vm, links: l } = setup();
    await act(async () => { await vm.submit('consult', 'doctors'); });
    const board = screen.getByTestId('doctor-results');
    expect(within(board).getByText('1 consultation')).toBeInTheDocument();
    fireEvent.click(within(board).getByRole('button', { name: 'Book Nutrition consult, Free' }));
    expect(l.bookDoctor).toHaveBeenCalled();
    fireEvent.click(within(board).getByRole('button', { name: 'Filter' }));
    expect(await screen.findByRole('radio', { name: /All kinds of care/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('turns an empty search into ways forward, never a dead end', async () => {
    const { vm, links: l } = setup({ '/catalog': { items: [], total: 0 }, '/lab-packages': { items: [] }, '/home': { articles: [] } });
    await act(async () => { await vm.submit('vitmain tablt'); });
    expect(screen.getByRole('heading', { name: 'Nothing matched that' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search for vitmain' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Describe it to Ayush instead' }));
    expect(l.openAyush).toHaveBeenCalled();
  });

  it('fails visibly with a retry when the search cannot run', async () => {
    const { vm } = setup({ '/catalog': new Error('down'), '/lab-packages': { items: [] }, '/home': { articles: [] } });
    await act(async () => { await vm.submit('vitamin'); });
    expect(screen.getByRole('alert')).toHaveTextContent('Search didn’t finish');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('Discover board', () => {
  it('puts crisis support and Call 112 first, and hands search to the search boards', () => {
    const l = { openSearch: vi.fn(), openCrisis: vi.fn(), call112: vi.fn(), openShop: vi.fn(), openCover: vi.fn(), openAyush: vi.fn() };
    render(<HomeDiscoverView links={l} campus="VNR VJIET" verified />);
    fireEvent.click(screen.getByRole('button', { name: 'Call 112' }));
    expect(l.call112).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('search', { name: 'Open search' }));
    expect(l.openSearch).toHaveBeenCalled();
    expect(screen.getByText('VNR VJIET')).toBeInTheDocument();
    expect(screen.getByText('Verified student')).toBeInTheDocument();
  });

  it('leaves out the cover tile where there is no cover screen', () => {
    render(<HomeDiscoverView links={{ openSearch: vi.fn(), openCrisis: vi.fn(), call112: vi.fn(), openShop: vi.fn(), openAyush: vi.fn() }} campus="" verified={false} />);
    expect(screen.queryByRole('link', { name: 'Your health cover' })).toBeNull();
    expect(screen.getByText('No campus linked yet')).toBeInTheDocument();
  });
});
