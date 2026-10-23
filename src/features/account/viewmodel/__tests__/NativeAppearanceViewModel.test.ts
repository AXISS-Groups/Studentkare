import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeAppearanceViewModel } from '../NativeAppearanceViewModel';
import { launchAppearance } from '../../appearance';
import type { apiRequest } from '@/data/services/http';
import { applyPublicConfig, getSetting, resetPublicConfig } from '@/data/services/config';
import { publicSettingDefaults, publicSettingSpecs } from '@/generated/settings';

const asRequest = (fn: (path: string, init?: RequestInit) => Promise<unknown>) => vi.fn(fn) as unknown as typeof apiRequest;
const echo = (_: string, init?: RequestInit) => Promise.resolve(
  init?.method === 'PATCH' ? { appearance: JSON.parse(String(init.body)).appearance, updatedAt: 2 } : { appearance: 'LIGHT', updatedAt: 1 },
);

describe('NativeAppearanceViewModel', () => {
  it('shows the account’s choice', async () => {
    const vm = new NativeAppearanceViewModel('system', vi.fn(), asRequest(echo));
    await vm.load();
    expect(vm.phase).toBe('ready');
    expect(vm.preference).toBe('light');
  });

  it('never chosen shows Match my device', async () => {
    const vm = new NativeAppearanceViewModel('dark', vi.fn(), asRequest(() => Promise.resolve({ appearance: null, updatedAt: null })));
    await vm.load();
    expect(vm.preference).toBe('system');
  });

  it('cannot be changed when the account could not be read', async () => {
    const request = asRequest(() => Promise.reject(new Error('offline')));
    const apply = vi.fn();
    const vm = new NativeAppearanceViewModel('system', apply, request);
    await vm.load();
    expect(vm.phase).toBe('failed');
    await vm.choose('dark');
    expect(apply).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('saves first, then applies what the account holds', async () => {
    const order: string[] = [];
    const request = asRequest((path, init) => { order.push(init?.method ?? 'GET'); return echo(path, init); });
    const vm = new NativeAppearanceViewModel('system', (p) => order.push(`apply:${p}`), request);
    await vm.load();
    await vm.choose('dark');
    expect(order).toEqual(['GET', 'PATCH', 'apply:dark']);
    expect(vm.preference).toBe('dark');
    expect(vm.saveFailed).toBe(false);
  });

  it('a failed save changes nothing and says so', async () => {
    const apply = vi.fn();
    const vm = new NativeAppearanceViewModel('system', apply, asRequest((path, init) => (init?.method === 'PATCH' ? Promise.reject(new Error('offline')) : echo(path, init))));
    await vm.load();
    await vm.choose('dark');
    expect(apply).not.toHaveBeenCalled();
    expect(vm.preference).toBe('light');
    expect(vm.saveFailed).toBe(true);
    expect(vm.saving).toBe(false);
  });

  it('an unconfirmed save is a failure', async () => {
    const apply = vi.fn();
    const vm = new NativeAppearanceViewModel('system', apply, asRequest((path, init) => (init?.method === 'PATCH' ? Promise.resolve({ appearance: 'LIGHT' }) : echo(path, init))));
    await vm.load();
    await vm.choose('dark');
    expect(apply).not.toHaveBeenCalled();
    expect(vm.saveFailed).toBe(true);
  });
});

describe('launchAppearance (native boot)', () => {
  const KEY = 'appearance.boot_wait_ms';
  const wait = () => getSetting(KEY);
  /** A request that only ends when the boot gives up on it, or `answerAt` ms in. */
  const slow = (answerAt = Number.POSITIVE_INFINITY) => asRequest((_, init) => new Promise((resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    if (Number.isFinite(answerAt)) setTimeout(() => resolve({ appearance: 'DARK', updatedAt: 1 }), answerAt);
  }));
  /** Whether the launch has settled after `ms` of fake time. */
  async function settledAfter(pending: Promise<unknown>, ms: number): Promise<boolean> {
    let settled = false;
    void pending.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(ms);
    return settled;
  }

  afterEach(() => {
    resetPublicConfig();
    vi.useRealTimers();
  });

  it('returns the account’s choice', async () => {
    await expect(launchAppearance(asRequest(() => Promise.resolve({ appearance: 'DARK', updatedAt: 1 })), wait)).resolves.toBe('dark');
  });

  it.each([
    ['signed out', () => Promise.reject(new Error('401'))],
    ['never chosen', () => Promise.resolve({ appearance: null, updatedAt: null })],
    ['malformed', () => Promise.resolve({ appearance: 'night' })],
  ])('follows the phone when %s', async (_, fn) => {
    await expect(launchAppearance(asRequest(fn), wait)).resolves.toBe('system');
  });

  it('never waits past the registry default when no override is loaded', async () => {
    vi.useFakeTimers();
    const limit = publicSettingDefaults[KEY];
    const pending = launchAppearance(slow(), wait);
    expect(await settledAfter(pending, limit - 1)).toBe(false);
    expect(await settledAfter(pending, 1)).toBe(true);
    await expect(pending).resolves.toBe('system');
  });

  it('a shorter override from /config/public cuts the wait', async () => {
    vi.useFakeTimers();
    const shorter = Math.floor(publicSettingDefaults[KEY] / 2);
    applyPublicConfig({ settings: { [KEY]: shorter } });
    const pending = launchAppearance(slow(), wait);
    expect(await settledAfter(pending, shorter)).toBe(true);
    await expect(pending).resolves.toBe('system');
  });

  it('a longer override that arrives during the wait extends it, counted from the start', async () => {
    vi.useFakeTimers();
    const limit = publicSettingDefaults[KEY];
    let loaded: () => void = () => undefined;
    const settingsReady = new Promise<void>((resolve) => { loaded = resolve; });
    // The account answers after the default would have given up, before the override's limit.
    const pending = launchAppearance(slow(limit + 1), wait, settingsReady);
    await vi.advanceTimersByTimeAsync(1);
    applyPublicConfig({ settings: { [KEY]: limit * 2 } });
    loaded();
    expect(await settledAfter(pending, limit)).toBe(true);
    await expect(pending).resolves.toBe('dark');
  });

  it('an out-of-bounds override is ignored and the default still bounds the wait', async () => {
    vi.useFakeTimers();
    const { max } = publicSettingSpecs[KEY];
    applyPublicConfig({ settings: { [KEY]: (max ?? 0) + 1 } });
    const pending = launchAppearance(slow(), wait);
    expect(await settledAfter(pending, publicSettingDefaults[KEY])).toBe(true);
  });
});
