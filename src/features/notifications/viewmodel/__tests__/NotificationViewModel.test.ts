import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequest, storage } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  storage: { remove: vi.fn(async () => undefined), set: vi.fn(async () => undefined), get: vi.fn(async () => []) },
}));
vi.mock('@/data/http', () => ({ apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
vi.mock('@/core/storage/CrossPlatformStorage', () => ({ CrossPlatformStorage: storage }));

import { NotificationViewModel, toNotificationItem } from '../NotificationViewModel';
import type { InboxEvent } from '../NotificationViewModel';

const event = (over: Partial<InboxEvent> = {}): InboxEvent => ({
  id: 'evt_1', eventType: 'SOS_ACKNOWLEDGED', payload: { summary: 'Your campus has seen your SOS and is responding.' },
  status: 'SENT', createdAt: 1_700_000_000, sentAt: null, readAt: null, ...over,
});

async function loaded(items: InboxEvent[]) {
  apiRequest.mockImplementation(async (path: string) => (path === '/notifications' ? { items } : { success: true }));
  const vm = new NotificationViewModel();
  await vi.waitFor(() => expect(vm.loading).toBe(false));
  return vm;
}

beforeEach(() => {
  apiRequest.mockReset();
  storage.set.mockClear();
  storage.remove.mockClear();
});

describe('NotificationViewModel against the real /notifications contract', () => {
  it('reads `items` and maps the server summary', async () => {
    const vm = await loaded([event()]);
    expect(vm.items).toHaveLength(1);
    expect(vm.items[0]).toMatchObject({ id: 'evt_1', category: 'EMERGENCY', body: 'Your campus has seen your SOS and is responding.', read: false, timestamp: 1_700_000_000_000 });
  });

  it('marks read with POST, the only verb the backend accepts', async () => {
    const vm = await loaded([event()]);
    await vm.markAsRead('evt_1');
    expect(apiRequest).toHaveBeenCalledWith('/notifications/evt_1/read', { method: 'POST' });
    expect(vm.items[0].read).toBe(true);
  });

  it('puts the item back to unread when the server refuses', async () => {
    const vm = await loaded([event()]);
    apiRequest.mockRejectedValueOnce(new Error('offline'));
    await vm.markAsRead('evt_1');
    expect(vm.items[0].read).toBe(false);
    expect(vm.error).toMatch(/Couldn’t mark/);
  });

  it('marks all by calling the per-item endpoint, never a missing bulk one', async () => {
    const vm = await loaded([event(), event({ id: 'evt_2', readAt: 5 })]);
    await vm.markAllAsRead();
    const paths = apiRequest.mock.calls.map(([path]) => path);
    expect(paths).not.toContain('/notifications/read-all');
    expect(paths.filter((p: string) => p.endsWith('/read'))).toEqual(['/notifications/evt_1/read']);
  });

  it('keeps notification text off the device and clears the old cache', async () => {
    await loaded([event()]);
    expect(storage.set).not.toHaveBeenCalled();
    expect(storage.remove).toHaveBeenCalledWith('studentkare_notifications_cache_v1');
  });

  it('falls back to the event name when there is no summary', () => {
    expect(toNotificationItem(event({ eventType: 'appointment_reminder', payload: {} })).body).toBe('appointment reminder');
  });
});
