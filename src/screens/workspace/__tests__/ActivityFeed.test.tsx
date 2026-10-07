import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { displayDate } from '../../../data/workflowTypes';
import type { OpsFeedEvent } from '../../../data/workflowTypes';

// Behaviour of Super Admin → Operations & SOS → Activity. Only the HTTP layer is mocked,
// keyed by request path, so these tests hold for any implementation of the screen.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => apiAnswers[path]?.() ?? new Promise(() => undefined));

vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));

import { ActivityFeedView as Subject } from '../../../features/admin/views/ActivityFeedView';

const OUTSTANDING = '/ops/feed?limit=50&unacknowledgedOnly=true';
const EVERYTHING = '/ops/feed?limit=50';
const COUNTS = '/ops/feed/counts';
const event = (id: string, overrides: Partial<OpsFeedEvent> = {}): OpsFeedEvent => ({
  id, kind: 'PRESCRIPTION_ISSUED', domain: 'CLINICAL', severity: 'INFO', actorId: 'a1', actorRole: 'NMC_DOCTOR', subjectId: 's1', providerId: '',
  resourceType: 'prescription', resourceId: `r-${id}`, summary: `Event ${id}`, createdAt: 1790000000, acknowledgedAt: null, acknowledgedBy: '', ...overrides,
});
const feedOf = (items: OpsFeedEvent[], critical = 0) => ({ items, total: items.length, critical, scope: 'platform' });
const counts = { domains: { CLINICAL: 2, PHARMACY: 1, LAB: 0, SAFETY: 3 } };
const paths = () => apiRequest.mock.calls.map(([path]) => path);
const answer = (path: string, value: unknown) => { apiAnswers[path] = () => Promise.resolve(value); };
const metricCards = () => Array.from(document.querySelectorAll('.wf-metric-card'));

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
});

describe('Activity', () => {
  it('loads the outstanding feed and the counts, and shows each event', async () => {
    answer(OUTSTANDING, feedOf([
      event('e1', { severity: 'CRITICAL', domain: 'SAFETY', kind: 'SOS_RAISED', summary: 'SOS raised on campus', actorRole: 'STUDENT' }),
      event('e2', { severity: 'ATTENTION', summary: 'Prescription waiting', actorRole: '' }),
      event('e3', { summary: 'Order delivered', acknowledgedAt: 1790000100, acknowledgedBy: 'ops' }),
    ], 1));
    answer(COUNTS, counts);
    render(<Subject />);
    expect(screen.getAllByRole('status').map(node => node.textContent)).toEqual(['Loading your information…', 'Loading your information…']);
    expect(paths()).toEqual([OUTSTANDING, COUNTS]);
    const sos = (await screen.findByRole('heading', { name: 'SOS raised on campus' })).closest('article') as HTMLElement;
    expect(sos).toHaveTextContent('SAFETY · Sos raised');
    expect(sos).toHaveTextContent(`${displayDate(new Date(1790000000 * 1000).toISOString())} · by student`);
    expect(within(sos).getByText('CRITICAL')).toHaveClass('wf-status', 'status-declined');
    expect(within(sos).getByRole('button', { name: 'Mark handled: SOS raised on campus' })).toBeEnabled();
    const waiting = screen.getByRole('heading', { name: 'Prescription waiting' }).closest('article') as HTMLElement;
    expect(within(waiting).getByText('ATTENTION')).toHaveClass('status-requested');
    expect(waiting).not.toHaveTextContent(' · by ');
    const delivered = screen.getByRole('heading', { name: 'Order delivered' }).closest('article') as HTMLElement;
    expect(within(delivered).getByText('INFO')).toHaveClass('status-accepted');
    expect(delivered).toHaveTextContent('Handled');
    expect(within(delivered).queryByRole('button')).toBeNull();
    expect(screen.getByText(/1 critical event needs attention\./)).toBeInTheDocument();
  });

  it('shows a card for each domain with outstanding events, in a fixed order', async () => {
    answer(OUTSTANDING, feedOf([]));
    answer(COUNTS, counts);
    render(<Subject />);
    await waitFor(() => expect(metricCards()).toHaveLength(3));
    expect(metricCards().map(card => card.textContent)).toEqual(['Clinical2Outstanding', 'Pharmacy1Outstanding', 'Safety3Outstanding']);
    expect(metricCards().every(card => card.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('filters by domain from its card, and clears the filter', async () => {
    answer(OUTSTANDING, feedOf([]));
    answer(COUNTS, counts);
    answer('/ops/feed?limit=50&domain=PHARMACY&unacknowledgedOnly=true', feedOf([event('p1', { domain: 'PHARMACY', summary: 'Dispense ready' })]));
    render(<Subject />);
    await waitFor(() => expect(metricCards()).toHaveLength(3));
    fireEvent.click(metricCards()[1]);
    expect(await screen.findByRole('heading', { name: 'Dispense ready' })).toBeInTheDocument();
    expect(metricCards()[1]).toHaveAttribute('aria-pressed', 'true');
    expect(metricCards()[1]).toHaveClass('is-selected');
    fireEvent.click(screen.getByRole('button', { name: 'Clear “pharmacy” filter' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Clear “/ })).toBeNull());
    fireEvent.click(metricCards()[1]);
    fireEvent.click(metricCards()[1]);
    expect(paths()).toEqual([OUTSTANDING, COUNTS, '/ops/feed?limit=50&domain=PHARMACY&unacknowledgedOnly=true', OUTSTANDING, '/ops/feed?limit=50&domain=PHARMACY&unacknowledgedOnly=true', OUTSTANDING]);
  });

  it('keeps the selected domain’s card when its count drops to zero', async () => {
    answer(OUTSTANDING, feedOf([]));
    answer(COUNTS, counts);
    answer('/ops/feed?limit=50&domain=PHARMACY&unacknowledgedOnly=true', feedOf([event('p1', { domain: 'PHARMACY' })]));
    answer('/ops/feed/p1/acknowledge', {});
    render(<Subject />);
    await waitFor(() => expect(metricCards()).toHaveLength(3));
    fireEvent.click(metricCards()[1]);
    answer(COUNTS, { domains: { CLINICAL: 2, PHARMACY: 0, SAFETY: 3 } });
    fireEvent.click(await screen.findByRole('button', { name: /Mark handled/ }));
    await waitFor(() => expect(paths().filter(path => path === COUNTS)).toHaveLength(2));
    await waitFor(() => expect(metricCards().map(card => card.textContent)).toEqual(['Clinical2Outstanding', 'Pharmacy0Outstanding', 'Safety3Outstanding']));
  });

  it('switches between needs attention and everything, without refetching an unchanged filter', async () => {
    answer(OUTSTANDING, feedOf([]));
    answer(EVERYTHING, feedOf([]));
    answer(COUNTS, counts);
    render(<Subject />);
    const attention = screen.getByRole('button', { name: 'Needs attention' });
    const everything = screen.getByRole('button', { name: 'Everything' });
    expect(attention).toHaveAttribute('aria-pressed', 'true');
    expect(everything).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(attention);
    expect(paths()).toEqual([OUTSTANDING, COUNTS]);
    fireEvent.click(everything);
    expect(everything).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('No activity recorded yet.')).toBeInTheDocument();
    fireEvent.click(everything);
    fireEvent.click(attention);
    expect(await screen.findByText('Nothing needs attention.')).toBeInTheDocument();
    expect(paths()).toEqual([OUTSTANDING, COUNTS, EVERYTHING, OUTSTANDING]);
  });

  it('combines the domain and everything filters in one request', async () => {
    answer(OUTSTANDING, feedOf([]));
    answer(COUNTS, counts);
    render(<Subject />);
    await waitFor(() => expect(metricCards()).toHaveLength(3));
    fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
    fireEvent.click(metricCards()[2]);
    expect(paths()).toEqual([OUTSTANDING, COUNTS, EVERYTHING, '/ops/feed?limit=50&domain=SAFETY']);
  });

  it('shows the empty states for each filter', async () => {
    answer(OUTSTANDING, feedOf([]));
    answer(EVERYTHING, feedOf([]));
    answer(COUNTS, { domains: {} });
    render(<Subject />);
    expect(await screen.findByText('Nothing needs attention.')).toBeInTheDocument();
    expect(screen.getByText('Every event in your scope has been handled. Switch to “Everything” to see the history.')).toBeInTheDocument();
    expect(metricCards()).toHaveLength(0);
    expect(screen.queryByText(/critical/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
    expect(await screen.findByText('No activity recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('Orders, prescriptions and fulfilment activity will appear here as it happens.')).toBeInTheDocument();
  });

  it('shows each load error on its own, and Try again requests that one again', async () => {
    apiAnswers[OUTSTANDING] = () => Promise.reject(new Error('Feed timed out'));
    apiAnswers[COUNTS] = () => Promise.reject(new Error('Counts timed out'));
    render(<Subject />);
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    const [countsAlert, feedAlert] = screen.getAllByRole('alert');
    expect(countsAlert).toHaveTextContent('Counts timed out');
    expect(feedAlert).toHaveTextContent('Feed timed out');
    answer(OUTSTANDING, feedOf([event('e1')]));
    fireEvent.click(within(feedAlert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Event e1' })).toBeInTheDocument();
    expect(screen.getByText('Counts timed out')).toBeInTheDocument();
    answer(COUNTS, counts);
    fireEvent.click(within(screen.getByText('Counts timed out').closest('[role=alert]') as HTMLElement).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(metricCards()).toHaveLength(3));
    expect(paths()).toEqual([OUTSTANDING, COUNTS, OUTSTANDING, COUNTS]);
  });

  it('marks an event handled, then reloads the feed and the counts', async () => {
    answer(OUTSTANDING, feedOf([event('e1'), event('e2')]));
    answer(COUNTS, counts);
    answer('/ops/feed/e1/acknowledge', {});
    render(<Subject />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark handled: Event e1' }));
    await waitFor(() => expect(paths()).toEqual([OUTSTANDING, COUNTS, '/ops/feed/e1/acknowledge', OUTSTANDING, COUNTS]));
    expect(apiRequest).toHaveBeenCalledWith('/ops/feed/e1/acknowledge', { method: 'POST' });
  });

  it('disables every Mark handled button while one is being handled', async () => {
    answer(OUTSTANDING, feedOf([event('e1'), event('e2')]));
    answer(COUNTS, counts);
    render(<Subject />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark handled: Event e1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark handled: Event e2' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Mark handled: Event e1' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mark handled: Event e2' }));
    expect(paths().filter(path => path.endsWith('/acknowledge'))).toEqual(['/ops/feed/e1/acknowledge']);
  });

  it('shows a failed acknowledgement and does not reload', async () => {
    answer(OUTSTANDING, feedOf([event('e1')]));
    answer(COUNTS, counts);
    apiAnswers['/ops/feed/e1/acknowledge'] = () => Promise.reject(new Error('Already handled by someone else'));
    render(<Subject />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark handled: Event e1' }));
    expect(await screen.findByText('Already handled by someone else')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark handled: Event e1' })).toBeEnabled();
    expect(paths()).toEqual([OUTSTANDING, COUNTS, '/ops/feed/e1/acknowledge']);
  });
});
