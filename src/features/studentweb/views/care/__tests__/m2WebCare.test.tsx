import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

const state = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/design-system/motion')>()), useReducedMotion: () => state.reduced }));
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, status: 'ready' }) }));
// The booking dialog has its own tests (slots, 409, request); here it records what it was opened with.
vi.mock('@/screens/workspace/AppointmentsPanel', () => ({
  BookAppointmentDialog: ({ initialItemId, onDone, onClose }: { initialItemId?: string; onDone: () => void; onClose: () => void }) => (
    <div role="dialog" aria-label="Book an appointment">
      <span>booking {initialItemId}</span>
      <button type="button" onClick={onDone}>request sent</button>
      <button type="button" onClick={onClose}>close</button>
    </div>
  ),
}));

import { apiRequest } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import { BrowserRouter } from '@/core/navigation';
import { LiveCartProvider } from '@/data/contexts/LiveCartContext';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { axeViolations, describeViolations } from '@/test/axe';
import { WebCareView } from '../WebCareView';
import { PublicCarePage } from '../PublicCarePage';

const api = vi.mocked(apiRequest);
const go = vi.mocked(navigate);

const later = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const consult = (id: string, extra: Partial<LiveCatalogItem> = {}): LiveCatalogItem => ({
  id, providerId: 'p', kind: 'consultation', name: `Consult ${id}`, brand: 'Dr. Test', category: 'general-care', description: '', pack: '15 min video',
  pricePaise: 29900, mrpPaise: 29900, stock: 0, active: true, requiresPrescription: false, preparation: '', ...extra,
});
const CONSULTS = [
  consult('gp', { name: 'General medicine', brand: 'Dr. Meera Rao', description: 'A video consult with a campus doctor.', preparation: 'Keep your reports handy.' }),
  consult('derm', { name: 'Dermatology', brand: 'Dr. Arjun Das', pricePaise: 49900, mrpPaise: 49900 }),
];
const SLOTS: Record<string, unknown> = {
  '/appointments/availability?catalogItemId=gp': { slots: [{ id: 's1', slotStart: later(1), slotEnd: later(1.25), capacity: 1, booked: 0, available: 1 }] },
  '/appointments/availability?catalogItemId=derm': { slots: [{ id: 's2', slotStart: later(30), slotEnd: later(30.25), capacity: 1, booked: 1, available: 0 }] },
};

type Routes = Record<string, unknown>;
function serve(routes: Routes) {
  api.mockImplementation((path: string) => {
    const key = Object.keys(routes).sort((a, b) => b.length - a.length).find((prefix) => path.startsWith(prefix));
    if (!key) return Promise.reject(new Error(`unexpected ${path}`));
    const value = routes[key];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}
const requested = () => api.mock.calls.map(([path]) => String(path));
const settle = async () => { await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }); };
const withCart = (ui: React.ReactElement) => <BrowserRouter><LiveCartProvider>{ui}</LiveCartProvider></BrowserRouter>;
const signedIn = () => serve({ '/catalog': { items: CONSULTS, total: 2 }, ...SLOTS });

beforeEach(() => {
  api.mockReset(); go.mockReset();
  state.reduced = true;
  window.history.pushState({}, '', '/care');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('doctor consults (Mobile 2.0 web), signed in', () => {
  it('draws the hero, the doctors with their next free time and the honest gaps, reading nothing clinical', async () => {
    signedIn();
    render(withCart(<WebCareView />));
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'Talk to a doctor from your room' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Care services' })).toBeInTheDocument();
    expect(screen.getByTestId('m2wc-open-today')).toHaveTextContent('1 with a slot today');
    expect(within(screen.getByTestId('m2wc-doc-gp')).getByText(/^Free at /)).toBeInTheDocument();
    expect(within(screen.getByTestId('m2wc-doc-derm')).getByText('No open slot yet')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Free follow-up, Not available yet' })).toBeInTheDocument();
    // No invented doctor details: registration numbers, years and languages are not in the data.
    expect(document.body.textContent).not.toMatch(/Reg\. no\.|\d+ yrs|years of experience|English, Telugu/);
    // Only the catalogue and availability are read (Rule L); the concern chip never reaches the server.
    fireEvent.click(screen.getByRole('button', { name: 'Fever' }));
    expect(requested().every((path) => path.startsWith('/catalog') || path.startsWith('/appointments/availability'))).toBe(true);
  });

  it('Consult now, a card and the summary open the booking dialog with that consultation; done goes to appointments', async () => {
    signedIn();
    render(withCart(<WebCareView />));
    await settle();
    fireEvent.click(screen.getByTestId('m2wc-now'));
    expect(screen.getByRole('dialog')).toHaveTextContent('booking gp');
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Book a slot with Dr. Arjun Das, Dermatology' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('booking derm');
    fireEvent.click(screen.getByRole('button', { name: 'request sent' }));
    expect(go).toHaveBeenCalledWith('appointments');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the sticky summary shows the soonest, then the picked consultation, price before booking', async () => {
    signedIn();
    render(withCart(<WebCareView />));
    await settle();
    const summary = screen.getByTestId('m2wc-summary');
    expect(within(summary).getByText('Dr. Meera Rao')).toBeInTheDocument();
    expect(within(summary).getByText('₹299')).toBeInTheDocument();
    expect(within(summary).getByText('Keep your reports handy.')).toBeInTheDocument();
    expect(within(summary).getByText(/No payment is collected here/)).toBeInTheDocument();
    const details = screen.getByRole('button', { name: 'Show Dr. Arjun Das, Dermatology in the summary' });
    fireEvent.click(details);
    expect(details).toHaveAttribute('aria-pressed', 'true');
    expect(within(summary).getByText('Dr. Arjun Das')).toBeInTheDocument();
    expect(within(summary).getByText('₹499')).toBeInTheDocument();
    fireEvent.click(within(summary).getByTestId('m2wc-summary-book'));
    expect(screen.getByRole('dialog')).toHaveTextContent('booking derm');
  });

  it('pay ahead puts the consultation in the cart, and the cart opens the checkout (pay step)', async () => {
    signedIn();
    render(withCart(<WebCareView />));
    await settle();
    expect(screen.queryByTestId('m2w-cart')).toBeNull();
    fireEvent.click(screen.getByTestId('m2wc-pay-ahead'));
    expect(screen.getByRole('status')).toHaveTextContent('General medicine');
    expect(within(screen.getByTestId('m2wc-summary')).getByText('In your cart')).toBeInTheDocument();
    const rail = screen.getByTestId('m2w-cart');
    expect(rail).toHaveTextContent('General medicine');
    fireEvent.click(within(rail).getByRole('button', { name: /Go to checkout/ }));
    expect(go).toHaveBeenCalledWith('checkout');
  });

  it('shows the counsellor note with the crisis lines for stress, sleep and low mood only, in the same words', async () => {
    signedIn();
    render(withCart(<WebCareView />));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Fever' }));
    expect(screen.getByRole('button', { name: 'Fever' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('m2wc-mind')).toBeNull();
    for (const name of ['Stress or anxiety', 'Sleep trouble', 'Low mood']) {
      fireEvent.click(screen.getByRole('button', { name }));
      const note = screen.getByTestId('m2wc-mind');
      expect(note).toHaveTextContent('The campus counsellor is free and private. Need someone right now? Call Tele-MANAS, any time.');
      expect(within(note).getByTestId('m2wc-crisis')).toHaveTextContent('Free, any time:');
      expect(within(note).getByRole('button', { name: /112/ })).toBeInTheDocument();
      expect(within(note).getByRole('button', { name: /Tele-MANAS/ })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Low mood' }));
    expect(screen.queryByTestId('m2wc-mind')).toBeNull();
  });

  it('opens one answer at a time, and Student Plus opens billing', async () => {
    signedIn();
    render(withCart(<WebCareView />));
    await settle();
    const first = screen.getByRole('button', { name: 'How soon can I talk to a doctor?' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Is my consult private?' }));
    expect(first).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByTestId('m2wc-plus'));
    expect(go).toHaveBeenCalledWith('billing');
  });

  it('loading: a skeleton, no summary actions', () => {
    api.mockImplementation(() => new Promise(() => undefined));
    render(withCart(<WebCareView />));
    expect(screen.getByRole('progressbar', { name: 'Loading doctors…' })).toBeInTheDocument();
    expect(screen.queryByTestId('m2wc-summary-book')).toBeNull();
    expect(screen.getByText('Pick a doctor to see the price and the next free time here.')).toBeInTheDocument();
  });

  it('error: calm copy and a retry that loads again', async () => {
    serve({ '/catalog': new Error('boom') });
    render(withCart(<WebCareView />));
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('Doctors didn’t load');
    signedIn();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(screen.getByTestId('m2wc-doc-gp')).toBeInTheDocument();
  });

  it('empty: says no doctor is taking bookings and offers no booking', async () => {
    serve({ '/catalog': { items: [], total: 0 } });
    render(withCart(<WebCareView />));
    await settle();
    expect(screen.getByTestId('m2wc-empty')).toHaveTextContent('No doctor is taking bookings yet.');
    expect(screen.queryByTestId('m2wc-now')).toBeNull();
    expect(screen.queryByTestId('m2wc-summary-book')).toBeNull();
  });

  it('offline: says so; the crisis lines still work', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    serve({ '/catalog': new Error('offline') });
    render(withCart(<WebCareView />));
    await settle();
    expect(screen.getByText('You’re offline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sleep trouble' }));
    expect(screen.getByTestId('m2wc-crisis')).toBeInTheDocument();
  });

  it('has no accessibility violations (crisis note open)', async () => {
    signedIn();
    const { container } = render(withCart(<WebCareView />));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Stress or anxiety' }));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('doctor consults (Mobile 2.0 web), signed out', () => {
  it('sits in the public header and footer, reads no slots, and asks to sign in to book or check out', async () => {
    serve({ '/catalog': { items: CONSULTS, total: 2 } });
    render(withCart(<PublicCarePage signedIn={false} />));
    await settle();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(requested().some((path) => path.startsWith('/appointments'))).toBe(false);
    expect(within(screen.getByTestId('m2wc-doc-gp')).getByText('Sign in to see free times')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Book a slot with Dr. Meera Rao, General medicine' }));
    expect(go).toHaveBeenCalledWith('login', 'care');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(screen.getByTestId('m2wc-summary')).getByTestId('m2wc-summary-book')).toHaveTextContent('Sign in to book');
    fireEvent.click(screen.getByTestId('m2wc-plus'));
    expect(go).toHaveBeenCalledWith('pricing');
    fireEvent.click(screen.getByTestId('m2wc-pay-ahead'));
    const rail = screen.getByTestId('m2w-cart');
    fireEvent.click(within(rail).getByRole('button', { name: /Sign in to continue/ }));
    expect(go).toHaveBeenCalledWith('login', 'checkout');
  });

  it('has no accessibility violations', async () => {
    serve({ '/catalog': { items: CONSULTS, total: 2 } });
    const { container } = render(withCart(<PublicCarePage signedIn={false} />));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Low mood' }));
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('motion', () => {
  it('the stylesheet stops the live dot, the wave and the chip transitions under reduced motion', () => {
    const css = readFileSync(join(__dirname, '..', 'm2webcare.css'), 'utf8');
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/\.sk-m2wc-live__dot::after, \.sk-m2wc \.sk-m2wc-wave span \{ animation: none; \}/);
    expect(block).toMatch(/\.sk-m2wc-chip, \.sk-m2wc \.sk-m2wc-faq__q svg \{ transition: none; \}/);
  });

  it('rise-in and lift come from the shop stylesheet, which turns them off under reduced motion', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'shop', 'm2webshop.css'), 'utf8');
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/\.sk-m2w-rise, \.sk-m2w \.sk-m2w-blister \{ animation: none; \}/);
    expect(block).toMatch(/\.sk-m2w-lift \{ transition: none; \}/);
  });

  it('the service rail draws the same under reduced motion and with motion allowed', async () => {
    signedIn();
    render(withCart(<WebCareView />));
    await settle();
    expect(screen.getByTestId('m2wc-rail')).toBeInTheDocument();
    cleanup();
    state.reduced = false;
    signedIn();
    render(withCart(<WebCareView />));
    await settle();
    expect(screen.getByTestId('m2wc-rail')).toBeInTheDocument();
  });
});
