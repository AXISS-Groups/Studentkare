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

const OUTBOX = '/v1/admin/notifications/outbox';
const message = (id: string, overrides: Record<string, unknown>) => ({
  id, recipient: 'ravi.kumar@college.example.in', channel: 'EMAIL', subject: 'Your HbA1c result', body: 'HbA1c 9.1% — please book a review',
  status: 'PENDING', attempts: 0, max_attempts: 3, scheduled_at: '2026-10-16T09:00:00Z', last_attempt_at: null, error_message: null, ...overrides,
});
const outbox = {
  items: [
    message('n-1', {}),
    message('n-2', { recipient: '+91 98765 43210', channel: 'SMS', status: 'DLQ', attempts: 4, last_attempt_at: '2026-10-16T09:05:00Z', error_message: 'Gateway rejected +91 98765 43210' }),
    message('n-3', { channel: 'WHATSAPP', status: 'DELIVERED', attempts: 1 }),
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
  it('lists messages with masked contacts and never the subject or body', async () => {
    render(<MessageOutboxView />);
    const rows = (await screen.findAllByRole('row')).slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('r•••@•••.in');
    expect(rows[1]).toHaveTextContent('••• 10');
    expect(rows[1]).toHaveTextContent('Dead letter');
    expect(rows[1]).toHaveTextContent('4 of 3');
    expect(rows[1]).toHaveTextContent('Gateway rejected ••• 10');
    const page = document.body.textContent ?? '';
    expect(page).not.toMatch(/ravi\.kumar|college\.example|98765|43210|HbA1c|9\.1%|please book/);
    // Only the failed message can be requeued.
    expect(screen.getAllByRole('button', { name: /^Requeue the/ })).toHaveLength(1);
  });

  it('filters by status', async () => {
    render(<MessageOutboxView />);
    await screen.findAllByRole('row');
    fireEvent.click(within(screen.getByRole('group', { name: 'Filter messages by status' })).getByRole('button', { name: 'Delivered' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('WhatsApp');
    fireEvent.click(within(screen.getByRole('group', { name: 'Filter messages by status' })).getByRole('button', { name: 'Failed' }));
    expect(screen.getByText('No messages with this status.')).toBeInTheDocument();
  });

  it('requeues a failed message after confirming, then reloads', async () => {
    answers[`${OUTBOX}/requeue`] = ok({ status: 'SUCCESS', message: 'Notification n-2 requeued for delivery.' });
    render(<MessageOutboxView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Requeue the SMS message to ••• 10' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Requeue this message?' });
    expect(dialog).toHaveTextContent('The SMS message to ••• 10 goes back to pending');
    expect(apiRequest).not.toHaveBeenCalledWith(`${OUTBOX}/requeue`, expect.anything());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Requeue' }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${OUTBOX}/requeue`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ notificationId: 'n-2' }) })));
    expect(await screen.findByText('Message requeued. It will be sent on the next worker run.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(apiRequest.mock.calls.filter(([path]) => path === OUTBOX)).toHaveLength(2));
  });

  it('does nothing when the requeue is cancelled', async () => {
    render(<MessageOutboxView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Requeue the SMS message to ••• 10' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(apiRequest.mock.calls.some(([path]) => path.endsWith('/requeue'))).toBe(false);
  });

  it('runs the worker only after confirming', async () => {
    answers[`${OUTBOX}/process`] = ok({ processed: 1, delivered: 1, failed: 0, quiet_hours_active: false, queue_size: 3 });
    render(<MessageOutboxView />);
    await screen.findAllByRole('row');
    fireEvent.click(screen.getByRole('button', { name: 'Process now' }));
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Run the outbox worker now?' })).getByRole('button', { name: 'Process now' }));
    expect(await screen.findByText('The worker ran: 1 processed, 3 in the outbox.')).toBeInTheDocument();
  });

  it('shows the empty outbox honestly', async () => {
    answers[OUTBOX] = ok({ items: [] });
    render(<MessageOutboxView />);
    expect(await screen.findByText('The outbox is empty.')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Outbox by status' })).getAllByText('0')).toHaveLength(4);
  });
});
