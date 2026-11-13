import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ theme: null as unknown }));
vi.mock('@/design-system/nativeScheme', () => ({ nativeColorScheme: () => 'dark' }));
vi.mock('@react-navigation/native', () => ({
  DefaultTheme: { fonts: {} },
  NavigationContainer: ({ children, theme }: { children?: React.ReactNode; theme: unknown }) => { state.theme = theme; return <>{children}</>; },
  useNavigation: vi.fn(),
  useNavigationState: vi.fn(),
}));

import { skTokens } from '@/theme/tokens/generated/skTokens';
import { navigationThemeFor } from '../navigationTheme';
import { NavigationProvider } from '../navigation';

afterEach(cleanup);

describe('native navigation appearance', () => {
  it.each(['light', 'dark'] as const)('uses the shared semantic %s palette', (scheme) => {
    const palette = skTokens.color[scheme];
    const theme = navigationThemeFor(scheme);
    expect(theme.dark).toBe(scheme === 'dark');
    expect(theme.colors).toEqual({ primary: palette.action, background: palette.canvas, card: palette.surface,
      text: palette.text, border: palette.rule, notification: palette.danger });
    expect(Object.values(theme.colors).every((value) => typeof value === 'string')).toBe(true);
    expect(theme.fonts).toBeDefined();
  });

  it('passes the resolved boot palette into the actual native provider', () => {
    render(<NavigationProvider />);
    expect(state.theme).toEqual(navigationThemeFor('dark'));
  });
});
