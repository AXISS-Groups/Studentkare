import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { useEffect } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import { BrowserRouter } from '@/core/navigation';
import { LiveCartProvider, useLiveCart } from '@/data/contexts/LiveCartContext';
import type { LiveCatalogItem, LiveOrder } from '@/data/types/workflowTypes';
import { axeViolations, describeViolations } from '@/test/axe';
import { ThemeProvider } from '@/theme/tokens/theme';
import { WebOrdersView } from '../WebOrdersView';
import { WebOrdersHub } from '../WebOrdersHub';
import { WebReorderView } from '../WebReorderView';
import { WebAccountView } from '../WebAccountView';
import { WebNotificationsRoute } from '../WebNotificationsView';
import { WebShopView } from '../shop/WebShopView';
import { WebCheckoutView } from '../shop/WebCheckoutView';

vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));
vi.mock('@/data/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', fullName: 'Krishna Chintakayala', role: 'STUDENT', university: 'VNR VJIET', isVerifiedStudent: true }, status: 'ready', updateUser: vi.fn() }),
}));
// The payment step has its own tests; here it only has to appear after the order exists.
vi.mock('@/features/payments/views/PayStepView', () => ({ PayStepView: () => <p>pay step</p> }));

const api = vi.mocked(apiRequest);
const go = vi.mocked(navigate);

const item = (id: string, extra: Partial<LiveCatalogItem> = {}): LiveCatalogItem => ({ id, providerId: 'p', kind: 'product', name: `Item ${id}`, brand: 'Brand', category: 'first-aid', description: 'From the provider.', pack: 'Pack of 10', pricePaise: 12000, mrpPaise: 15000, stock: 5, active: true, requiresPrescription: false, preparation: '', ...extra });
const order = (id: string, status: LiveOrder['lines'][number]['status'], extra: Partial<LiveOrder> = {}, lineExtra: Partial<LiveOrder['lines'][number]> = {}): LiveOrder => ({
  id, createdAt: 1_760_000_000, totalPaise: 12000, delivery: { mode: 'pickup', address: '', city: 'Hyderabad', pincode: '500090' }, requestedSlot: '', paymentStatus: 'PAID',
  lines: [{ id: `${id}-l`, itemId: 'i1', name: 'ORS sachets', kind: 'product', quantity: 1, pricePaise: 12000, status, ...lineExtra }], ...extra,
});

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
const requested = () => api.mock.calls.map(([path]) => String(path));
const settle = async () => { await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); }); };

function CartProbe({ onCart }: { onCart: (lines: number) => void }) {
  const cart = useLiveCart();
  useEffect(() => { onCart(cart.lines.reduce((sum, line) => sum + line.quantity, 0)); }, [cart.lines, onCart]);
  return null;
}
function Seed({ items }: { items: LiveCatalogItem[] }) {
  const cart = useLiveCart();
  const seeded = React.useRef(false);
  useEffect(() => { if (seeded.current) return; seeded.current = true; for (const entry of items) cart.add(entry); }, [cart, items]);
  return null;
}
const withCart = (ui: React.ReactElement) => <BrowserRouter><LiveCartProvider>{ui}</LiveCartProvider></BrowserRouter>;

beforeEach(() => { api.mockReset(); go.mockReset(); window.history.pushState({}, '', '/'); });
afterEach(() => { vi.useRealTimers(); });

describe('WebOrders — My orders', () => {
  it('lists orders with status words, tracks the active one and cancels only an untouched order', async () => {
    serve({ '/orders': (path: string, init?: RequestInit) => (init?.method === 'POST' ? {} : { items: [order('abcdef12xx', 'REQUESTED'), order('done000000', 'COMPLETED')], total: 2 }) });
    render(<WebOrdersView />);
    await settle();
    const table = screen.getByRole('table', { name: 'Your orders, newest first' });
    expect(within(table).getByText('SK-ABCDEF12')).toBeInTheDocument();
    expect(within(table).getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Requested' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    await settle();
    expect(api).toHaveBeenCalledWith('/orders/abcdef12xx/cancel', { method: 'POST' });
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Reorder SK-DONE0000' }));
    expect(go).toHaveBeenCalledWith('buy-again');
  });

  it('has My lab tests as its second tab (founder decision, 23 Oct 2026), and opens it from ?view=lab-tests', async () => {
    serve({ '/orders': { items: [], total: 0 }, '/lab-orders': { items: [] }, '/health/documents': { items: [] } });
    window.history.pushState({}, '', '/orders');
    render(<BrowserRouter><WebOrdersHub /></BrowserRouter>);
    await settle();
    const tabs = screen.getByTestId('orders-hub-tabs');
    expect(within(tabs).getByRole('button', { name: 'Orders' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(tabs).getByRole('button', { name: 'My lab tests' }));
    await settle();
    expect(window.location.search).toBe('?view=lab-tests');
    expect(screen.getByRole('heading', { level: 1, name: 'My lab tests' })).toBeInTheDocument();
  });

  it('has no cancel once the provider has accepted', async () => {
    serve({ '/orders': { items: [order('acc0000000', 'ACCEPTED')], total: 1 } });
    render(<WebOrdersView />);
    await settle();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('empty: no orders yet, with the shop as the next step', async () => {
    serve({ '/orders': { items: [], total: 0 } });
    render(<WebOrdersView />);
    await settle();
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse the shop' }));
    expect(go).toHaveBeenCalledWith('shop');
  });

  it('has no accessibility violations', async () => {
    serve({ '/orders': { items: [order('abcdef12xx', 'DISPATCHED')], total: 1 } });
    const { container } = render(<WebOrdersView />);
    await settle();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('WebReorder — Buy again (the student page, not the partner /reorder)', () => {
  const orders = { items: [order('o1', 'COMPLETED', {}, { itemId: 'ok', name: 'ORS sachets' }), order('o2', 'COMPLETED', {}, { itemId: 'rx', name: 'Antibiotic' })] };

  it('offers delivered shop items at today’s price, and never a prescription medicine', async () => {
    serve({ '/orders': orders, '/catalog': { items: [item('ok', { pricePaise: 9900 }), item('rx', { requiresPrescription: true })], total: 2 } });
    let units = 0;
    render(withCart(<><WebReorderView /><CartProbe onCart={(n) => { units = n; }} /></>));
    await settle();
    expect(screen.getByText('₹99')).toBeInTheDocument();
    expect(screen.getByText('Needs a prescription')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Buy .* again$/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Buy ORS sachets again' }));
    expect(units).toBe(1);
    expect(screen.getByRole('status')).toHaveTextContent('ORS sachets is in your cart.');
    // Commerce only (Rule L): orders and the catalogue, nothing clinical.
    expect(requested().filter((path) => !/config/.test(path)).every((path) => path.startsWith('/orders') || path.startsWith('/catalog?kind=product'))).toBe(true);
  });

  it('shows the campus store and ratings as not available, never with invented rows', async () => {
    serve({ '/orders': { items: [] }, '/catalog': { items: [], total: 0 } });
    render(withCart(<WebReorderView />));
    await settle();
    expect(screen.getByRole('button', { name: /Campus store.*Not available yet/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Nothing to buy again yet')).toBeInTheDocument();
    expect(screen.getByText('Ratings aren’t open yet')).toBeInTheDocument();
  });
});

describe('WebAccount', () => {
  it('shows the account as stored, with no edit on the sign-in contact and ABHA as not available', async () => {
    serve({
      '/profile': { id: 'u1', fullName: 'Krishna Chintakayala', role: 'STUDENT', email: 'k@example.in', phone: '+91 98765 43210', dob: '2004-01-01', university: 'VNR VJIET', rollNumber: '', bloodGroup: '', ageVerified: true, isVerifiedStudent: true, emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '', allergies: [], chronicConditions: [], updatedAt: null },
      '/identity': { campusStatus: 'VERIFIED' },
      '/points/me': { balance: 240, redeemable: false },
      '/notifications/preferences': { pushEnabled: true, emailEnabled: false, remindersEnabled: true },
    });
    render(<ThemeProvider><WebAccountView /></ThemeProvider>);
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'Hi, Krishna' })).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /: Mobile number/ })).toBeNull();
    expect(screen.getAllByText('Not available yet').length).toBeGreaterThan(0);
    expect(screen.getByText('Kare points · 240')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add: Emergency contact' }));
    expect(screen.getByRole('dialog', { name: 'Your details' })).toBeInTheDocument();
  });
});

describe('WebNotifications', () => {
  it('changes a channel and saves it; safety stays always on', async () => {
    const prefs = { pushEnabled: true, emailEnabled: false, remindersEnabled: true, pickupLocationEnabled: false, ayushHistoryEnabled: false, timezone: 'Asia/Kolkata', quietStart: '23:00', quietEnd: '07:00' };
    serve({ '/notifications/preferences': (_path: string, init?: RequestInit) => (init?.method === 'PUT' ? JSON.parse(String(init.body)) : prefs) });
    render(<WebNotificationsRoute device={null} />);
    await settle();
    expect(screen.getAllByText('Always on').length).toBe(1);
    const email = screen.getByRole('switch', { name: 'Email' });
    expect(email).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(email);
    expect(email).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await settle();
    const put = api.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put && JSON.parse(String(put[1]?.body))).toMatchObject({ emailEnabled: true, pickupLocationEnabled: false });
  });

  it('draws each category with its channels, keeps safety on, and starts offers off', async () => {
    const prefs = {
      pushEnabled: true, emailEnabled: true, remindersEnabled: true, pickupLocationEnabled: false, ayushHistoryEnabled: false,
      timezone: 'Asia/Kolkata', quietStart: '23:00', quietEnd: '07:00', marketingOptIn: false,
      channels: { SAFETY: ['PUSH', 'WHATSAPP', 'EMAIL'], ORDERS: ['PUSH'] },
      categories: [{ key: 'SAFETY', channels: ['PUSH', 'WHATSAPP', 'EMAIL'], locked: true }, { key: 'ORDERS', channels: ['PUSH'], locked: false }],
    };
    serve({ '/notifications/preferences': (_path: string, init?: RequestInit) => (init?.method === 'PUT' ? { success: true } : prefs) });
    render(<WebNotificationsRoute device={null} />);
    await settle();
    expect(screen.getByRole('button', { name: 'App for Safety & account' })).toHaveAttribute('aria-pressed', 'true');
    const orders = screen.getByRole('button', { name: 'App for Orders' });
    fireEvent.click(orders);
    expect(orders).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: /Lock screen preview for Orders: Student Kare, You have an order update/ })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Partner offers' })).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await settle();
    const put = api.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put && JSON.parse(String(put[1]?.body))).toMatchObject({ channels: { ORDERS: [] }, marketingOptIn: false });
  });
});

describe('WebShop, search and product', () => {
  const catalog = (path: string) => {
    const q = new URL(path, 'http://x').searchParams;
    const all = [item('a', { name: 'Vitamin D3' }), item('b', { kind: 'lab', name: 'Vitamin B12 Test', stock: 0 }), item('c', { name: 'Rx tablet', requiresPrescription: true })];
    const list = all.filter((entry) => !q.get('kind') || entry.kind === q.get('kind')).filter((entry) => !q.get('query') || entry.name.toLowerCase().includes(String(q.get('query')).toLowerCase()));
    return { items: list.slice(0, Number(q.get('limit') ?? 50)), total: list.length };
  };

  it('lists the published catalogue with its honest note and adds to the cart', async () => {
    serve({ '/catalog': catalog });
    let units = 0;
    render(withCart(<><WebShopView /><CartProbe onCart={(n) => { units = n; }} /></>));
    await settle();
    expect(screen.getByText(/no placement is for sale/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add, Vitamin D3/i }));
    expect(units).toBe(1);
    expect(screen.getByRole('button', { name: /Add, Rx tablet/i })).toBeDisabled();
  });

  it('shows search results with server counts, listed by name and never ranked by health', async () => {
    window.history.pushState({}, '', '/shop?q=vitamin');
    serve({ '/catalog': catalog });
    render(withCart(<WebShopView />));
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'Everything for “vitamin”' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All\s*2$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Listed by name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Urgent\?/ })).toBeInTheDocument();
  });

  it('opens a product with no invented rating, and adds the chosen quantity', async () => {
    serve({ '/catalog': catalog, '/inventory/': { available: true, stock: 5 } });
    let units = 0;
    render(withCart(<><WebShopView /><CartProbe onCart={(n) => { units = n; }} /></>));
    await settle();
    fireEvent.click(screen.getByTestId('m2w-card-a-open'));
    expect(screen.getByRole('heading', { level: 1, name: 'Vitamin D3' })).toBeInTheDocument();
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/student reviews|Earn \d+ Kare points/);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'One more' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 to cart' }));
    expect(units).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: /Back to shop/ }));
    await settle();
    expect(screen.getByRole('heading', { name: 'Everything published' })).toBeInTheDocument();
  });
});

describe('WebCheckout', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Hyderabad' } });
    fireEvent.change(screen.getByLabelText('Pincode'), { target: { value: '500090' } });
  };

  it('fails closed: an unavailable item stops the order before it is created', async () => {
    serve({ '/cart/validate': { serviceable: true, items: [{ id: 'a', available: false, reason: 'Out of stock' }] } });
    render(withCart(<><Seed items={[item('a')]} /><WebCheckoutView /></>));
    await settle();
    fill();
    fireEvent.click(screen.getByRole('button', { name: /Continue to pay/ }));
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('Out of stock');
    expect(requested()).not.toContain('/orders');
  });

  it('fails closed when validation itself cannot run', async () => {
    serve({ '/cart/validate': new Error('Network down') });
    render(withCart(<><Seed items={[item('a')]} /><WebCheckoutView /></>));
    await settle();
    fill();
    fireEvent.click(screen.getByRole('button', { name: /Continue to pay/ }));
    await settle();
    expect(requested()).not.toContain('/orders');
  });

  it('creates the order once with an idempotency key, then hands over to the pay step', async () => {
    serve({ '/cart/validate': { serviceable: true, items: [{ id: 'a', available: true, reason: '' }] }, '/orders': order('new0000000', 'REQUESTED') });
    render(withCart(<><Seed items={[item('a')]} /><WebCheckoutView /></>));
    await settle();
    expect(screen.getByText('Your cart · 1 item')).toBeInTheDocument();
    expect(screen.getByText(/Paying confers no access to anyone’s records/)).toBeInTheDocument();
    fill();
    fireEvent.click(screen.getByRole('button', { name: /Continue to pay/ }));
    await settle();
    const post = api.mock.calls.find(([path]) => path === '/orders');
    expect((post?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBeTruthy();
    expect(screen.getByText('pay step')).toBeInTheDocument();
  });

  it('empty cart: says so and offers the shop', async () => {
    render(withCart(<WebCheckoutView />));
    fireEvent.click(screen.getByRole('button', { name: 'Keep exploring' }));
    expect(go).toHaveBeenCalledWith('shop');
  });
});
