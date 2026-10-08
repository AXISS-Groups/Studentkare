import { describe, expect, it, vi } from 'vitest';
import { NotificationSettingsViewModel, isClockTime } from '../NotificationSettingsViewModel';
import type { NotificationPreferences } from '../NotificationSettingsViewModel';

const stored: NotificationPreferences = {
  emailEnabled: true, pushEnabled: true, remindersEnabled: true,
  pickupLocationEnabled: true, ayushHistoryEnabled: false,
  timezone: 'Asia/Kolkata', quietStart: '22:00', quietEnd: '08:00',
};

function fakeRequest(get: () => Promise<unknown>) {
  const calls: Array<{ path: string; init?: RequestInit }> = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    if (!init?.method) return get();
    return { success: true };
  });
  return { request: request as unknown as typeof import('@/data/http').apiRequest, calls };
}

describe('NotificationSettingsViewModel', () => {
  it('fails closed: nothing is editable when the stored settings cannot be read', async () => {
    const { request } = fakeRequest(() => Promise.reject(new Error('offline')));
    const vm = new NotificationSettingsViewModel(request);
    await vm.load();
    expect(vm.phase).toBe('failed');
    expect(vm.draft).toBeNull();
    vm.setSwitch('pushEnabled', false);
    expect(vm.canSave).toBe(false);
  });

  it('saves the consents exactly as loaded, whatever else changed', async () => {
    const { request, calls } = fakeRequest(() => Promise.resolve({ ...stored }));
    const vm = new NotificationSettingsViewModel(request);
    await vm.load();
    vm.setSwitch('emailEnabled', false);
    await vm.save();
    const put = calls.find((c) => c.init?.method === 'PUT');
    const body = JSON.parse(String(put?.init?.body)) as NotificationPreferences;
    expect(body.emailEnabled).toBe(false);
    expect(body.pickupLocationEnabled).toBe(true);
    expect(body.ayushHistoryEnabled).toBe(false);
    expect(vm.dirty).toBe(false);
    expect(vm.savedAt).not.toBeNull();
  });

  it('blocks saving a quiet-hours time the scheduler cannot read', async () => {
    const { request } = fakeRequest(() => Promise.resolve({ ...stored }));
    const vm = new NotificationSettingsViewModel(request);
    await vm.load();
    vm.setQuiet('quietStart', '25:00');
    expect(vm.quietStartError).not.toBe('');
    expect(vm.canSave).toBe(false);
    vm.setQuiet('quietStart', '23:30');
    expect(vm.canSave).toBe(true);
  });

  it('keeps the edit and says so when a save fails', async () => {
    const request = vi.fn(async (_p: string, init?: RequestInit) => {
      if (init?.method === 'PUT') throw new Error('500');
      return { ...stored };
    }) as unknown as typeof import('@/data/http').apiRequest;
    const vm = new NotificationSettingsViewModel(request);
    await vm.load();
    vm.setSwitch('pushEnabled', false);
    await vm.save();
    expect(vm.saveError).toMatch(/weren't saved/);
    expect(vm.draft?.pushEnabled).toBe(false);
    expect(vm.loaded?.pushEnabled).toBe(true);
  });

  it('loads after a dispose, as a StrictMode remount does', async () => {
    const { request } = fakeRequest(() => Promise.resolve({ ...stored }));
    const vm = new NotificationSettingsViewModel(request);
    vm.dispose();
    await vm.load();
    expect(vm.phase).toBe('ready');
  });

  it('recognises 24-hour times only', () => {
    expect(isClockTime('07:05')).toBe(true);
    expect(isClockTime('7:05')).toBe(false);
    expect(isClockTime('24:00')).toBe(false);
  });
});
