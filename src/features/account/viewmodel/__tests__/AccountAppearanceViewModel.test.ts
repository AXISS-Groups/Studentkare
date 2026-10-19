import { describe, expect, it, vi } from 'vitest';
import { AccountAppearanceViewModel } from '../AccountAppearanceViewModel';
import type { ThemePreference } from '../../appearance';
import type { apiRequest } from '@/data/services/http';

type Call = { path: string; init?: RequestInit };

/** A device whose theme the view model drives, and a fake server. */
function setup(server: (call: Call) => Promise<unknown>, cached: ThemePreference = 'light') {
  let current = cached;
  const applied: ThemePreference[] = [];
  const calls: Call[] = [];
  const request = vi.fn((path: string, init?: RequestInit) => {
    const call = { path, init };
    calls.push(call);
    return server(call);
  }) as unknown as typeof apiRequest;
  const vm = new AccountAppearanceViewModel((p) => { current = p; applied.push(p); }, () => current, request);
  /** What ThemeProvider + the provider do when the person picks something. */
  const userPicks = async (p: ThemePreference) => { current = p; await vm.preferenceChanged(p); };
  const patches = () => calls.filter((c) => c.init?.method === 'PATCH').map((c) => JSON.parse(String(c.init?.body)));
  return { vm, applied, calls, patches, userPicks, current: () => current };
}

const answer = (appearance: string | null) => Promise.resolve({ appearance, updatedAt: appearance ? 1 : null });
const echo = (call: Call) => call.init?.method === 'PATCH'
  ? answer(JSON.parse(String(call.init.body)).appearance)
  : answer(null);

describe('AccountAppearanceViewModel', () => {
  it('signed out: the choice stays on this device and nothing is sent', async () => {
    const s = setup(echo);
    await s.userPicks('dark');
    expect(s.calls).toEqual([]);
    expect(s.vm.state).toBe('device');
  });

  it('on sign-in, applies the account’s choice over the cached one, without writing it back', async () => {
    const s = setup((c) => (c.init?.method === 'PATCH' ? echo(c) : answer('DARK')), 'light');
    await s.vm.setSignedIn(true);
    expect(s.applied).toEqual(['dark']);
    expect(s.current()).toBe('dark');
    await s.vm.preferenceChanged('dark'); // ThemeProvider echoes the change back
    expect(s.patches()).toEqual([]);
    expect(s.vm.state).toBe('synced');
  });

  it('an account that never chose leaves the device alone and is not written to', async () => {
    const s = setup(echo, 'dark');
    await s.vm.setSignedIn(true);
    expect(s.applied).toEqual([]);
    expect(s.current()).toBe('dark');
    expect(s.patches()).toEqual([]);
    expect(s.vm.state).toBe('synced');
  });

  it('saves every later choice to the account', async () => {
    const s = setup(echo);
    await s.vm.setSignedIn(true);
    await s.userPicks('system');
    await s.userPicks('dark');
    expect(s.patches()).toEqual([{ appearance: 'SYSTEM' }, { appearance: 'DARK' }]);
    expect(s.calls.every((c) => c.path === '/profile/appearance')).toBe(true);
    expect(s.vm.state).toBe('synced');
  });

  it('offline: the choice still applies here, the save is reported as failed, and retry sends it', async () => {
    let online = false;
    const s = setup((c) => (online ? echo(c) : Promise.reject(new Error('offline'))), 'light');
    await s.vm.setSignedIn(true);
    expect(s.vm.state).toBe('loadFailed');
    expect(s.current()).toBe('light');

    await s.userPicks('dark');
    expect(s.current()).toBe('dark');
    expect(s.vm.state).toBe('saveFailed');

    online = true;
    await s.vm.retry();
    expect(s.patches()[s.patches().length - 1]).toEqual({ appearance: 'DARK' });
    expect(s.vm.state).toBe('synced');
  });

  it('a save the server does not confirm is a failure, not a success', async () => {
    const s = setup((c) => (c.init?.method === 'PATCH' ? answer('LIGHT') : answer(null)));
    await s.vm.setSignedIn(true);
    await s.userPicks('dark');
    expect(s.vm.state).toBe('saveFailed');
  });

  it('a choice made while the account is being read wins over what comes back', async () => {
    let release: (v: unknown) => void = () => undefined;
    const s = setup((c) => (c.init?.method === 'PATCH' ? echo(c) : new Promise((r) => { release = r; })), 'light');
    const signingIn = s.vm.setSignedIn(true);
    expect(s.vm.state).toBe('checking');
    await s.userPicks('dark');
    expect(s.patches()).toEqual([]);
    release({ appearance: 'LIGHT', updatedAt: 1 });
    await signingIn;
    expect(s.current()).toBe('dark');
    expect(s.applied).toEqual([]);
    expect(s.patches()).toEqual([{ appearance: 'DARK' }]);
  });

  it('a malformed answer counts as never chosen', async () => {
    const s = setup((c) => (c.init?.method === 'PATCH' ? echo(c) : Promise.resolve({ appearance: 'sepia' })), 'light');
    await s.vm.setSignedIn(true);
    expect(s.applied).toEqual([]);
    expect(s.vm.state).toBe('synced');
  });

  it('signing out stops saving; the look stays on this device', async () => {
    const s = setup(echo);
    await s.vm.setSignedIn(true);
    await s.vm.setSignedIn(false);
    await s.userPicks('dark');
    expect(s.patches()).toEqual([]);
    expect(s.vm.state).toBe('device');
    expect(s.current()).toBe('dark');
  });

  it('an answer for a session that has since ended is ignored', async () => {
    let release: (v: unknown) => void = () => undefined;
    const s = setup(() => new Promise((r) => { release = r; }), 'light');
    const signingIn = s.vm.setSignedIn(true);
    await s.vm.setSignedIn(false);
    release({ appearance: 'DARK', updatedAt: 1 });
    await signingIn;
    expect(s.applied).toEqual([]);
    expect(s.vm.state).toBe('device');
  });
});
