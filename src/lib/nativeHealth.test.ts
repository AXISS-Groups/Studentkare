import { describe, expect, it } from 'vitest';
import { describeNativeSupport, WebNativeHealthAdapter } from './nativeHealth';

describe('native health adapter', () => {
  it('reports unsupported in a browser without a native bridge', () => {
    const state = describeNativeSupport();
    // In a browser test env there is no React Native bridge.
    expect(state.supported).toBe(false);
    expect(state.detail.length).toBeGreaterThan(0);
  });

  it('requestPermission returns unsupported without a bridge', async () => {
    const adapter = new WebNativeHealthAdapter();
    expect(await adapter.requestPermission()).toBe('unsupported');
  });

  it('readRecent returns an empty list without a bridge', async () => {
    const adapter = new WebNativeHealthAdapter();
    expect(await adapter.readRecent('heart')).toEqual([]);
  });
});
