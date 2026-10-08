import { Platform } from 'react-native';
import './rnWebStyles';
import { skTokens } from '@/theme/tokens/generated/skTokens';

/**
 * The design-system layer's single read of the generated tokens.
 *
 * Light palette only: dark mode is undecided for launch (DESIGN.md D3), and
 * the runtime `useTheme()` still serves the older palette (D1), so these
 * components read skTokens directly rather than through it.
 */
export const color = skTokens.color.light;
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
