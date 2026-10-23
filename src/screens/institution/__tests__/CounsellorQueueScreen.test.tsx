import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

// Only the HTTP layer is mocked, keyed by path, so these tests hold for any implementation.
const apiRequest = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>();
vi.mock('../../../data/services/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/services/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
// The campus hub's SOS desk reads the signed-in user; a campus administrator here.
vi.mock('../../../data/contexts/AuthContext', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/contexts/AuthContext')>()), useAuth: () => ({ user: { role: 'CAMPUS_ADMIN' } }) }));

import { acknowledgementClock, CounsellorQueueScreen, QUEUE_POLL_MS, type CrisisQueueItem } from '../CounsellorQueueScreen';

const QUEUE = '/ops/crisis-events?limit=100';
const NOW = new Date('2026-10-17T10:00:00Z').getTime();
const secondsAgo = (minutes: number) => (NOW - minutes * 60000) / 1000;
const item = (overrides: Partial<CrisisQueueItem> = {}): CrisisQueueItem => ({
  id: 'c1', studentName: 'Asha Rao', contact: '9876543210', kind: 'CRISIS_SELF_HARM',
  createdAt: secondsAgo(4), acknowledgedAt: null, outcome: 'PENDING', ...overrides,
});
const queueOf = (...items: CrisisQueueItem[]) => ({ items, total: items.length, pending: items.filter(i => i.outcome === 'PENDING').length });
const flush = async () => { await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); }); };
const queueCalls = () => apiRequest.mock.calls.filter(([path]) => path === QUEUE).length;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(NOW);
  apiRequest.mockReset();
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
});
afterEach(() => { vi.useRealTimers(); });

describe('acknowledgementClock', () => {
  it('counts down the 15-minute window, then counts how far it is overdue', () => {
    expect(acknowledgementClock(secondsAgo(4), NOW)).toEqual({ overdue: false, minutes: 11 });
    expect(acknowledgementClock(secondsAgo(0), NOW)).toEqual({ overdue: false, minutes: 15 });
    expect(acknowledgementClock(secondsAgo(15), NOW)).toEqual({ overdue: true, minutes: 1 });
    expect(acknowledgementClock(secondsAgo(27), NOW)).toEqual({ overdue: true, minutes: 12 });
  });
});

describe('CounsellorQueueScreen', () => {
  it('lists each signal with name, contact, kind, age and the acknowledgement clock — never message text', async () => {
    apiRequest.mockResolvedValue(queueOf(item(), item({ id: 'c2', studentName: 'Ravi K', contact: 'ravi@example.test', kind: 'CRISIS_OVERDOSE', createdAt: secondsAgo(22) })));
    render(<CounsellorQueueScreen />);
    await flush();

    const asha = screen.getByRole('article', { name: 'Crisis follow-up for Asha Rao' });
    expect(asha).toHaveTextContent('Self-harm or suicide risk');
    expect(asha).toHaveTextContent('Signalled 4 min ago');
    expect(asha).toHaveTextContent('11 min left to acknowledge');
    expect(within(asha).getByRole('link', { name: 'Call Asha Rao' })).toHaveAttribute('href', 'tel:9876543210');
    expect(asha).toHaveTextContent('What the student wrote is never shown here.');

    const ravi = screen.getByRole('article', { name: 'Crisis follow-up for Ravi K' });
    expect(ravi).toHaveTextContent('Possible overdose');
    expect(ravi).toHaveTextContent('Overdue by 7 min');
    expect(within(ravi).getByRole('link', { name: 'Email Ravi K' })).toHaveAttribute('href', 'mailto:ravi@example.test');

    expect(screen.getByRole('status')).toHaveTextContent('Waiting: 2');
    expect(screen.getByText('What you can and can’t see')).toBeInTheDocument();
  });

  it('keeps the honest empty line and shows no zero badge', async () => {
    apiRequest.mockResolvedValue(queueOf());
    render(<CounsellorQueueScreen />);
    await flush();
    expect(screen.getByRole('heading', { name: 'Queue clear — no one is waiting for a counsellor.' })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/does not mean no student needs help/i);
    expect(document.body.textContent).not.toMatch(/waiting: 0/i);
  });

  it('shows a calm error with retry when the first load fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Crisis follow-up is limited to campus counsellors.'));
    render(<CounsellorQueueScreen />);
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Crisis follow-up is limited to campus counsellors.');
    apiRequest.mockResolvedValue(queueOf(item()));
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await flush();
    expect(screen.getByRole('article', { name: 'Crisis follow-up for Asha Rao' })).toBeInTheDocument();
  });

  it('refreshes every 15 seconds, keeps the list when a refresh fails, and says so', async () => {
    apiRequest.mockResolvedValue(queueOf(item()));
    render(<CounsellorQueueScreen />);
    await flush();
    expect(queueCalls()).toBe(1);

    apiRequest.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { vi.advanceTimersByTime(QUEUE_POLL_MS); });
    await flush();
    expect(queueCalls()).toBe(2);
    expect(screen.getByRole('article', { name: 'Crisis follow-up for Asha Rao' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not refresh the queue/i);

    apiRequest.mockResolvedValue(queueOf(item(), item({ id: 'c3', studentName: 'New Student', createdAt: secondsAgo(0) })));
    await act(async () => { vi.advanceTimersByTime(QUEUE_POLL_MS); });
    await flush();
    expect(queueCalls()).toBe(3);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('article', { name: 'Crisis follow-up for New Student' })).toBeInTheDocument();
  });

  it('acknowledges with an outcome and an optional note, then reloads the queue', async () => {
    apiRequest.mockImplementation(async (path: string) => (path === QUEUE ? queueOf(item()) : { id: 'c1', outcome: 'CONTACTED' }));
    render(<CounsellorQueueScreen />);
    await flush();

    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    const dialog = screen.getByRole('dialog', { name: 'Follow-up for Asha Rao' });
    within(dialog).getAllByRole('radio').forEach(radio => expect(radio).not.toBeChecked());
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Reached the student' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: /note/i }), { target: { value: '  Spoke on the phone, booked a session.  ' } });
    const before = queueCalls();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save follow-up' }));
    await flush();

    const ack = apiRequest.mock.calls.find(([path]) => path === '/ops/crisis-events/c1/acknowledge');
    expect(ack?.[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(ack?.[1]?.body))).toEqual({ outcome: 'CONTACTED', note: 'Spoke on the phone, booked a session.' });
    expect(queueCalls()).toBe(before + 1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a recorded outcome and lets the counsellor update it', async () => {
    apiRequest.mockResolvedValue(queueOf(item({ outcome: 'UNREACHABLE', acknowledgedAt: secondsAgo(1) })));
    render(<CounsellorQueueScreen />);
    await flush();
    const asha = screen.getByRole('article', { name: 'Crisis follow-up for Asha Rao' });
    expect(asha).toHaveTextContent('Could not reach');
    expect(asha).not.toHaveTextContent(/left to acknowledge|overdue/i);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(within(asha).getByRole('button', { name: 'Update follow-up' }));
    expect(screen.getByRole('radio', { name: 'Could not reach' })).toBeChecked();
  });

  it('keeps the dialog open and shows the server error when acknowledging fails', async () => {
    apiRequest.mockImplementation(async (path: string) => {
      if (path === QUEUE) return queueOf(item());
      throw new Error('Crisis event not found.');
    });
    render(<CounsellorQueueScreen />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Escalated' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save follow-up' }));
    await flush();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Crisis event not found.');
  });

  it('keeps Tele-MANAS and 112 one tap away in every state, and never claims an escalation the server does not make', async () => {
    apiRequest.mockReturnValue(new Promise(() => undefined));
    render(<CounsellorQueueScreen />);
    await flush();
    expect(screen.getByRole('status', { name: 'Loading counsellor queue' })).toBeInTheDocument();
    const teleManas = screen.getByRole('link', { name: 'Tele-MANAS 14416', description: 'Call Tele-MANAS, the mental-health helpline, on 14416' });
    expect(teleManas).toHaveAttribute('href', 'tel:14416');
    expect(teleManas.tabIndex).toBe(0);
    expect(screen.getByRole('link', { name: 'Call 112', description: 'Call 112, India’s emergency number' })).toHaveAttribute('href', 'tel:112');
    expect(document.body.textContent).toMatch(/doesn’t escalate on its own yet/);
    expect(document.body.textContent).not.toMatch(/escalates to the super admin safety centre|rings Tele-MANAS/);
    // No roster source: no invented on-call counsellor, and no invented median.
    expect(document.body.textContent).not.toMatch(/On call now|Neha Kulkarni|Median ack 6 min/);
    expect(screen.getByText('Median ack — · this week')).toBeInTheDocument();
  });

  it('draws the acknowledgement ring from the window used, and a tick once followed up', async () => {
    apiRequest.mockResolvedValue(queueOf(item(), item({ id: 'c2', studentName: 'Ravi K', outcome: 'CONTACTED', acknowledgedAt: secondsAgo(1) })));
    const { container } = render(<CounsellorQueueScreen />);
    await flush();
    const ring = container.querySelector<HTMLElement>('.cs-ring:not(.cs-ring--done)');
    expect(ring?.style.getPropertyValue('--cs-ring-pct')).toBe(String(4 / 15));
    expect(ring).toHaveTextContent('11');
    expect(container.querySelector('.cs-ring--done [data-icon="check"]')).not.toBeNull();
  });

  it('has no accessibility violations with a queue on screen', async () => {
    apiRequest.mockResolvedValue(queueOf(item()));
    const { container } = render(<CounsellorQueueScreen />);
    await flush();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
// The campus console's counsellor board (no queue for campus admins) is covered in
// src/features/campus/console/__tests__/CampusConsole.test.tsx.
