import { Platform } from 'react-native';
import './rnWebStyles';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { nativeColorScheme } from './nativeScheme';

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
 * choice) without re-rendering. Native: the account's System/Light/Dark
 * choice, read by the boot screen before this module loads (nativeScheme.ts);
 * 'system' is the phone's scheme at launch. A change applies on the next
 * launch, which the appearance setting triggers by restarting the app.
 */
export const color: Palette = Platform.OS === 'web' ? webPalette() : skTokens.color[nativeColorScheme()];
export const { space, radius, size, shadow, motion } = skTokens;
/**
 * Native cannot read a CSS font stack: handed `"Plus Jakarta Sans", …` it
 * falls back with a warning. Phones use the platform's own faces instead,
 * which also carry Telugu and Devanagari. Bundling the brand fonts natively
 * needs one registered family per weight (Android ignores fontWeight on a
 * custom face) — not done yet.
 */
const nativeFamily = {
  sans: Platform.select({ ios: 'System', default: 'sans-serif' }),
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  telugu: Platform.select({ ios: 'System', default: 'sans-serif' }),
  hindi: Platform.select({ ios: 'System', default: 'sans-serif' }),
} satisfies Record<keyof typeof skTokens.font.family, string>;
export const font = Platform.OS === 'web' ? skTokens.font : { ...skTokens.font, family: nativeFamily };

type Weight = (typeof skTokens.font.weight)[keyof typeof skTokens.font.weight];

/** React Native takes font weights as strings. */
export function fontWeight(value: Weight): '500' | '700' | '800' {
  return value === 500 ? '500' : value === 700 ? '700' : '800';
}

/** Styles only the browser understands (focus outline, CSS transitions). Native gets nothing. */
export function webOnly<T extends object>(style: T): T | Record<string, never> {
  return Platform.OS === 'web' ? style : {};
}

/** A CSS blur radius is about twice React Native's shadowRadius for the same softness. */
const CSS_BLUR_PER_SHADOW_RADIUS = 2;

export interface ShadowStyle {
  boxShadow?: string;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

/**
 * A shadow token (`0px 14px 30px 0px #13192E26`, the generated CSS form) as a
 * style. Web takes it as `boxShadow`; native (old architecture, no boxShadow)
 * gets iOS shadow props and an Android elevation equal to the token's y-offset.
 * A malformed token draws no shadow rather than throwing.
 */
export function shadowStyle(token: string): ShadowStyle {
  if (Platform.OS === 'web') return { boxShadow: token };
  const match = /^(-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px -?[\d.]+px (#[0-9A-Fa-f]{6,8})$/.exec(token.trim());
  if (!match) return {};
  const [, x, y, blur, shadowColor] = match;
  return {
    shadowColor,
    shadowOffset: { width: Number(x), height: Number(y) },
    shadowOpacity: 1,
    shadowRadius: Number(blur) / CSS_BLUR_PER_SHADOW_RADIUS,
    elevation: Math.abs(Number(y)),
  };
}

/** The 3 px focus ring, 3 px offset, from DESIGN.md §3. */
export const focusRing = webOnly({
  outlineColor: color.focus,
  outlineStyle: 'solid' as const,
  outlineWidth: 3,
  outlineOffset: 3,
});
