import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { useEffect } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { runInAction } from 'mobx';

const state = vi.hoisted(() => ({ reduced: true, user: { id: 'u1', fullName: 'Asha Rao', role: 'STUDENT' } as null | { id: string; fullName: string; role: string } }));
vi.mock('@/design-system/motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/design-system/motion')>()), useReducedMotion: () => state.reduced }));
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user, status: 'ready' }) }));
// The pay step has its own tests; here a button stands in for the gateway saying "paid".
vi.mock('@/features/payments/views/PayStepView', () => ({
  PayStepView: ({ viewModel }: { viewModel: { phase: string } }) => <button type="button" onClick={() => runInAction(() => { viewModel.phase = 'paid'; })}>gateway says paid</button>,
}));

import { apiRequest } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import { BrowserRouter } from '@/core/navigation';
import { LiveCartProvider, useLiveCart } from '@/data/contexts/LiveCartContext';
import type { LiveCatalogItem, LiveOrder } from '@/data/types/workflowTypes';
import { forgetListings } from '@/features/phoneKit/listingCache';
import { motion } from '@/design-system/theme';
import { pkg } from '@/features/phoneKit/__tests__/fixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import { WebShopView } from '../WebShopView';
import { WebCheckoutView } from '../WebCheckoutView';
import { PublicShopPage } from '../PublicShopPage';

const api = vi.mocked(apiRequest);
const go = vi.mocked(navigate);

const item = (id: string, extra: Partial<LiveCatalogItem> = {}): LiveCatalogItem => ({ id, providerId: 'p', kind: 'product', name: `Item ${id}`, brand: 'Brand', category: 'first-aid', description: '', pack: 'Pack of 10', pricePaise: 12000, mrpPaise: 15000, stock: 5, active: true, requiresPrescription: false, preparation: '', ...extra });
const CATALOG = [
  item('a', { name: 'Paracetamol 650 mg', category: 'medicines', medicineId: 'm1', composition: 'Paracetamol 650 mg', pricePaise: 3200, mrpPaise: 3500 }),
  item('rx', { name: 'Azithromycin 500 mg', category: 'medicines', medicineId: 'm2', composition: 'Azithromycin 500 mg', requiresPrescription: true }),
  item('lab', { kind: 'lab', name: 'Thyroid profile', category: 'labs' }),
  item('doc', { kind: 'consultation', name: 'General consult', category: 'general-care' }),
];
const order = (extra: Partial<LiveOrder> = {}): LiveOrder => ({ id: 'ord12345abcd', createdAt: 1_760_000_000, totalPaise: 12000, delivery: { mode: 'pickup', address: '', city: 'Hyderabad', pincode: '500090' }, requestedSlot: '', paymentStatus: 'UNPAID', lines: [], ...extra });

type Routes = Record<string, unknown | ((path: string, init?: RequestInit) => unknown)>;
function serve(routes: Routes) {
  api.mockImplementation((path: string, init?: RequestInit) => {
    const key = Object.keys(routes).sort((a, b) => b.length - a.length).find((prefix) => path.startsWith(prefix));
    if (!key) return Promise.reject(new Error(`unexpected ${path}`));
    const value = routes[key];
    const result = typeof value === 'function' ? (value as (p: string, i?: RequestInit) => unknown)(path, init) : value;
    return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
  });
}
const catalog = (list: LiveCatalogItem[] = CATALOG) => (path: string) => {
  const q = new URL(path, 'http://x').searchParams;
  const found = list.filter((entry) => (!q.get('kind') || entry.kind === q.get('kind')) && (!q.get('category') || entry.category === q.get('category')) && (!q.get('query') || entry.name.toLowerCase().includes(String(q.get('query')).toLowerCase())));
  return { items: found.slice(0, Number(q.get('limit') ?? 12)), total: found.length };
};
const requested = () => api.mock.calls.map(([path]) => String(path));
const settle = async () => { await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }); };
const withCart = (ui: React.ReactElement) => <BrowserRouter><LiveCartProvider>{ui}</LiveCartProvider></BrowserRouter>;
function Seed({ items }: { items: LiveCatalogItem[] }) {
  const cart = useLiveCart();
  const seeded = React.useRef(false);
  useEffect(() => { if (seeded.current) return; seeded.current = true; for (const entry of items) cart.add(entry); }, [cart, items]);
  return null;
}
function CartProbe({ onCart }: { onCart: (lines: number) => void }) {
  const cart = useLiveCart();
  useEffect(() => { onCart(cart.lines.length); }, [cart.lines, onCart]);
  return null;
}

beforeEach(() => {
  api.mockReset(); go.mockReset(); forgetListings();
  state.reduced = true;
  state.user = { id: 'u1', fullName: 'Asha Rao', role: 'STUDENT' };
  window.history.pushState({}, '', '/shop');
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('web shop (Mobile 2.0), signed in', () => {
  it('draws the front: rail, highlights, ways to order with honest gaps, categories, refills and points', async () => {
    serve({ '/catalog': catalog(), '/points/me': { balance: 120 } });
    render(withCart(<WebShopView />));
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: /priced before you pay/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Browse the shop' })).toBeInTheDocument();
    expect(screen.getByTestId('m2w-carousel')).toHaveAttribute('aria-roledescription', 'carousel');
    // No order line is configured: call to order is not a button, chat is coming soon.
    expect(screen.getByRole('group', { name: 'Call to order, Not available yet' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Chat to order, Coming soon' })).toBeInTheDocument();
    expect(screen.getByText('120 Kare points')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Refills for your regular medicines/ }));
    expect(go).toHaveBeenCalledWith('your-care');
    fireEvent.click(screen.getByRole('link', { name: 'Order with prescription' }));
    expect(go).toHaveBeenCalledWith('prescriptions');
    expect(screen.getByText('Nothing here is chosen from your health records')).toBeInTheDocument();
    // Commerce only: nothing clinical is read on the shop (Rule L).
    expect(requested().filter((path) => /\/health\/|\/records|\/prescriptions|\/meds|\/refills|\/clinical/.test(path))).toEqual([]);
  });

  it('filters by kind and category with server counts, and keeps the cart beside the grid', async () => {
    serve({ '/catalog': catalog() });
    render(withCart(<WebShopView />));
    await settle();
    expect(screen.getByRole('button', { name: /^All\s*4$/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^Lab tests\s*1$/ }));
    await settle();
    expect(window.location.search).toBe('?kind=lab');
    expect(screen.getByRole('heading', { level: 1, name: 'Health checks and lab packages' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Book a slot, Thyroid profile' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('adds to the cart rail, steps the quantity, removes, and opens the checkout', async () => {
    serve({ '/catalog': catalog() });
    render(withCart(<WebShopView />));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Add, Paracetamol 650 mg' }));
    const rail = screen.getByTestId('m2w-cart');
    expect(rail).toHaveTextContent('Paracetamol 650 mg');
    expect(screen.getByText('Paracetamol 650 mg added to your cart.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Increase Paracetamol 650 mg' })[0]);
    expect(rail).toHaveTextContent('₹64');
    fireEvent.click(within(rail).getByRole('button', { name: 'Go to checkout' }));
    expect(go).toHaveBeenCalledWith('checkout');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Paracetamol 650 mg' }));
    expect(rail).not.toHaveTextContent('Paracetamol 650 mg');
    // A prescription medicine never goes in the cart.
    expect(screen.getByRole('button', { name: 'Add, Azithromycin 500 mg' })).toBeDisabled();
  });

  it('error: calm copy and a retry that loads again', async () => {
    serve({ '/catalog': new Error('boom') });
    render(withCart(<WebShopView />));
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load the catalogue.');
    serve({ '/catalog': catalog() });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(screen.getByRole('button', { name: 'Add, Paracetamol 650 mg' })).toBeInTheDocument();
  });

  it('offline: says so and offers nothing that needs the network', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    serve({ '/catalog': new Error('offline') });
    render(withCart(<WebShopView />));
    await settle();
    expect(screen.getByText('You’re offline')).toBeInTheDocument();
  });

  it('empty: an unpublished catalogue says so; a filter with no match offers to clear it', async () => {
    serve({ '/catalog': catalog([]) });
    const { unmount } = render(withCart(<WebShopView />));
    await settle();
    expect(screen.getByText('The catalogue is not available yet.')).toBeInTheDocument();
    unmount();
    window.history.pushState({}, '', '/shop?category=eye');
    render(withCart(<WebShopView />));
    await settle();
    expect(screen.getByText('No matching entries.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Clear filters/ })[0]);
    await settle();
    expect(window.location.search).toBe('');
  });

  it('has no accessibility violations', async () => {
    serve({ '/catalog': catalog(), '/points/me': { balance: 120 } });
    const { container } = render(withCart(<WebShopView />));
    await settle();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('web shop (Mobile 2.0), signed out', () => {
  it('sits in the public header and footer, reads no points, and asks to sign in to check out or book', async () => {
    state.user = null;
    serve({ '/catalog': catalog() });
    render(withCart(<PublicShopPage route="shop" signedIn={false} />));
    await settle();
    expect(screen.getAllByRole('link', { name: /Sign in/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(requested().some((path) => path.startsWith('/points'))).toBe(false);
    expect(screen.queryByText(/Refills for your regular medicines/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to continue' }));
    expect(go).toHaveBeenCalledWith('login', 'checkout');
    fireEvent.click(screen.getByRole('button', { name: 'Book a slot, Thyroid profile' }));
    expect(go).toHaveBeenCalledWith('login', 'shop');
  });
});

describe('medicine page (M2Product rules at desktop width)', () => {
  it('lists other makers cheapest first and adds the chosen quantity', async () => {
    serve({
      '/catalog/a/alternatives': { itemId: 'a', composition: 'Paracetamol 650 mg', dosageForm: 'tablet', restricted: false, items: [
        { id: 'g2', name: 'Maker B 650', brand: 'B', pack: 'Strip of 15', pricePaise: 2200, mrpPaise: 2500, stock: 9, imageUrl: null, manufacturer: 'B', dosageForm: 'tablet', composition: 'Paracetamol 650 mg', schedule: '', requiresPrescription: false },
        { id: 'g1', name: 'Maker A 650', brand: 'A', pack: 'Strip of 15', pricePaise: 1800, mrpPaise: 2500, stock: 9, imageUrl: null, manufacturer: 'A', dosageForm: 'tablet', composition: 'Paracetamol 650 mg', schedule: '', requiresPrescription: false },
      ] },
      '/catalog': catalog(),
      '/inventory/': { available: true, stock: 5 },
    });
    let lines = 0;
    render(withCart(<><WebShopView /><CartProbe onCart={(n) => { lines = n; }} /></>));
    await settle();
    // The card is the shared Mobile 2.0 product card: one link, named by its text (it starts with the brand, then the name).
    expect(screen.getByTestId('m2w-card-a-open')).toHaveAccessibleName(/Paracetamol 650 mg/);
    fireEvent.click(screen.getByTestId('m2w-card-a-open'));
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'Paracetamol 650 mg' })).toBeInTheDocument();
    expect(screen.getByText('Contains: Paracetamol 650 mg')).toBeInTheDocument();
    const makers = screen.getByTestId('m2w-prod-alts').querySelectorAll('li button');
    expect(makers[0]).toHaveAccessibleName(/Maker A 650.*Lowest/);
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 to cart' }));
    expect(lines).toBe(1);
  });

  it('a prescription medicine: no stepper, no add, no other makers; Add Rx and send to a pharmacy', async () => {
    serve({ '/catalog/rx/alternatives': { itemId: 'rx', composition: null, dosageForm: null, restricted: true, items: [] }, '/catalog': catalog(), '/inventory/': { available: true, stock: 5 } });
    window.history.pushState({}, '', '/shop');
    render(withCart(<WebShopView />));
    await settle();
    fireEvent.click(screen.getByTestId('m2w-card-rx-open'));
    await settle();
    expect(screen.getByTestId('m2w-prod-rx')).toHaveTextContent('Prescription needed');
    expect(screen.queryByRole('group', { name: 'Quantity' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /to cart/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('m2w-prod-alts')).not.toBeInTheDocument();
    // No reviewed medicine information exists, so none is drawn.
    expect(document.body.textContent).not.toMatch(/side effects|Do not take with/i);
    fireEvent.click(screen.getByRole('button', { name: 'Add Rx' }));
    expect(go).toHaveBeenCalledWith('records');
    fireEvent.click(screen.getByRole('button', { name: 'Send your prescription to a pharmacy' }));
    expect(go).toHaveBeenCalledWith('prescriptions');
  });
});

describe('web checkout (Mobile 2.0)', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Hyderabad' } });
    fireEvent.change(screen.getByLabelText('Pincode'), { target: { value: '500090' } });
  };

  it('asks for a time only when a consult is in the cart, and refuses a past one', async () => {
    serve({});
    render(withCart(<><Seed items={[CATALOG[3]]} /><WebCheckoutView /></>));
    await settle();
    fill();
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2001-01-01' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '09:30' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to pay/ }));
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a time for the consultation or vaccine.');
    expect(requested()).toEqual([]);
  });

  it('walks the steps: where, validate, place once, pay, then the confirmation (cart spent)', async () => {
    serve({ '/cart/validate': { serviceable: true, items: [{ id: 'a', available: true, reason: '' }] }, '/orders': order({ paymentStatus: 'UNPAID' }) });
    let lines = -1;
    render(withCart(<><Seed items={[CATALOG[0]]} /><WebCheckoutView /><CartProbe onCart={(n) => { lines = n; }} /></>));
    await settle();
    expect(screen.getByRole('list', { name: 'Checkout steps' })).toBeInTheDocument();
    expect(screen.getByText('Shop items need no slot: the provider confirms the timing when they accept your order.')).toBeInTheDocument();
    fill();
    fireEvent.click(screen.getByRole('button', { name: /Continue to pay/ }));
    await settle();
    expect(api.mock.calls.filter(([path]) => path === '/orders')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'gateway says paid' }));
    await settle();
    expect(screen.getByTestId('m2w-order-placed')).toHaveTextContent('Order placed');
    expect(screen.getByText('ORD12345')).toBeInTheDocument();
    expect(lines).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: /Track this order/ }));
    expect(window.location.pathname + window.location.search).toBe('/orders?order=ord12345abcd');
  });

  it('a failed place says nothing was charged', async () => {
    serve({ '/cart/validate': { serviceable: true, items: [] }, '/orders': new Error('Server down') });
    render(withCart(<><Seed items={[CATALOG[0]]} /><WebCheckoutView /></>));
    await settle();
    fill();
    fireEvent.click(screen.getByRole('button', { name: /Continue to pay/ }));
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing was charged.');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(withCart(<><Seed items={[CATALOG[0]]} /><WebCheckoutView /></>));
    await settle();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('motion', () => {
  it('the lab highlight is a package the catalogue really lists; with none, it is not drawn (no made-up offer)', async () => {
    serve({ '/catalog': catalog(), '/points/me': { balance: 1 }, '/lab-packages': { items: [pkg({ id: 'big', name: 'Complete Health Checkup', includes: ['a', 'b', 'c'] }), pkg({})] } });
    render(withCart(<WebShopView />));
    await settle();
    expect(screen.getByTestId('m2w-carousel-slide-check')).toHaveTextContent('Complete Health Checkup');
    expect(document.body.textContent).not.toMatch(/Three checks, one visit/);
    cleanup();
    serve({ '/catalog': catalog(), '/points/me': { balance: 1 }, '/lab-packages': { items: [] } });
    render(withCart(<WebShopView />));
    await settle();
    expect(screen.queryByTestId('m2w-carousel-slide-check')).toBeNull();
  });

  it('the highlights never advance under reduced motion', async () => {
    serve({ '/catalog': catalog(), '/points/me': { balance: 1 }, '/lab-packages': { items: [pkg({})] } });
    render(withCart(<WebShopView />));
    await settle();
    vi.useFakeTimers();
    act(() => { vi.advanceTimersByTime(motion.duration.carousel * 3); });
    expect(screen.getByTestId('m2w-carousel-slide-check')).toBeInTheDocument();
  });

  it('the highlights move on when motion is allowed', async () => {
    state.reduced = false;
    vi.useFakeTimers();
    serve({ '/catalog': catalog(), '/points/me': { balance: 1 }, '/lab-packages': { items: [pkg({})] } });
    render(withCart(<WebShopView />));
    await settle();
    act(() => { vi.advanceTimersByTime(motion.duration.carousel); });
    expect(screen.getByTestId('m2w-carousel-slide-rx')).toBeInTheDocument();
  });

  it('the stylesheet turns the float off under reduced motion, and redraws no Mobile 2.0 piece', () => {
    const css = readFileSync(join(__dirname, '..', 'webshop.css'), 'utf8');
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/\.sk-m2w-blister \{ animation: none; \}/);
    // Rise-in, lift, soft tiles, quick cards, link rows, product cards and the generics table are the shared components (parity audit phase 1).
    expect(css).not.toMatch(/sk-m2w-(rise|lift|soft|softtile|softgrid|qcard|quick|linkcard|compare)\b|sk-m2w-card(__|\b)/);
  });
});
