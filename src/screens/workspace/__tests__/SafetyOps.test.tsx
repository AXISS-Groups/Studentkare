import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { OpsFeed, OpsFeedEvent } from '../../../data/workflowTypes';
import type { RoutePath } from '../../../lib/workflowRouting';

// Behaviour of Super Admin → Operations & SOS → Safety events (/admin/ops), and of the
// open-safety status in its header. Only the HTTP layer is mocked, keyed by request path,
// so these tests hold for any implementation of the screen.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => apiAnswers[path]?.() ?? new Promise(() => undefined));

vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
vi.mock('../../../theme/theme', async () => {
  const { lightTokens } = await import('../../../theme/tokens/tokens');
  return { useTheme: () => ({ mode: 'light', isDark: false, tokens: lightTokens, setTheme: vi.fn(), toggleTheme: vi.fn() }) };
});

import { superAdminScreen } from '../admin/SuperAdminScreens';

const SAFETY = '/ops/feed?domain=SAFETY&limit=25';
const COUNTS = '/ops/feed/counts';
const event = (id: string, overrides: Partial<OpsFeedEvent> = {}): OpsFeedEvent => ({
  id, kind: 'SOS_RAISED', domain: 'SAFETY', severity: 'ATTENTION', actorId: 'a1', actorRole: 'STUDENT', subjectId: 's1', providerId: '',
  resourceType: 'sos', resourceId: `r-${id}`, summary: `Event ${id}`, createdAt: 1790000000, acknowledgedAt: null, acknowledgedBy: '', ...overrides,
});
const feedOf = (items: OpsFeedEvent[]): OpsFeed => ({ items, total: items.length, critical: 0, scope: 'all' });
const paths = () => apiRequest.mock.calls.map(([path]) => path);
const callsTo = (path: string) => paths().filter(requested => requested === path).length;
const answer = (path: string, value: unknown) => { apiAnswers[path] = () => Promise.resolve(value); };
const fail = (path: string, message: string) => { apiAnswers[path] = () => Promise.reject(new Error(message)); };
const show = (route: RoutePath = 'admin/ops') => {
  const element = superAdminScreen(route);
  if (!element) throw new Error(`No screen for ${route}`);
  return render(element);
};
const tiles = () => within(screen.getByRole('group', { name: 'Operations summary' })).getAllByRole('article');

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe('Safety events', () => {
  it('is loading at first, and asks for exactly the SAFETY feed, domain first', () => {
    show();
    expect(screen.getByText('Loading safety counts…')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Loading safety events…')).toHaveAttribute('role', 'status');
    expect(callsTo(SAFETY)).toBe(1);
    expect(paths()).not.toContain('/ops/feed?limit=25&domain=SAFETY');
    expect(paths().every(path => path === SAFETY || path === COUNTS)).toBe(true);
    expect(paths().some(path => path.includes('crisis-events'))).toBe(false);
  });

  it('shows each event: its kind, summary, time and acknowledgement state', async () => {
    answer(SAFETY, feedOf([
      event('e1', { kind: 'CRISIS_SIGNAL', severity: 'CRITICAL', summary: 'Crisis support opened' }),
      event('e2', { summary: 'SOS on campus' }),
      event('e3', { summary: '', acknowledgedAt: 1790000200, acknowledgedBy: 'staff' }),
    ]));
    answer(COUNTS, { domains: { SAFETY: 2 } });
    show();
    const table = await screen.findByRole('table', { name: 'Safety events' });
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Alert', 'Detail', 'Raised', 'State']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Crisis signal');
    expect(rows[0]).toHaveTextContent('Crisis support opened');
    expect(within(rows[0]).getByText('Open')).toHaveClass('sk-admin-tag', 'is-danger');
    expect(within(rows[1]).getByText('Open')).toHaveClass('sk-admin-tag', 'is-attention');
    expect(rows[2].querySelectorAll('td')[1]).toHaveTextContent('—');
    expect(within(rows[2]).getByText('Acknowledged')).toHaveClass('sk-admin-tag', 'is-neutral');
    expect(rows[0].querySelector('time')).toHaveAttribute('dateTime', new Date(1790000000 * 1000).toISOString());
    expect(screen.getByText(/never the student’s condition/)).toBeInTheDocument();
  });

  it('shows the empty state when there are no safety events', async () => {
    answer(SAFETY, feedOf([]));
    answer(COUNTS, { domains: {} });
    show();
    expect(await screen.findByText('No safety events yet.')).toBeInTheDocument();
    expect(screen.getByText('Safety events appear here as they are raised.')).toBeInTheDocument();
  });

  it('shows an error for the feed, and Try again asks for the feed once more', async () => {
    fail(SAFETY, 'Feed timed out');
    answer(COUNTS, { domains: {} });
    show();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load safety events');
    expect(alert).toHaveTextContent('Feed timed out');
    answer(SAFETY, feedOf([event('e1', { summary: 'Back again' })]));
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Loading safety events…')).toBeInTheDocument();
    expect(await screen.findByText('Back again')).toBeInTheDocument();
    expect(callsTo(SAFETY)).toBe(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Safety counts and the open-safety status', () => {
  it('fills the open-events tile and shows the header status, from /ops/feed/counts', async () => {
    answer(SAFETY, feedOf([]));
    answer(COUNTS, { domains: { SAFETY: 3, CLINICAL: 9 } });
    show();
    expect(await screen.findByText('3 open safety events')).toHaveClass('sk-admin-status', 'is-danger');
    expect(tiles()[0]).toHaveTextContent('Open safety events');
    expect(tiles()[0]).toHaveTextContent('3');
    expect(tiles().slice(1).every(tile => tile.textContent?.includes('Not reported'))).toBe(true);
  });

  it('asks for the counts once on /admin/ops: the tiles and the header share them', async () => {
    answer(SAFETY, feedOf([]));
    answer(COUNTS, { domains: { SAFETY: 2 } });
    show();
    expect(callsTo(COUNTS)).toBe(1);
    expect(await screen.findByText('2 open safety events')).toBeInTheDocument();
    expect(tiles()[0]).toHaveTextContent('2');
    expect(callsTo(COUNTS)).toBe(1);
  });

  it('a counts retry updates the tile and the header together', async () => {
    answer(SAFETY, feedOf([]));
    fail(COUNTS, 'Counts timed out');
    show();
    const alert = await screen.findByRole('alert');
    answer(COUNTS, { domains: { SAFETY: 4 } });
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('4 open safety events')).toBeInTheDocument();
    expect(tiles()[0]).toHaveTextContent('4');
    expect(callsTo(COUNTS)).toBe(2);
  });

  it('says “event” for one', async () => {
    answer(SAFETY, feedOf([]));
    answer(COUNTS, { domains: { SAFETY: 1 } });
    show();
    expect(await screen.findByText('1 open safety event')).toBeInTheDocument();
  });

  it('shows no header status while loading, when nothing is open, or when SAFETY is missing', async () => {
    answer(SAFETY, feedOf([]));
    show();
    expect(screen.queryByText(/open safety event/)).toBeNull();
    answer(COUNTS, { domains: { CLINICAL: 4 } });
    const { unmount } = show();
    await waitFor(() => expect(screen.getAllByRole('group', { name: 'Operations summary' }).length).toBeGreaterThan(0));
    expect(screen.queryByText(/open safety event/)).toBeNull();
    unmount();
  });

  it('shows a 0 tile when SAFETY is missing from the counts', async () => {
    answer(SAFETY, feedOf([]));
    answer(COUNTS, { domains: {} });
    show();
    await waitFor(() => expect(tiles()[0]).toHaveTextContent('0'));
  });

  it('shows an error for the counts, with no header status, and Try again loads them', async () => {
    answer(SAFETY, feedOf([]));
    fail(COUNTS, 'Counts timed out');
    show();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load safety counts');
    expect(alert).toHaveTextContent('Counts timed out');
    expect(screen.getByText('No safety events yet.')).toBeInTheDocument();
    expect(screen.queryByText(/open safety event/)).toBeNull();
    answer(COUNTS, { domains: { SAFETY: 2 } });
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(tiles()[0]).toHaveTextContent('2'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['admin/activity', 'admin/support', 'admin/requests'] as RoutePath[])('keeps the open-safety status in the header on %s', async route => {
    answer(COUNTS, { domains: { SAFETY: 2 } });
    show(route);
    expect(await screen.findByText('2 open safety events')).toBeInTheDocument();
    expect(callsTo(SAFETY)).toBe(0);
  });
});

describe('lifecycle', () => {
  it('cancels the requests in flight when the screen goes, and changes nothing afterwards', async () => {
    const settlers: ((value: unknown) => void)[] = [];
    apiAnswers[SAFETY] = () => new Promise(resolve => { settlers.push(resolve); });
    apiAnswers[COUNTS] = () => new Promise(resolve => { settlers.push(resolve); });
    const consoleError = vi.spyOn(console, 'error');
    const { unmount } = show();
    const signals = apiRequest.mock.calls.map(([, init]) => init?.signal);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every(signal => signal && !signal.aborted)).toBe(true);
    unmount();
    expect(signals.every(signal => signal?.aborted)).toBe(true);
    settlers.forEach(settle => settle({ items: [], total: 0, critical: 0, scope: 'all', domains: { SAFETY: 5 } }));
    await Promise.resolve();
    await Promise.resolve();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
