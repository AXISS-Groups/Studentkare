import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { FollowUpTask, StaffAppointment, WorkRequest } from '../../../data/workflowTypes';
import { displayDate, money } from '../../../data/workflowTypes';

// Behaviour of Super Admin → Operations & SOS → Provider requests (/admin/requests).
// Only the HTTP layer is mocked, keyed by request path, so these tests hold for any
// implementation of the screen.
const apiAnswers: Record<string, (init?: RequestInit) => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, init?: RequestInit) => apiAnswers[path]?.(init) ?? new Promise(() => undefined));
vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));

import { superAdminScreen } from '../admin/SuperAdminScreens';

const REQUESTS = '/work/requests?limit=15&offset=0';
const APPOINTMENTS = '/work/appointments';
const FOLLOWUPS = '/work/followups';

const request = (id: string, overrides: Partial<WorkRequest> = {}): WorkRequest => ({
  id, itemId: 'item-1', name: `Service ${id}`, kind: 'product', quantity: 2, pricePaise: 49900, status: 'REQUESTED',
  orderId: `order${id}-abcdef`, customer: `Customer ${id}`, contact: `${id}@example.test`,
  delivery: { mode: 'delivery', address: '1 Main Road', city: 'Hyderabad', pincode: '500090' }, requestedSlot: '', createdAt: 1790000000, ...overrides,
});
const appointment = (id: string, overrides: Partial<StaffAppointment> = {}): StaffAppointment => ({
  id: `appt${id}-0000-1111`, catalogItemId: 'consult-general', providerId: 'provider-0001-abcdef', slotStart: '2026-10-07T10:00:00', slotEnd: '2026-10-07T10:30:00',
  status: 'REQUESTED', createdAt: 1790000000, updatedAt: 1790000000, customer: `Patient ${id}`, contact: `${id}@example.test`, ...overrides,
});
const followUp = (id: string, overrides: Partial<FollowUpTask> = {}): FollowUpTask => ({
  id: `fup${id}-0000-1111`, orderId: 'order123-abcdef', note: `Call back ${id}`, status: 'OPEN', createdAt: 1790000000, resolvedAt: null, ...overrides,
});

const workCalls = () => apiRequest.mock.calls.filter(([path]) => path.startsWith('/work/'));
const workPaths = () => workCalls().map(([path]) => path);
const callsTo = (path: string) => apiRequest.mock.calls.filter(([called]) => called === path);
const answer = (path: string, value: unknown) => { apiAnswers[path] = () => Promise.resolve(value); };
const fail = (path: string, message: string) => { apiAnswers[path] = () => Promise.reject(new Error(message)); };
/** Holds the next answer for `path` until `release` is called. */
const hold = (path: string) => {
  let release: (value: unknown) => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  apiAnswers[path] = () => new Promise((resolve, rejectWith) => { release = resolve; reject = rejectWith; });
  return { release: (value: unknown = {}) => act(async () => { release(value); }), reject: (message: string) => act(async () => { reject(new Error(message)); }) };
};
const answerAll = (requests: WorkRequest[] = [], appointments: StaffAppointment[] = [], followUps: FollowUpTask[] = [], total?: number) => {
  answer(REQUESTS, total === undefined ? { items: requests } : { items: requests, total });
  answer(APPOINTMENTS, { items: appointments });
  answer(FOLLOWUPS, { items: followUps });
};
const show = () => render(<Suspense fallback={<p>Loading…</p>}>{superAdminScreen('admin/requests')}</Suspense>);
const card = (heading: string) => screen.getByRole('heading', { name: heading }).closest('article') as HTMLElement;
const tab = (name: string) => screen.getByRole('button', { name });
const openTab = async (name: 'Appointments' | 'Follow-ups') => { fireEvent.click(tab(name)); };
const topError = () => document.querySelector('.care-form-error');

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
});

describe('Work requests: loading', () => {
  it('requests the first page, the appointments and the follow-ups on open, in that order, with only the abort signal', async () => {
    answerAll([request('a')]);
    show();
    expect(screen.getByText('Loading your information…')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Service a' });
    expect(workPaths()).toEqual([REQUESTS, APPOINTMENTS, FOLLOWUPS]);
    workCalls().forEach(([, init]) => expect(Object.keys(init ?? {})).toEqual(['signal']));
  });

  it('shows the screen heading, the status filter and the three queue tabs, with service requests selected', async () => {
    answerAll();
    show();
    expect(screen.getByRole('heading', { name: 'Requests & fulfilment.' })).toBeInTheDocument();
    expect(screen.getByText('YOUR ASSIGNED CARE REQUESTS')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('ALL');
    expect(within(screen.getByLabelText('Staff queue')).getAllByRole('button').map(button => [button.textContent, button.getAttribute('aria-pressed')])).toEqual([
      ['Service requests', 'true'], ['Appointments', 'false'], ['Follow-ups', 'false'],
    ]);
  });
});

describe('Work requests: list', () => {
  it('shows each request with its order, item, status, account holder, amount, date and location', async () => {
    answerAll([
      request('a', { requestedSlot: '2026-10-08T09:00:00' }),
      request('b', { status: 'ACCEPTED', delivery: { mode: 'pickup', address: '', city: 'Pune', pincode: '411001' } }),
    ]);
    show();
    const a = await screen.findByRole('heading', { name: 'Service a' }).then(heading => heading.closest('article') as HTMLElement);
    expect(a).toHaveTextContent('REQUEST ORDERA-A');
    expect(within(a).getByText('REQUESTED')).toHaveClass('wf-status', 'status-requested');
    expect(a).toHaveTextContent('Customer a');
    expect(a).toHaveTextContent('a@example.test');
    expect(a).toHaveTextContent(`2 × ${money(49900)}`);
    expect(a).toHaveTextContent(displayDate(1790000000));
    expect(a).toHaveTextContent('Hyderabad · 500090');
    expect(a).toHaveTextContent('1 Main Road');
    expect(a).toHaveTextContent('Requested time');
    expect(a).toHaveTextContent(displayDate('2026-10-08T09:00:00'));
    const b = card('Service b');
    expect(within(b).getByText('ACCEPTED')).toHaveClass('status-accepted');
    expect(b).toHaveTextContent('Pune · 411001');
    expect(b).toHaveTextContent('Provider pickup');
    expect(b).not.toHaveTextContent('Requested time');
  });

  it('offers the next steps for each status', async () => {
    answerAll([
      request('requested'),
      request('product', { status: 'ACCEPTED', kind: 'product' }),
      request('lab', { status: 'ACCEPTED', kind: 'lab' }),
      request('dispatched', { status: 'DISPATCHED' }),
      request('completed', { status: 'COMPLETED' }),
      request('declined', { status: 'DECLINED' }),
    ]);
    show();
    await screen.findByRole('heading', { name: 'Service requested' });
    const actions = (name: string) => within(card(`Service ${name}`)).queryAllByRole('button').map(button => button.textContent);
    expect(actions('requested')).toEqual(['Accept request', 'Decline request']);
    expect(within(card('Service requested')).getByRole('button', { name: 'Accept request' })).toHaveClass('health-button', 'health-button-primary');
    expect(within(card('Service requested')).getByRole('button', { name: 'Decline request' })).not.toHaveClass('health-button-primary');
    expect(actions('product')).toEqual(['Mark dispatched']);
    expect(actions('lab')).toEqual(['Mark completed']);
    expect(actions('dispatched')).toEqual(['Mark completed']);
    expect(actions('completed')).toEqual([]);
    expect(actions('declined')).toEqual([]);
  });

  it('shows the empty state', async () => {
    answerAll([]);
    show();
    expect(await screen.findByText('No service requests assigned to you.')).toBeInTheDocument();
    expect(screen.getByText('Requests from your catalog will appear here for you to accept or decline.')).toBeInTheDocument();
  });

  it('shows a load error, and Try again requests the same page again and nothing else', async () => {
    fail(REQUESTS, 'Requests unavailable');
    answer(APPOINTMENTS, { items: [] });
    answer(FOLLOWUPS, { items: [] });
    show();
    const alert = (await screen.findByText('Requests unavailable')).closest('[role=alert]') as HTMLElement;
    expect(alert).toHaveTextContent('We couldn’t load this yet.');
    answer(REQUESTS, { items: [request('a')] });
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    await screen.findByRole('heading', { name: 'Service a' });
    expect(callsTo(REQUESTS)).toHaveLength(2);
    expect(callsTo(APPOINTMENTS)).toHaveLength(1);
    expect(callsTo(FOLLOWUPS)).toHaveLength(1);
  });
});

describe('Work requests: filter and pages', () => {
  it('pages by 15 using the total the server reports', async () => {
    answerAll([request('a')], [], [], 40);
    show();
    await screen.findByRole('heading', { name: 'Service a' });
    expect(screen.getByText(/of/, { selector: '.wf-pagination span' })).toHaveTextContent('Page 1 of 3 (40 items)');
    answer('/work/requests?limit=15&offset=15', { items: [request('b')], total: 40 });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(workPaths()[workPaths().length - 1]).toBe('/work/requests?limit=15&offset=15');
    expect(screen.getByText('Loading your information…')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Service b' });
    expect(screen.getByText(/of/, { selector: '.wf-pagination span' })).toHaveTextContent('Page 2 of 3 (40 items)');
    expect(callsTo(APPOINTMENTS)).toHaveLength(1);
  });

  it('counts the requests on the page when the server reports no total', async () => {
    answerAll(Array.from({ length: 16 }, (_, index) => request(`r${index}`)));
    show();
    await screen.findByRole('heading', { name: 'Service r0' });
    expect(screen.getByText(/of/, { selector: '.wf-pagination span' })).toHaveTextContent('Page 1 of 2 (16 items)');
  });

  it('shows no pagination for a single page', async () => {
    answerAll([request('a')], [], [], 1);
    show();
    await screen.findByRole('heading', { name: 'Service a' });
    expect(document.querySelector('.wf-pagination')).toBeNull();
  });

  it('offers every status, filters from the first page with the exact query, and ALL removes the filter', async () => {
    answerAll([request('a')], [], [], 40);
    show();
    await screen.findByRole('heading', { name: 'Service a' });
    const select = screen.getByRole('combobox', { name: 'Status' });
    expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual(['ALL', 'REQUESTED', 'ACCEPTED', 'DISPATCHED', 'COMPLETED', 'DECLINED', 'CANCELLED']);
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    fireEvent.change(select, { target: { value: 'ACCEPTED' } });
    expect(workPaths()[workPaths().length - 1]).toBe('/work/requests?limit=15&offset=0&status=ACCEPTED');
    expect(select).toHaveValue('ACCEPTED');
    fireEvent.change(select, { target: { value: 'ALL' } });
    expect(workPaths()[workPaths().length - 1]).toBe(REQUESTS);
    expect(callsTo(APPOINTMENTS)).toHaveLength(1);
    expect(callsTo(FOLLOWUPS)).toHaveLength(1);
  });

  it('shows the filtered empty state', async () => {
    answerAll([request('a')]);
    answer('/work/requests?limit=15&offset=0&status=CANCELLED', { items: [], total: 0 });
    show();
    await screen.findByRole('heading', { name: 'Service a' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'CANCELLED' } });
    expect(await screen.findByText('No service requests assigned to you.')).toBeInTheDocument();
  });
});

describe('Work requests: status updates', () => {
  it('sends the exact PATCH, then reloads the requests and nothing else', async () => {
    answerAll([request('a')]);
    answer('/work/requests/a', {});
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept request' }));
    expect(apiRequest).toHaveBeenCalledWith('/work/requests/a', { method: 'PATCH', body: JSON.stringify({ status: 'ACCEPTED' }) });
    await vi.waitFor(() => expect(callsTo(REQUESTS)).toHaveLength(2));
    await screen.findByRole('heading', { name: 'Service a' });
    expect(callsTo(APPOINTMENTS)).toHaveLength(1);
    expect(callsTo(FOLLOWUPS)).toHaveLength(1);
  });

  it('sends each next step as its status', async () => {
    answerAll([request('a'), request('p', { status: 'ACCEPTED', kind: 'product' }), request('l', { status: 'ACCEPTED', kind: 'lab' }), request('d', { status: 'DISPATCHED' })]);
    ['a', 'p', 'l', 'd'].forEach(id => answer(`/work/requests/${id}`, {}));
    show();
    await screen.findByRole('heading', { name: 'Service a' });
    const steps: [string, string, string][] = [['a', 'Decline request', 'DECLINED'], ['p', 'Mark dispatched', 'DISPATCHED'], ['l', 'Mark completed', 'COMPLETED'], ['d', 'Mark completed', 'COMPLETED']];
    for (const [id, label, status] of steps) {
      fireEvent.click(within(await screen.findByRole('heading', { name: `Service ${id}` }).then(heading => heading.closest('article') as HTMLElement)).getByRole('button', { name: label }));
      expect(apiRequest).toHaveBeenLastCalledWith(`/work/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await screen.findByRole('heading', { name: `Service ${id}` });
    }
  });

  it('shows a failed update above the tabs, keeps the list, does not reload, and clears the error on the next attempt', async () => {
    answerAll([request('a')]);
    fail('/work/requests/a', 'This request was already declined.');
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept request' }));
    expect(await screen.findByText('This request was already declined.')).toHaveClass('care-form-error');
    expect(screen.getByRole('heading', { name: 'Service a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept request' })).toBeEnabled();
    expect(callsTo(REQUESTS)).toHaveLength(1);
    const next = hold('/work/requests/a');
    fireEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(topError()).toBeNull();
    await next.release();
  });

  it('runs one update at a time: every action is disabled until the first finishes', async () => {
    answerAll([request('a'), request('b')]);
    show();
    await screen.findByRole('heading', { name: 'Service a' });
    const pending = hold('/work/requests/a');
    fireEvent.click(within(card('Service a')).getByRole('button', { name: 'Accept request' }));
    screen.getAllByRole('button', { name: /request$/ }).forEach(button => expect(button).toBeDisabled());
    fireEvent.click(within(card('Service b')).getByRole('button', { name: 'Accept request' }));
    expect(callsTo('/work/requests/b')).toHaveLength(0);
    await pending.reject('Failed');
    screen.getAllByRole('button', { name: /request$/ }).forEach(button => expect(button).toBeEnabled());
  });
});

describe('Appointments', () => {
  it('shows each appointment with its slot, status, account holder, service and provider', async () => {
    answerAll([], [appointment('a'), appointment('b', { status: 'NO_SHOW' })]);
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Appointments');
    expect(tab('Appointments')).toHaveAttribute('aria-pressed', 'true');
    expect(tab('Service requests')).toHaveAttribute('aria-pressed', 'false');
    const [a, b] = screen.getAllByRole('article');
    expect(a).toHaveTextContent('APPOINTMENT APPTA-00');
    expect(within(a).getByRole('heading', { level: 3 })).toHaveTextContent(displayDate('2026-10-07T10:00:00'));
    expect(within(a).getByText('REQUESTED')).toHaveClass('wf-status', 'status-requested');
    expect(a).toHaveTextContent('Patient a');
    expect(a).toHaveTextContent('a@example.test');
    expect(a).toHaveTextContent('consult-general');
    expect(a).toHaveTextContent('Provider provider');
    expect(a).toHaveTextContent(`until ${displayDate('2026-10-07T10:30:00')}`);
    expect(within(b).getByText('NO SHOW')).toHaveClass('status-no_show');
    expect(within(b).queryAllByRole('button')).toHaveLength(0);
  });

  it('offers Confirm and Decline for a request, and completion, no-show and the consultation once confirmed', async () => {
    answerAll([], [appointment('a'), appointment('b', { status: 'CONFIRMED' })]);
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Appointments');
    const [a, b] = screen.getAllByRole('article');
    expect(within(a).getAllByRole('button').map(button => button.textContent)).toEqual(['Confirm', 'Decline']);
    expect(within(b).getAllByRole('button').map(button => button.textContent)).toEqual(['Mark completed', 'No-show', 'Join consultation']);
  });

  it('sends each decision as the exact PATCH, then reloads the appointments and nothing else', async () => {
    const requested = appointment('a');
    const confirmed = appointment('b', { status: 'CONFIRMED' });
    answerAll([], [requested, confirmed]);
    answer(`/work/appointments/${requested.id}`, {});
    answer(`/work/appointments/${confirmed.id}`, {});
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Appointments');
    const decisions: [number, string, string, string][] = [[0, requested.id, 'Confirm', 'CONFIRMED'], [0, requested.id, 'Decline', 'CANCELLED'], [1, confirmed.id, 'Mark completed', 'COMPLETED'], [1, confirmed.id, 'No-show', 'NO_SHOW']];
    let reloads = 1;
    for (const [index, id, label, status] of decisions) {
      const article = (await screen.findAllByRole('article'))[index];
      fireEvent.click(within(article).getByRole('button', { name: label }));
      expect(apiRequest).toHaveBeenLastCalledWith(`/work/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      reloads += 1;
      await vi.waitFor(() => expect(callsTo(APPOINTMENTS)).toHaveLength(reloads));
    }
    expect(callsTo(REQUESTS)).toHaveLength(1);
    expect(callsTo(FOLLOWUPS)).toHaveLength(1);
  });

  it('shows a failed decision above the tabs and does not reload', async () => {
    const requested = appointment('a');
    answerAll([], [requested]);
    fail(`/work/appointments/${requested.id}`, 'Slot no longer available.');
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Appointments');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Slot no longer available.')).toHaveClass('care-form-error');
    expect(callsTo(APPOINTMENTS)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('opens the consultation for a confirmed appointment, even while a decision is pending, and closes it', async () => {
    const confirmed = appointment('b', { status: 'CONFIRMED' });
    answerAll([], [confirmed]);
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Appointments');
    hold(`/work/appointments/${confirmed.id}`);
    fireEvent.click(screen.getByRole('button', { name: 'Mark completed' }));
    expect(screen.getByRole('button', { name: 'No-show' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Join consultation' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Join consultation' }));
    expect(screen.getByRole('heading', { name: 'Consultation' })).toBeInTheDocument();
    expect(screen.getByText('With Patient b')).toBeInTheDocument();
    expect(callsTo(`/consultation/${confirmed.id}/state`)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(screen.queryByRole('heading', { name: 'Consultation' })).toBeNull();
  });

  it('closes the consultation when another tab is opened', async () => {
    answerAll([], [appointment('b', { status: 'CONFIRMED' })]);
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Appointments');
    fireEvent.click(screen.getByRole('button', { name: 'Join consultation' }));
    fireEvent.click(tab('Follow-ups'));
    fireEvent.click(tab('Appointments'));
    expect(screen.queryByRole('heading', { name: 'Consultation' })).toBeNull();
  });

  it('shows loading, empty and error states, and Try again reloads only the appointments', async () => {
    answer(REQUESTS, { items: [] });
    answer(FOLLOWUPS, { items: [] });
    const first = hold(APPOINTMENTS);
    show();
    await openTab('Appointments');
    expect(screen.getByText('Loading your information…')).toBeInTheDocument();
    await first.reject('Appointments unavailable');
    const alert = screen.getByText('Appointments unavailable').closest('[role=alert]') as HTMLElement;
    answer(APPOINTMENTS, { items: [] });
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('No appointments assigned to you.')).toBeInTheDocument();
    expect(screen.getByText('Appointments booked on your services will appear here for confirmation.')).toBeInTheDocument();
    expect(callsTo(APPOINTMENTS)).toHaveLength(2);
    expect(callsTo(REQUESTS)).toHaveLength(1);
  });
});

describe('Follow-ups', () => {
  it('shows each follow-up with its note, status, order and creation time; only open ones can be resolved', async () => {
    answerAll([], [], [followUp('a'), followUp('b', { status: 'RESOLVED', resolvedAt: 1790000500 })]);
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Follow-ups');
    expect(tab('Follow-ups')).toHaveAttribute('aria-pressed', 'true');
    const a = card('Call back a');
    expect(a).toHaveTextContent('FOLLOW-UP FUPA-000');
    expect(within(a).getByText('OPEN')).toHaveClass('wf-status', 'status-requested');
    expect(a).toHaveTextContent('Order order123');
    expect(a).toHaveTextContent(`Created ${displayDate(1790000000)}`);
    expect(within(a).getByRole('button', { name: 'Mark resolved' })).toHaveClass('health-button');
    const b = card('Call back b');
    expect(within(b).getByText('RESOLVED')).toHaveClass('status-accepted');
    expect(within(b).queryByRole('button')).toBeNull();
  });

  it('resolves with the exact POST and no body, then reloads the follow-ups and nothing else', async () => {
    const task = followUp('a');
    answerAll([], [], [task]);
    answer(`/work/followups/${task.id}/resolve`, {});
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Follow-ups');
    fireEvent.click(screen.getByRole('button', { name: 'Mark resolved' }));
    expect(apiRequest).toHaveBeenLastCalledWith(`/work/followups/${task.id}/resolve`, { method: 'POST' });
    await vi.waitFor(() => expect(callsTo(FOLLOWUPS)).toHaveLength(2));
    expect(callsTo(REQUESTS)).toHaveLength(1);
    expect(callsTo(APPOINTMENTS)).toHaveLength(1);
  });

  it('shows a failed resolution above the tabs and does not reload', async () => {
    const task = followUp('a');
    answerAll([], [], [task]);
    fail(`/work/followups/${task.id}/resolve`, 'Follow-up already resolved.');
    show();
    await screen.findByText('No service requests assigned to you.');
    await openTab('Follow-ups');
    fireEvent.click(screen.getByRole('button', { name: 'Mark resolved' }));
    expect(await screen.findByText('Follow-up already resolved.')).toHaveClass('care-form-error');
    expect(callsTo(FOLLOWUPS)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Mark resolved' })).toBeEnabled();
  });

  it('shows empty and error states, and Try again reloads only the follow-ups', async () => {
    answer(REQUESTS, { items: [] });
    answer(APPOINTMENTS, { items: [] });
    fail(FOLLOWUPS, 'Follow-ups unavailable');
    show();
    await openTab('Follow-ups');
    const alert = (await screen.findByText('Follow-ups unavailable')).closest('[role=alert]') as HTMLElement;
    answer(FOLLOWUPS, { items: [] });
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('No follow-up tasks.')).toBeInTheDocument();
    expect(screen.getByText('Overdue care requests generate follow-up tasks automatically on the 2-hour cycle.')).toBeInTheDocument();
    expect(callsTo(FOLLOWUPS)).toHaveLength(2);
    expect(callsTo(REQUESTS)).toHaveLength(1);
  });
});

describe('Shared state across tabs', () => {
  it('keeps one lock across tabs: a pending request update disables appointment and follow-up actions', async () => {
    answerAll([request('a')], [appointment('a')], [followUp('a')]);
    show();
    await screen.findByRole('heading', { name: 'Service a' });
    const pending = hold('/work/requests/a');
    fireEvent.click(screen.getByRole('button', { name: 'Accept request' }));
    await openTab('Appointments');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await openTab('Follow-ups');
    expect(screen.getByRole('button', { name: 'Mark resolved' })).toBeDisabled();
    await pending.release();
    expect(screen.getByRole('button', { name: 'Mark resolved' })).toBeEnabled();
  });

  it('keeps an update error visible when switching tabs, and keeps the filter while another tab is open', async () => {
    answerAll([request('a')], [appointment('a')], [followUp('a')]);
    fail('/work/requests/a', 'Could not update.');
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept request' }));
    await screen.findByText('Could not update.');
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'REQUESTED' } });
    await openTab('Appointments');
    expect(screen.getByText('Could not update.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('REQUESTED');
    fireEvent.click(tab('Service requests'));
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('REQUESTED');
    expect(callsTo('/work/requests?limit=15&offset=0&status=REQUESTED')).toHaveLength(1);
  });

  it('does not request anything again when switching tabs', async () => {
    answerAll([request('a')], [appointment('a')], [followUp('a')]);
    show();
    await screen.findByRole('heading', { name: 'Service a' });
    await openTab('Appointments');
    await openTab('Follow-ups');
    fireEvent.click(tab('Service requests'));
    expect(workPaths()).toEqual([REQUESTS, APPOINTMENTS, FOLLOWUPS]);
  });

  it('ignores answers that arrive after the screen has closed', async () => {
    answer(APPOINTMENTS, { items: [] });
    answer(FOLLOWUPS, { items: [] });
    const late = hold(REQUESTS);
    const { unmount } = show();
    const [, init] = callsTo(REQUESTS)[0];
    unmount();
    expect(init?.signal?.aborted).toBe(true);
    await late.release({ items: [request('a')] });
    expect(screen.queryByRole('heading', { name: 'Service a' })).toBeNull();
  });
});
