import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { color, webOnly } from '../theme';

/**
 * A token gradient behind its children (Mobile 2.0 heroes, service tiles, the
 * pill nav, the Ayush orb). Web: a CSS gradient of token variables, over a flat
 * fill of the last stop so text stays legible if the browser drops the image.
 * Native: Gradient.native.tsx draws the same stops with react-native-svg.
 *
 * Colours are token values only (`color.serviceGreenDeep`, never hex). White
 * text sits on the deep end (`-deep` to `-shade`), never on a light stop
 * (DESIGN.md §3, service palette).
 */
export interface GradientProps {
  /** Two or more token colours, first to last. */
  colors: readonly string[];
  /** CSS angle in degrees (150 = top-left to bottom-right, as on the boards). */
  angle?: number;
  /** A radial glow instead of a line: centre as fractions of the box. */
  radial?: { x: number; y: number };
  /** The glossy highlight in the top-left corner (service tiles). Decoration only. */
  gloss?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}

const PERCENT = 100;

/** The CSS for the gradient layers (exported for tests). */
export function gradientCss({ colors, angle = 150, radial, gloss = false }: Pick<GradientProps, 'colors' | 'angle' | 'radial' | 'gloss'>): string {
  const stops = colors.join(', ');
  const body = radial
    ? `radial-gradient(circle at ${radial.x * PERCENT}% ${radial.y * PERCENT}%, ${stops})`
    : `linear-gradient(${angle}deg, ${stops})`;
  const shine = `radial-gradient(circle at 28% 22%, color-mix(in srgb, ${color.illustrationHighlight} 55%, transparent), transparent 46%)`;
  return gloss ? `${shine}, ${body}` : body;
}

export function Gradient({ colors, angle, radial, gloss, style, children, testID, pointerEvents }: GradientProps): React.ReactElement {
  const flat = colors[colors.length - 1] ?? color.surface;
  return (
    <View testID={testID} style={[{ backgroundColor: flat }, pointerEvents ? { pointerEvents } : null, style, webOnly({ backgroundImage: gradientCss({ colors, angle, radial, gloss }) })]}>
      {children}
    </View>
  );
}
