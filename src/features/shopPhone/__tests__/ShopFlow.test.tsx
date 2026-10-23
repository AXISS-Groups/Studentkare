import React, { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeRequest, listing, order } from '@/features/phoneKit/__tests__/fixtures';
import { MedicineRepository } from '@/features/marketplace/data/MedicineRepository';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { PhoneShopViewModel } from '../viewmodel/PhoneShopViewModel';
import type { CartLine, CartPort, ShopScreen } from '../viewmodel/PhoneShopViewModel';
import { ShopFlow } from '../views/ShopFlow';
import { OrderSuccessView } from '../views/OrderSuccessView';
import type { ShopLinks } from '../views/shopParts';

const LINKS: ShopLinks = {
  openSearch: vi.fn(), openRewards: vi.fn(), openRefill: vi.fn(), openPrescriptions: vi.fn(), openLabTests: vi.fn(),
  bookLab: vi.fn(), trackOrder: vi.fn(), openOrders: vi.fn(),
};

/** A cart kept in React state, like the web's LiveCart. */
function Harness({ vm, initial = [] }: { vm: PhoneShopViewModel; initial?: CartLine[] }) {
  const [lines, setLines] = useState<CartLine[]>(initial);
  const cart: CartPort = {
    lines,
    add: (item: LiveCatalogItem) => setLines((ls) => (ls.some((l) => l.item.id === item.id) ? ls.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { item, quantity: 1 }])),
    setQuantity: (id, q) => setLines((ls) => ls.map((l) => (l.item.id === id ? { ...l, quantity: q } : l)).filter((l) => l.quantity > 0)),
    clear: () => setLines([]),
  };
  return <ShopFlow vm={vm} cart={cart} links={LINKS} />;
}

function setup(initial: ShopScreen, routes: Record<string, unknown>, lines: CartLine[] = []) {
  const { request } = fakeRequest(routes);
  const vm = new PhoneShopViewModel(initial, request, new MedicineRepository(request));
  render(<Harness vm={vm} initial={lines} />);
  return vm;
}

const VITAMINS = { items: [listing({}), listing({ id: 'rx', name: 'Azithromycin 500', requiresPrescription: true }), listing({ id: 'omega', name: 'Omega 3 Fish Oil', stock: 2 })], total: 3 };

describe('shop boards', () => {
  it('opens on Mobile 2.0 Medicines: points, lab price, categories, the Rule L line, and no health data', async () => {
    const vm = setup({ name: 'home' }, { '/catalog': VITAMINS, '/points/me': { balance: 120, pointsNote: '' }, '/lab-packages': { items: [{ pricePaise: 39900 }] } });
    expect(screen.getByTestId('m2-medicines')).toBeInTheDocument();
    // Named by its visible text on the web (label in name, live-run audit #10).
    const points = await screen.findByTestId('m2-med-points');
    expect(points).toHaveAttribute('role', 'link');
    expect(points).toHaveTextContent(/120/);
    expect(points).toHaveTextContent(/Kare points/);
    expect(screen.getByText('Nothing here is chosen from your health records')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lab packages from ₹399' })).toBeInTheDocument();
    for (const name of ['Vitamins', 'Skin care', 'Cold and cough', 'Ayurveda']) expect(screen.getByRole('link', { name })).toBeInTheDocument();
    // The refills card is a plain link to My health: no medicine is named on the shop (Rule L).
    expect(screen.getByRole('link', { name: /Refills for your regular medicines/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Cold and cough' }));
    expect(vm.screen).toEqual({ name: 'list', category: '', query: 'cough' });
  });

  it('adds from the grid, refuses a prescription item there, and shows the cart bar with the catalogue total', async () => {
    setup({ name: 'list', category: 'vitamins', query: '' }, { '/catalog': VITAMINS });
    fireEvent.click(await screen.findByRole('button', { name: 'Add Vitamin D3 60K to cart' }));
    expect(screen.queryByRole('button', { name: 'Add Azithromycin 500 to cart' })).toBeNull();
    expect(within(screen.getByTestId('product-rx')).getByText('Needs Rx')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View cart, 1 item, ₹149' })).toBeInTheDocument();
    // No star ratings or review counts are drawn: the catalogue has none.
    expect(screen.getByTestId('product-list').textContent).not.toMatch(/★|\(\d+\)/);
    expect(screen.queryByRole('tab', { name: /Rating|Popular/ })).toBeNull();
  });

  it('says in the quantity sheet when a line is at its stock limit', async () => {
    setup({ name: 'cart' }, {}, [{ item: listing({ id: 'omega', name: 'Omega 3 Fish Oil', stock: 2 }), quantity: 2 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Change how many Omega 3 Fish Oil (2)' }));
    expect(await screen.findByTestId('cart-cap')).toHaveTextContent('Only 2 in stock right now.');
    expect(screen.getByRole('button', { name: 'Increase Omega 3 Fish Oil' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Remove from cart' }));
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
  });

  it('marks the address as needed at checkout and stops before the server when it is missing', async () => {
    setup({ name: 'checkout' }, {}, [{ item: listing({}), quantity: 1 }]);
    expect(screen.getByRole('button', { name: /Deliver to/ })).toHaveTextContent('Needed');
    expect(screen.getByText('0 of 1 chosen')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹149' }));
    expect(await screen.findByTestId('checkout-error')).toHaveTextContent('Add the city and a 6-digit pincode');
  });

  it('asks for a time only when a consultation is in the cart', () => {
    setup({ name: 'checkout' }, {}, [{ item: listing({ kind: 'consultation', name: 'Nutrition consult' }), quantity: 1 }]);
    expect(screen.getByText('0 of 2 chosen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /When/ })).toBeInTheDocument();
  });

  it('opens the Mobile 2.0 medicine page: the caution note, and no add button for a prescription medicine', async () => {
    const vm = setup({ name: 'list', category: 'vitamins', query: '' }, { '/catalog': VITAMINS });
    await screen.findByTestId('product-rx');
    act(() => vm.openProduct(VITAMINS.items[1]));
    const detail = await screen.findByTestId('m2-product');
    expect(within(detail).getByTestId('m2-prod-rx')).toHaveTextContent('Prescription needed');
    expect(within(detail).getByText(/not a substitute for medical advice/)).toBeInTheDocument();
    expect(within(detail).queryByTestId('m2-prod-add')).toBeNull();
    expect(within(detail).getByRole('link', { name: 'Send your prescription to a pharmacy' })).toBeInTheDocument();
  });
});

describe('order placed', () => {
  it('shows what the server has: reference, pickup, amount paid and the saving', () => {
    const onTrack = vi.fn();
    render(<OrderSuccessView order={order({})} savedPaise={10000} onTrack={onTrack} onShop={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Order placed' })).toBeInTheDocument();
    expect(screen.getByTestId('order-ref')).toHaveTextContent('ORD12345');
    expect(screen.getByText('₹578 paid')).toBeInTheDocument();
    expect(screen.getByText('You saved ₹100 on this order')).toBeInTheDocument();
    expect(screen.getByText('You collect it from the provider')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Track this order' }));
    expect(onTrack).toHaveBeenCalled();
  });
});
