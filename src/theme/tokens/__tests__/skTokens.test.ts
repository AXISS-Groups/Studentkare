import { describe, expect, it } from 'vitest';
import source from '../../../../design/tokens/studentkare.tokens.json';
import { skTokens } from '../generated/skTokens';

import { contrast } from './wcag';

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
