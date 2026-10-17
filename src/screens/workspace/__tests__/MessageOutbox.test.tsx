import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// The notification outbox for a super admin. Only HTTP is mocked.
type Answer = () => Promise<unknown>;
const answers: Record<string, Answer> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => answers[path]?.() ?? new Promise(() => undefined));
vi.mock('../../../data/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { MessageOutboxView } from '../../../features/admin/views/MessageOutboxView';
import { maskContact, maskContactsIn } from '../../../features/admin/model/outboxRepository';
import { ApiError } from '../../../data/http';
import { LanguageProvider, translate } from '../../../i18n';
import type { Lang } from '../../../i18n';

const OUTBOX = '/v1/admin/notifications/outbox';
// The server masks contacts; one row here arrives unmasked to prove the client backstop.
const message = (id: string, overrides: Record<string, unknown>) => ({
  id, eventType: 'GENERIC_NOTIFICATION', recipientMasked: 'r•••@•••.in', channel: 'EMAIL',
  status: 'PENDING', attempts: 0, maxAttempts: 3, createdAt: 1792141200, sentAt: null, lastError: null, ...overrides,
});
const outbox = {
  items: [
    message('n-1', {}),
    message('n-2', { eventType: 'BLOOD_SOS', recipientMasked: '+91 98765 43210', channel: 'WHATSAPP', status: 'FAILED', attempts: 3, lastError: 'Gateway rejected +91 98765 43210' }),
    message('n-3', { eventType: 'LAB_REPORT_RELEASED', recipientMasked: '', channel: 'IN_APP', status: 'SENT', attempts: 1, sentAt: 1792141500 }),
  ],
};
const ok = (value: unknown): Answer => () => Promise.resolve(value);

beforeEach(() => {
  Object.keys(answers).forEach(key => delete answers[key]);
  apiRequest.mockClear();
  answers[OUTBOX] = ok(outbox);
});

describe('masking', () => {
  it('keeps only a hint of an email or phone number', () => {
    expect(maskContact('ravi.kumar@college.example.in')).toBe('r•••@•••.in');
    expect(maskContact('+91 98765 43210')).toBe('••• 10');
    expect(maskContact('12')).toBe('•••');
    expect(maskContact('')).toBe('');
    expect(maskContactsIn('Bounce for ravi@x.org via +91-98765-43210')).toBe('Bounce for r•••@•••.org via ••• 10');
  });
});

describe('Message outbox', () => {
  it('lists messages with event type and masked contacts', async () => {
    render(<MessageOutboxView />);
    const rows = (await screen.findAllByRole('row')).slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('r•••@•••.in');
    expect(rows[0]).toHaveTextContent('Generic notification');
    expect(rows[1]).toHaveTextContent('Blood sos');
    expect(rows[1]).toHaveTextContent('••• 10');
    expect(rows[1]).toHaveTextContent('Failed');
    expect(rows[1]).toHaveTextContent('3 of 3');
    expect(rows[1]).toHaveTextContent('Gateway rejected ••• 10');
    expect(rows[2]).toHaveTextContent('In app');
    const page = document.body.textContent ?? '';
    expect(page).not.toMatch(/98765|43210/);
    // Only the failed message can be requeued.
    expect(screen.getAllByRole('button', { name: /^Requeue the/ })).toHaveLength(1);
  });

  it('filters by status', async () => {
    render(<MessageOutboxView />);
    await screen.findAllByRole('row');
    fireEvent.click(within(screen.getByRole('group', { name: 'Filter messages by status' })).getByRole('button', { name: 'Sent' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('In app');
    fireEvent.click(within(screen.getByRole('group', { name: 'Filter messages by status' })).getByRole('button', { name: 'Turned off' }));
    expect(screen.getByText('No messages with this status.')).toBeInTheDocument();
  });

  it('requeues a failed message after confirming, then reloads', async () => {
    answers[`${OUTBOX}/requeue`] = ok({ status: 'SUCCESS' });
    render(<MessageOutboxView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Requeue the WhatsApp message to ••• 10' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Requeue this message?' });
    expect(dialog).toHaveTextContent('The WhatsApp message to ••• 10 goes back to pending');
    expect(apiRequest).not.toHaveBeenCalledWith(`${OUTBOX}/requeue`, expect.anything());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Requeue' }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${OUTBOX}/requeue`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ notificationId: 'n-2' }) })));
    expect(await screen.findByText('Message requeued. It will be sent on the next worker run.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(apiRequest.mock.calls.filter(([path]) => path === OUTBOX)).toHaveLength(2));
  });

  it('does nothing when the requeue is cancelled', async () => {
    render(<MessageOutboxView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Requeue the WhatsApp message to ••• 10' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(apiRequest.mock.calls.some(([path]) => path.endsWith('/requeue'))).toBe(false);
  });

  it('runs the delivery job only after confirming', async () => {
    answers[`${OUTBOX}/process`] = ok({ runId: 'run_1', processed: 4, delivered: 1, inApp: 1, failed: 0, suppressed: 0, deferred: 1, pending: 2 });
    render(<MessageOutboxView />);
    await screen.findAllByRole('row');
    fireEvent.click(screen.getByRole('button', { name: 'Process now' }));
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Run the outbox worker now?' })).getByRole('button', { name: 'Process now' }));
    expect(await screen.findByText(/The worker ran: 4 processed, 1 sent, 1 in-app only, 0 failed\. 2 still pending\./)).toBeInTheDocument();
    expect(screen.getByText(/1 held for quiet hours\./)).toBeInTheDocument();
  });

  it.each<Lang>(['en', 'te', 'hi'])('says the outbox is already being processed on 409 (%s)', async lang => {
    answers[`${OUTBOX}/process`] = () => Promise.reject(new ApiError('The outbox is already being processed. Try again shortly.', 409));
    render(<LanguageProvider initial={lang}><MessageOutboxView /></LanguageProvider>);
    await screen.findAllByRole('row');
    const process = translate(lang, 'admin.outbox.process');
    fireEvent.click(screen.getByRole('button', { name: process }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: process }));
    expect(await screen.findByRole('alert')).toHaveTextContent(translate(lang, 'admin.jobs.alreadyRunning'));
    expect(screen.getByRole('alert')).not.toHaveTextContent(translate(lang, 'admin.outbox.processError'));
  });

  it('shows an in-flight message as Sending', async () => {
    answers[OUTBOX] = ok({ items: [message('n-9', { status: 'SENDING', attempts: 0 })] });
    render(<MessageOutboxView />);
    const rows = (await screen.findAllByRole('row')).slice(1);
    expect(rows[0]).toHaveTextContent('Sending');
  });

  it('names only channels that exist', async () => {
    answers[OUTBOX] = ok({ items: [] });
    render(<MessageOutboxView />);
    expect(await screen.findByText('The outbox is empty.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/SMS/);
  });

  it('shows the empty outbox honestly', async () => {
    answers[OUTBOX] = ok({ items: [] });
    render(<MessageOutboxView />);
    expect(await screen.findByText('The outbox is empty.')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Outbox by status' })).getAllByText('0')).toHaveLength(4);
  });
});
