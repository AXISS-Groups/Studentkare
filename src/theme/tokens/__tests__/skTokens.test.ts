import { describe, expect, it } from 'vitest';
import source from '../../../../design/tokens/studentkare.tokens.json';
import { skTokens } from '../generated/skTokens';

// WCAG 2.1 relative luminance and contrast ratio.
function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Scheme = 'light' | 'dark';
const schemes: Scheme[] = ['light', 'dark'];

describe('design tokens', () => {
  it('generated file matches the token source (run `npm run tokens:build`)', () => {
    const camel = (k: string) => k.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    for (const scheme of schemes) {
      const group = source.color[scheme] as Record<string, { $value: string }>;
      for (const [key, token] of Object.entries(group)) {
        const generated = skTokens.color[scheme] as Record<string, string>;
        expect(generated[camel(key)], `${scheme}.${key}`).toBe(token.$value);
      }
    }
  });

  it('light and dark define exactly the same colour roles', () => {
    expect(Object.keys(skTokens.color.dark).sort()).toEqual(Object.keys(skTokens.color.light).sort());
  });

  for (const scheme of schemes) {
    it(`every declared text/background pair meets WCAG AA in ${scheme} mode`, () => {
      const palette = skTokens.color[scheme] as Record<string, string>;
      const failures = skTokens.contrastPairs
        .map(({ fg, bg, min }) => ({ fg, bg, min, ratio: contrast(palette[fg], palette[bg]) }))
        .filter(({ ratio, min }) => ratio < min)
        .map(({ fg, bg, min, ratio }) => `${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
      expect(failures).toEqual([]);
    });
  }

  it('touch targets are at least 44px (AGENTS.md rule 7)', () => {
    expect(skTokens.size.touchTarget).toBeGreaterThanOrEqual(44);
    expect(skTokens.size.control).toBeGreaterThanOrEqual(44);
  });
});
