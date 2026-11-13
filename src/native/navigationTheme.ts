import { DefaultTheme } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import type { SkColorScheme } from '@/theme/tokens/generated/skTokens';
import { nativeColorScheme } from '@/design-system/nativeScheme';

/** Navigation and shared screens read the same palette after appearance boot. */
export function navigationThemeFor(scheme: SkColorScheme): Theme {
  const palette = skTokens.color[scheme];
  return {
    ...DefaultTheme,
    dark: scheme === 'dark',
    colors: {
      primary: palette.action,
      background: palette.canvas,
      card: palette.surface,
      text: palette.text,
      border: palette.rule,
      notification: palette.danger,
    },
  };
}

export const navigationTheme = navigationThemeFor(nativeColorScheme());
