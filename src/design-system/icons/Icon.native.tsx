// Native build of <Icon>. Requires react-native-svg.
// Same props and names as Icon.tsx so screens import from one place.
import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon, Ellipse, SvgXml } from 'react-native-svg';
import { color as themeColor } from '../theme';
import { skIcons, skIcons3d, skGlyphs, skIllustrations, skBrandLogo, type SkIconElement, type SkIconName, type SkIcon3dName, type SkGlyphName, type SkIllustrationName } from './generated/skIconData';

const camel = (o: Readonly<Record<string, string>>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v]));

function shape([tag, attrs]: SkIconElement, key: number) {
  const p = camel(attrs);
  switch (tag) {
    case 'path': return <Path key={key} {...p} />;
    case 'circle': return <Circle key={key} {...p} />;
    case 'rect': return <Rect key={key} {...p} />;
    case 'line': return <Line key={key} {...p} />;
    case 'polyline': return <Polyline key={key} {...p} />;
    case 'polygon': return <Polygon key={key} {...p} />;
    case 'ellipse': return <Ellipse key={key} {...p} />;
  }
}

/** Labelled → announced as an image; unlabelled → hidden from screen readers (it sits next to visible text). */
const a11y = (label?: string) => (label
  ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
  : { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const });

export function Icon({ name, size = 24, color = themeColor.text, strokeWidth = 2, label }: { name: SkIconName; size?: number; color?: string; strokeWidth?: number; label?: string }) {
  const def = skIcons[name];
  if (!def) return null;
  const line = def.mode === 'line';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={line ? 'none' : color} stroke={line ? color : 'none'}
      strokeWidth={line ? strokeWidth : undefined} strokeLinecap="round" strokeLinejoin="round" {...a11y(label)}>
      {def.els.map(shape)}
    </Svg>
  );
}
/** `live` (hover motion) is web-only; native tiles are static. */
export function Icon3d({ name, size = 72, label }: { name: SkIcon3dName; size?: number; label?: string; live?: boolean }) {
  const xml = skIcons3d[name];
  return xml ? <SvgXml xml={xml} width={size} height={size} {...a11y(label)} /> : null;
}
export function Glyph({ name, size = 24, label }: { name: SkGlyphName; size?: number; label?: string }) {
  const xml = skGlyphs[name];
  return xml ? <SvgXml xml={xml} width={size} height={size} {...a11y(label)} /> : null;
}
export function Illustration({ name, size = 120, width = size, height = size, label }: { name: SkIllustrationName; size?: number; width?: number; height?: number; label?: string }) {
  const xml = skIllustrations[name];
  return xml ? <SvgXml xml={xml} width={width} height={height} {...a11y(label)} /> : null;
}
export function BrandLogo({ size = 24, label = 'Student Kare' }: { size?: number; label?: string }) {
  return <SvgXml xml={skBrandLogo} width={size} height={size} {...a11y(label)} />;
}
export type { SkIconName, SkIcon3dName, SkGlyphName, SkIllustrationName };
