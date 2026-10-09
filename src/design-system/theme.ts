import { Appearance, Platform } from 'react-native';
import './rnWebStyles';
import { skTokens } from '@/theme/tokens/generated/skTokens';

type Palette = Record<keyof typeof skTokens.color.light, string>;

/** `surface2` → `--sk-color-surface-2`, `positiveBg` → `--sk-color-positive-bg` (the generated CSS names). */
export function cssVarName(key: string): string {
  return `--sk-color-${key.replace(/([A-Z])/g, '-$1').replace(/([a-z])(\d)/g, '$1-$2').toLowerCase()}`;
}

function webPalette(): Palette {
  const entries = Object.keys(skTokens.color.light).map((key) => [key, `var(${cssVarName(key)})`]);
  return Object.fromEntries(entries) as Palette;
}

/**
 * The design-system layer's single read of the generated tokens.
 *
 * Web: every colour is a CSS variable, so the whole design system flips with
 * `data-theme` (set by ThemeProvider from the person's System/Light/Dark
 * choice) without re-rendering. Native: the device's scheme when the app
 * starts; a change of system theme applies on next launch.
 */
export const color: Palette = Platform.OS === 'web'
  ? webPalette()
  : (Appearance.getColorScheme() === 'dark' ? skTokens.color.dark : skTokens.color.light);
export const { space, radius, size, shadow, motion } = skTokens;
export const font = skTokens.font;

type Weight = (typeof skTokens.font.weight)[keyof typeof skTokens.font.weight];

/** React Native takes font weights as strings. */
export function fontWeight(value: Weight): '500' | '700' | '800' {
  return value === 500 ? '500' : value === 700 ? '700' : '800';
}

/** Styles only the browser understands (focus outline, CSS transitions). Native gets nothing. */
export function webOnly<T extends object>(style: T): T | Record<string, never> {
  return Platform.OS === 'web' ? style : {};
}

/** The 3 px focus ring, 3 px offset, from DESIGN.md §3. */
export const focusRing = webOnly({
  outlineColor: color.focus,
  outlineStyle: 'solid' as const,
  outlineWidth: 3,
  outlineOffset: 3,
});
