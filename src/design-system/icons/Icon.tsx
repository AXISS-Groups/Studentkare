// Student Kare icons — the ONLY way screens draw icons.
// Data comes from ./generated/skIconData.ts (run `node scripts/icons/build-icons.mjs`).
// Web/react-native-web build: renders DOM <svg>. Native build: see Icon.native.tsx (react-native-svg).
import React from 'react';
import { skIcons, skIcons3d, skGlyphs, skIllustrations, skBrandLogo, type SkIconName, type SkIcon3dName, type SkGlyphName, type SkIllustrationName } from './generated/skIconData';

type A11y = {
  /** Accessible name. Leave empty when the icon sits next to visible text — it is then hidden from screen readers. */
  label?: string;
  style?: React.CSSProperties;
  className?: string;
  testID?: string;
};

const a11y = (label?: string) =>
  label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const, focusable: 'false' as const };

export interface IconProps extends A11y {
  name: SkIconName;
  /** px, default 24. Hit areas are the parent's job (min 44 px). */
  size?: number;
  /** Any token value, e.g. var(--sk-color-action). Defaults to currentColor. */
  color?: string;
  /** Line icons only. Designs use 1.6–2.4; default 2. */
  strokeWidth?: number;
}

/** 24 px line / solid icon. */
export function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 2, label, style, className, testID }: IconProps) {
  const def = skIcons[name];
  if (!def) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) console.error(`[Icon] unknown icon "${String(name)}"`);
    return null;
  }
  const line = def.mode === 'line';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={line ? 'none' : color}
      stroke={line ? color : 'none'}
      strokeWidth={line ? strokeWidth : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
      data-testid={testID}
      data-icon={name}
      {...a11y(label)}
    >
      {label ? <title>{label}</title> : null}
      {def.els.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

function Raw({ svg, size, label, style, className, testID, kind, name }: A11y & { svg: string; size: number; kind: string; name: string }) {
  // Gradient and clip ids are made unique per instance: the same artwork drawn twice
  // (e.g. a hidden phone header and the sidebar) would otherwise share ids, and a
  // url(#id) that resolves into a display:none copy paints nothing.
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // Artwork is generated from the design files at build time (trusted, no user input).
  const html = svg.replace(/\bid="([^"]+)"/g, `id="$1-${uid}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${uid})`).replace(/<svg\b([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg\b([^>]*?)\sheight="[^"]*"/, '<svg$1')
    .replace('<svg', `<svg width="${size}" height="${size}"`);
  return (
    <span
      style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, ...style }}
      className={className}
      data-testid={testID}
      data-icon={`${kind}:${name}`}
      {...a11y(label)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export interface Icon3dProps extends A11y {
  name: SkIcon3dName;
  /** px, default 72. */
  size?: number;
  /** Keeps the hover motion running (e.g. a new alert). Stops under prefers-reduced-motion. */
  live?: boolean;
}

/** Glossy 3D icon tile. Use only where the design shows one. */
export function Icon3d({ name, size = 72, live = false, ...rest }: Icon3dProps) {
  const svg = skIcons3d[name];
  if (!svg) return null;
  return <Raw svg={live ? svg.replace('class="ski ', 'class="ski is-live ') : svg} size={size} kind="3d" name={name} {...rest} />;
}

export interface GlyphProps extends A11y { name: SkGlyphName; size?: number }
/** Small badges and glyphs that are not on the 24 px grid. */
export function Glyph({ name, size = 24, ...rest }: GlyphProps) {
  const svg = skGlyphs[name];
  if (!svg) return null;
  return <Raw svg={svg} size={size} kind="glyph" name={name} {...rest} />;
}

export interface IllustrationProps extends A11y { name: SkIllustrationName; size?: number }
/** Inline SVG illustration from the canvas (decorative unless you pass a label). */
export function Illustration({ name, size = 120, ...rest }: IllustrationProps) {
  const svg = skIllustrations[name];
  if (!svg) return null;
  return <Raw svg={svg} size={size} kind="illustration" name={name} {...rest} />;
}

/** The Student Kare shield. Pair with the wordmark text "Student Kare" ("Kare" in Georgia italic). */
export function BrandLogo({ size = 24, label = 'Student Kare', ...rest }: A11y & { size?: number }) {
  return <Raw svg={skBrandLogo} size={size} kind="brand" name="studentkare-logo" label={label} {...rest} />;
}

export type { SkIconName, SkIcon3dName, SkGlyphName, SkIllustrationName };
