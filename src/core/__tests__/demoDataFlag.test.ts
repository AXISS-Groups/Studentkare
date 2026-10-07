import { afterEach, describe, expect, it, vi } from 'vitest';

describe('the demo flag', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('stays off outside the dev server, even with VITE_DEMO_DATA=true', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_DEMO_DATA', 'true');
    const { demoDataEnabled } = await import('../env.web');
    expect(demoDataEnabled()).toBe(false);
  });

  it('turns on with `npm run dev:demo` (mode "demo") on the dev server, never in a build', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '');
    vi.stubEnv('MODE', 'demo');
    vi.stubEnv('DEV', true);
    const { demoDataEnabled } = await import('../env.web');
    expect(demoDataEnabled()).toBe(true);
    vi.stubEnv('DEV', false);
    expect(demoDataEnabled()).toBe(false);
  });

  it('turns on only on the dev server with VITE_DEMO_DATA=true', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_DEMO_DATA', 'true');
    const { demoDataEnabled } = await import('../env.web');
    expect(demoDataEnabled()).toBe(true);
    vi.stubEnv('VITE_DEMO_DATA', 'false');
    expect(demoDataEnabled()).toBe(false);
  });
});
