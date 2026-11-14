import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('closed-schema anonymous pricing event counts', () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('sends nothing before consent, when disabled or without a key', async () => {
    const api = await import('../posthog');
    api.configurePostHog({ enabled: true, apiKey: 'public-test-key', host: 'https://analytics.example.test' });
    expect(await api.initPostHog()).toBe(false);
    expect(api.posthogCapture('pricing_plan_selected', '/pricing')).toBe(false);
    api.setPostHogConsent(true);
    api.configurePostHog({ enabled: false });
    expect(api.posthogCapture('pricing_plan_selected', '/pricing')).toBe(false);
    api.configurePostHog({ enabled: true, apiKey: '' });
    expect(api.posthogCapture('pricing_plan_selected', '/pricing')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('denies arbitrary event names, paths and sensitive routes without logging them', async () => {
    const api = await import('../posthog');
    api.configurePostHog({ enabled: true, apiKey: 'public-test-key' });
    api.setPostHogConsent(true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const route of ['/emergency/Asha', '/records', '/pricing?who=Asha', '/pricing#opaque-token', 'opaque-token']) {
      expect(api.posthogCapture('pricing_plan_selected', route)).toBe(false);
    }
    expect(api.posthogCapture('opaque-token', '/pricing')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('posts only existing event names and a fresh unrelated ID, omitting all caller properties', async () => {
    const api = await import('../posthog');
    api.configurePostHog({ enabled: true, apiKey: 'public-test-key', host: 'https://analytics.example.test/' });
    api.setPostHogConsent(true);
    expect(await api.initPostHog()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    for (const event of ['pricing_plan_selected', 'institutional_inquiry_submitted']) {
      expect(api.posthogCapture(event, '/pricing', {
        organization: 'Asha', seats: 72, distinct_id: 'opaque-token', route: '/records',
        arbitrary: { reading: 72, group: 'O+', password: 'opaque-token' },
      })).toBe(true);
    }
    const ids: string[] = [];
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toBe('https://analytics.example.test/capture/');
      const options = call[1];
      const body = JSON.parse(options.body);
      expect(body.properties).toEqual({ route: '/pricing', distinct_id: expect.stringMatching(/^[a-f0-9]{32}$/) });
      ids.push(body.properties.distinct_id);
      expect(options.body).not.toMatch(/Asha|opaque-token|seats|reading|O\+|organization|password/);
      expect(options.credentials).toBe('omit');
      expect(options.referrerPolicy).toBe('no-referrer');
    }
    expect(ids[0]).not.toBe(ids[1]);
    api.setPostHogConsent(false);
    expect(api.posthogCapture('pricing_plan_selected', '/pricing')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
