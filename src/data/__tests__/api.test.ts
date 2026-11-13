import { afterEach, describe, expect, it, vi } from 'vitest';
import { agentApi, publicConfigApi } from '../api';

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe('publicConfigApi.getPublicConfig', () => {
  it('returns what the server publishes', async () => {
    const fetchMock = vi.fn(async () => json({ otp: { channel: 'EMAIL', ttlSeconds: 120 } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await publicConfigApi.getPublicConfig()).toEqual({ otp: { channel: 'EMAIL', ttlSeconds: 120 } });
    expect(fetchMock).toHaveBeenCalledWith('/api/config/public');
  });

  it.each([
    ['the server answers with an error', async () => json({ detail: 'no' }, false)],
    ['the network is down', async () => { throw new Error('offline'); }],
  ])('falls back to everything-off defaults when %s', async (_case, respond) => {
    vi.stubGlobal('fetch', vi.fn(respond));
    const config = await publicConfigApi.getPublicConfig();
    // Analytics and push must never switch themselves on because a request failed.
    expect(config.posthog.enabled).toBe(false);
    expect(config.posthog.apiKey).toBe('');
    expect(config.firebase.enabled).toBe(false);
    expect(config.firebase.apiKey).toBe('');
    expect(config.twofa.enforcedRoles).toEqual(['SUPER_ADMIN']);
  });
});

describe('agentApi.adjudicateClaim', () => {
  it('posts the claim and returns the server answer', async () => {
    const fetchMock = vi.fn(async () => json({ decision: 'REVIEW' }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await agentApi.adjudicateClaim({ id: 'c1' })).toEqual({ decision: 'REVIEW' });
    expect(fetchMock).toHaveBeenCalledWith('/api/claims/adjudicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim: { id: 'c1' } }),
    });
  });

  it.each([
    ['the server refuses', async () => json({ detail: 'no' }, false)],
    ['the network is down', async () => { throw new Error('offline'); }],
  ])('returns null, never an invented decision, when %s', async (_case, respond) => {
    vi.stubGlobal('fetch', vi.fn(respond));
    expect(await agentApi.adjudicateClaim({ id: 'c1' })).toBeNull();
  });
});
