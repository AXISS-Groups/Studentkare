/**
 * WCAG 2.1 relative luminance and contrast ratio, for the token tests. The
 * coefficients are the WCAG definition itself; the pass marks are not here
 * but in the token source (skTokens.contrastMinimum).
 */
export function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * A translucent token (#RRGGBBAA) composited over an opaque background, as the
 * eye sees it. A 6-digit hex is returned unchanged. Contrast of a translucent
 * colour is only meaningful on the composite.
 */
export function composite(fg: string, bg: string): string {
  const v = fg.replace('#', '');
  if (v.length !== 8) return fg;
  const alpha = parseInt(v.slice(6, 8), 16) / 255;
  const back = bg.replace('#', '');
  const channel = (i: number) => Math.round(parseInt(v.slice(i, i + 2), 16) * alpha + parseInt(back.slice(i, i + 2), 16) * (1 - alpha));
  return `#${[0, 2, 4].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`;
}
