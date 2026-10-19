import { describe, expect, it, vi } from 'vitest';
import { NativeAppearanceViewModel } from '../NativeAppearanceViewModel';
import { launchAppearance } from '../../appearance';
import type { apiRequest } from '@/data/services/http';

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
  it('returns the account’s choice', async () => {
    await expect(launchAppearance(asRequest(() => Promise.resolve({ appearance: 'DARK', updatedAt: 1 })), 100)).resolves.toBe('dark');
  });

  it.each([
    ['signed out', () => Promise.reject(new Error('401'))],
    ['never chosen', () => Promise.resolve({ appearance: null, updatedAt: null })],
    ['malformed', () => Promise.resolve({ appearance: 'night' })],
  ])('follows the phone when %s', async (_, fn) => {
    await expect(launchAppearance(asRequest(fn), 100)).resolves.toBe('system');
  });

  it('never waits past the timeout', async () => {
    vi.useFakeTimers();
    try {
      const hang = asRequest((_, init) => new Promise((__, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))));
      const pending = launchAppearance(hang, 1500);
      await vi.advanceTimersByTimeAsync(1500);
      await expect(pending).resolves.toBe('system');
    } finally {
      vi.useRealTimers();
    }
  });
});
