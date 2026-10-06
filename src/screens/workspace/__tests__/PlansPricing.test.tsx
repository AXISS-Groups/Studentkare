import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BillingPlan } from '../../../data/datasets/billing';
import type { RoutePath } from '../../../lib/workflowRouting';

// Behaviour of Super Admin → Plans & pricing (/admin/plans) and Change a plan price
// (/admin/price-fix). Only the HTTP layer is mocked, keyed by request path, so these
// tests hold for any implementation of the screens.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => apiAnswers[path]?.() ?? new Promise(() => undefined));
const navigate = vi.fn();

vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
vi.mock('../../../lib/workflowRouting', async importOriginal => ({ ...(await importOriginal<typeof import('../../../lib/workflowRouting')>()), navigate: (path: string) => navigate(path) }));
vi.mock('../../../theme/theme', async () => {
  const { lightTokens } = await import('../../../theme/tokens/tokens');
  return { useTheme: () => ({ mode: 'light', isDark: false, tokens: lightTokens, setTheme: vi.fn(), toggleTheme: vi.fn() }) };
});

import { superAdminScreen } from '../admin/SuperAdminScreens';

const PLANS = '/billing/plans'; // was '/plans', which the backend answers 404: see the Plans migration
const plan = (id: BillingPlan['id'], overrides: Partial<BillingPlan> = {}): BillingPlan => ({ id, name: id, price: 'Free', period: 'forever', audience: 'student', benefits: [], description: '', ...overrides });
const FREE = plan('FREE', { name: 'Free Student Account', price: 'Free', period: 'forever', benefits: ['Personal health records', 'Self-care tools'], description: 'Every account starts free.' });
const PLUS = plan('STUDENT_PLUS', { name: 'Student Plus', price: 1499, period: 'per year', benefits: ['Priority support'], description: 'Optional benefits pass.' });
const catalog = (plans: BillingPlan[], checkoutAvailable = false) => ({ plans, checkoutAvailable, publicKey: '' });

const answer = (value: unknown) => { apiAnswers[PLANS] = () => Promise.resolve(value); };
const fail = (message: string) => { apiAnswers[PLANS] = () => Promise.reject(new Error(message)); };
const paths = () => apiRequest.mock.calls.map(([path]) => path);
const show = (route: RoutePath) => {
  const element = superAdminScreen(route);
  if (!element) throw new Error(`No screen for ${route}`);
  return render(element);
};

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
  navigate.mockReset();
});

describe('Plans & pricing', () => {
  it('is loading at first, and asks for the plans exactly once', () => {
    show('admin/plans');
    expect(screen.getByRole('heading', { level: 2, name: 'Plans & pricing' })).toBeInTheDocument();
    expect(screen.getByText('Loading plans…')).toHaveAttribute('role', 'status');
    expect(paths()).toEqual([PLANS]);
  });

  it('shows each plan: name, Published tag, price, period, description and benefits, in order', async () => {
    answer(catalog([FREE, PLUS]));
    show('admin/plans');
    const cards = await screen.findAllByRole('article');
    expect(cards.map(card => within(card).getByRole('heading', { level: 3 }).textContent)).toEqual(['Free Student Account', 'Student Plus']);
    expect(within(cards[0]).getByText('Published')).toHaveClass('sk-admin-tag', 'is-positive');
    expect(cards[0].querySelector('.sk-admin-plan-price')).toHaveTextContent('Free forever');
    expect(cards[1].querySelector('.sk-admin-plan-price strong')).toHaveTextContent('₹1,499');
    expect(cards[1].querySelector('.sk-admin-plan-price span')).toHaveTextContent('per year');
    expect(cards[0]).toHaveTextContent('Every account starts free.');
    expect(within(cards[0]).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Personal health records', 'Self-care tools']);
    expect(within(cards[1]).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Priority support']);
    expect(paths()).toEqual([PLANS]);
  });

  it('says whether online checkout is configured', async () => {
    answer(catalog([PLUS], false));
    const { unmount } = show('admin/plans');
    expect(await screen.findByText('Online checkout is not configured, so paid plans cannot be bought yet.')).toBeInTheDocument();
    unmount();
    answer(catalog([PLUS], true));
    show('admin/plans');
    expect(await screen.findByText('Online checkout is configured.')).toBeInTheDocument();
  });

  it('shows the empty state when no plans are published', async () => {
    answer(catalog([]));
    show('admin/plans');
    expect(await screen.findByText('No plans published yet.')).toBeInTheDocument();
    expect(screen.getByText('Plans will appear here once they are published.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('shows an error, and Try again asks for the plans once more', async () => {
    fail('Not Found');
    show('admin/plans');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load plans & pricing');
    expect(alert).toHaveTextContent('Not Found');
    answer(catalog([PLUS]));
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Student Plus' })).toBeInTheDocument();
    expect(paths()).toEqual([PLANS, PLANS]);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps its two empty panels, and offers only “Change a price”', async () => {
    answer(catalog([PLUS]));
    show('admin/plans');
    await screen.findByRole('article');
    expect(screen.getByText('No surface checks reported.')).toBeInTheDocument();
    expect(screen.getByText('No price changes recorded.')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Change a price']);
    fireEvent.click(screen.getByRole('button', { name: 'Change a price' }));
    expect(navigate).toHaveBeenCalledWith('admin/price-fix');
  });

  it('cancels the request when the screen goes', () => {
    apiAnswers[PLANS] = () => new Promise(() => undefined);
    const { unmount } = show('admin/plans');
    const signal = apiRequest.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});

describe('Change a plan price', () => {
  it('is read-only: loading, then current prices with their period, and only a way back', async () => {
    answer(catalog([FREE, PLUS]));
    show('admin/price-fix');
    expect(screen.getByRole('heading', { level: 2, name: 'Change a plan price' })).toBeInTheDocument();
    expect(screen.getByText('Loading prices…')).toBeInTheDocument();
    const prices = await screen.findByRole('region', { name: '2 · Current prices' });
    await waitFor(() => expect(within(prices).getAllByRole('listitem')).toHaveLength(2));
    expect(within(prices).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Free Student AccountFree', 'Student Plus₹1,499 per year']);
    expect(screen.getByRole('note')).toHaveTextContent('Read-only.');
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['← Plans & pricing']);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '← Plans & pricing' }));
    expect(navigate).toHaveBeenCalledWith('admin/plans');
    expect(paths()).toEqual([PLANS]);
  });

  it('shows the empty state, and an error with Try again', async () => {
    answer(catalog([]));
    const { unmount } = show('admin/price-fix');
    expect(await screen.findByText('No plans published yet.')).toBeInTheDocument();
    expect(screen.getByText('Published plans and their prices will appear here.')).toBeInTheDocument();
    unmount();
    apiRequest.mockClear();
    fail('Not Found');
    show('admin/price-fix');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load prices');
    answer(catalog([PLUS]));
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('₹1,499 per year')).toBeInTheDocument();
    expect(paths()).toEqual([PLANS, PLANS]);
  });
});
