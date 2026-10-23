import { describe, expect, it, vi } from 'vitest';
import { NotificationSettingsViewModel } from '../NotificationSettingsViewModel';
import type { NotificationPreferences } from '../NotificationSettingsViewModel';
import type { PushDeviceController } from '../../data/pushDevice';

const stored: NotificationPreferences = {
  emailEnabled: true, pushEnabled: true, remindersEnabled: true,
  pickupLocationEnabled: false, ayushHistoryEnabled: false,
  timezone: 'Asia/Kolkata', quietStart: '22:00', quietEnd: '08:00',
  channels: { SAFETY: ['PUSH', 'WHATSAPP', 'EMAIL'], CARE: ['PUSH', 'EMAIL'], ORDERS: ['PUSH'] },
  categories: [
    { key: 'SAFETY', channels: ['PUSH', 'WHATSAPP', 'EMAIL'], locked: true },
    { key: 'CARE', channels: ['PUSH', 'WHATSAPP', 'EMAIL'], locked: false },
    { key: 'ORDERS', channels: ['PUSH'], locked: false },
  ],
  marketingOptIn: false,
};

function fake() {
  const calls: Array<{ path: string; init?: RequestInit }> = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    return init?.method ? { success: true } : structuredClone(stored);
  });
  return { request: request as unknown as typeof import('@/data/services/http').apiRequest, calls };
}

describe('per-category channels', () => {
  it('toggles a channel, previews that category, and saves without the read-only list or safety', async () => {
    const { request, calls } = fake();
    const vm = new NotificationSettingsViewModel(request);
    await vm.load();
    expect(vm.dirty).toBe(false);
    vm.toggleChannel('CARE', 'WHATSAPP');
    expect(vm.channelOn('CARE', 'WHATSAPP')).toBe(true);
    expect(vm.previewCategory).toBe('CARE');
    expect(vm.dirty).toBe(true);
    await vm.save();
    const body = JSON.parse(String(calls.find((c) => c.init?.method === 'PUT')?.init?.body)) as NotificationPreferences;
    expect(body.channels).toEqual({ CARE: ['PUSH', 'WHATSAPP', 'EMAIL'], ORDERS: ['PUSH'] });
    expect(body.categories).toBeUndefined();
    expect(vm.dirty).toBe(false);
  });

  it('safety stays on whatever is tapped', async () => {
    const { request } = fake();
    const vm = new NotificationSettingsViewModel(request);
    await vm.load();
    vm.toggleChannel('SAFETY', 'PUSH');
    expect(vm.channelOn('SAFETY', 'PUSH')).toBe(true);
    expect(vm.dirty).toBe(false);
  });

  it('a channel the category does not offer cannot be turned on', async () => {
    const { request } = fake();
    const vm = new NotificationSettingsViewModel(request);
    await vm.load();
    vm.toggleChannel('ORDERS', 'WHATSAPP');
    expect(vm.channelOn('ORDERS', 'WHATSAPP')).toBe(false);
  });

  it('partner offers start off and are sent only when the student turns them on', async () => {
    const { request, calls } = fake();
    const vm = new NotificationSettingsViewModel(request);
    await vm.load();
    expect(vm.draft?.marketingOptIn).toBe(false);
    vm.setMarketing(true);
    await vm.save();
    const body = JSON.parse(String(calls.find((c) => c.init?.method === 'PUT')?.init?.body)) as NotificationPreferences;
    expect(body.marketingOptIn).toBe(true);
  });
});

describe('this device', () => {
  it('reads the state and turns push on only when asked', async () => {
    const device: PushDeviceController = {
      kind: 'browser',
      state: vi.fn(async () => 'off' as const),
      enable: vi.fn(async () => 'on' as const),
      disable: vi.fn(async () => 'off' as const),
    };
    const vm = new NotificationSettingsViewModel(fake().request, device);
    await vm.loadDevice();
    expect(vm.deviceState).toBe('off');
    expect(device.enable).not.toHaveBeenCalled();
    await vm.setDevice(true);
    expect(vm.deviceState).toBe('on');
  });

  it('a failure leaves the state as it was and says so', async () => {
    const device: PushDeviceController = {
      kind: 'phone',
      state: async () => 'off',
      enable: async () => { throw new Error('no'); },
      disable: async () => 'off',
    };
    const vm = new NotificationSettingsViewModel(fake().request, device);
    await vm.loadDevice();
    await vm.setDevice(true);
    expect(vm.deviceState).toBe('off');
    expect(vm.deviceError).toBe(true);
  });
});
