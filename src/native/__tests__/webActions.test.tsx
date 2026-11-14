import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertButton } from 'react-native';
const native = vi.hoisted(() => ({ alert: vi.fn(), open: vi.fn(), site: 'https://test.studentkare.example/' }));
vi.mock('react-native', async (original) => ({ ...(await original<typeof import('react-native')>()), Alert: { alert: native.alert }, Linking: { openURL: native.open } }));
vi.mock('@/core/env', () => ({ publicHomeUrl: () => native.site }));
import { nativeWebActionUrl, useNativeWebAction } from '../webActions';
beforeEach(() => { vi.clearAllMocks(); native.site = 'https://test.studentkare.example/'; native.open.mockResolvedValue(undefined); });
afterEach(() => vi.unstubAllGlobals());
describe('native website handoffs', () => {
  it('works with React Native’s incomplete URL implementation and preserves a configured site path', () => {
    vi.stubGlobal('URL', class { constructor() { throw new Error('not implemented'); } });
    expect(nativeWebActionUrl('support', 'https://test.studentkare.example/app/')).toBe('https://test.studentkare.example/app/support');
  });
  it('explains export before opening a configured site without an app token', () => {
    const { result } = renderHook(useNativeWebAction);
    act(() => result.current('export'));
    expect(native.open).not.toHaveBeenCalled();
    const [title, body, buttons] = native.alert.mock.calls[0] as [string, string, AlertButton[]];
    expect(title).toBe('Download my data');
    expect(body).toMatch(/Sign in there/);
    expect(body).toMatch(/cannot save an export file/);
    act(() => buttons.find((b) => b.text === 'Open website')?.onPress?.());
    expect(native.open).toHaveBeenCalledWith('https://test.studentkare.example/data-export');
  });
  it.each(['/', 'http://example.com', 'javascript:alert(1)', 'https://user:password@example.com', 'https://example.com?token=x', 'https://example.com#token=x', 'https://example..com', 'https://example.com\\evil', 'https://example.com/%40secret'])('has no browser action for unsafe or missing site %s', (site) => {
    native.site = site;
    const { result } = renderHook(useNativeWebAction);
    act(() => result.current('support'));
    expect(nativeWebActionUrl('support', site)).toBeNull();
    expect(native.alert.mock.calls[0][2]).toHaveLength(1);
    expect(native.open).not.toHaveBeenCalled();
  });
  it('reports a browser failure without exposing its error', async () => {
    native.open.mockRejectedValue(new Error('synthetic-sensitive-error'));
    const { result } = renderHook(useNativeWebAction);
    act(() => result.current('support'));
    const buttons = native.alert.mock.calls[0][2] as AlertButton[];
    await act(async () => buttons[1]?.onPress?.());
    expect(native.alert.mock.calls[1][1]).toMatch(/could not be opened/);
    expect(JSON.stringify(native.alert.mock.calls)).not.toContain('synthetic-sensitive-error');
  });
  it('keeps unreviewed LifeShare unavailable', () => {
    const { result } = renderHook(useNativeWebAction);
    act(() => result.current('lifeshare'));
    expect(native.alert.mock.calls[0][1]).toMatch(/not available in the app/);
    expect(native.alert.mock.calls[0][2]).toHaveLength(1);
  });
});
