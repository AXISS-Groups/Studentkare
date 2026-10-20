import { describe, expect, it } from 'vitest';
import { skTokens } from '../generated/skTokens';

import { CVD, deltaE, seenAs } from './cvd';
import { composite, contrast, luminance } from './wcag';

/**
 * Chart, overlay, on-navy, paper and QR tokens (AGENTS.md rule 11). Values come
 * only from the token source; pass marks only from contrastMinimum. Translucent
 * tokens (#RRGGBBAA) are checked on their composite over the surface they sit on.
 * Illustration, art-tint and decor tokens are decorative (never text or the only
 * carrier of meaning), so they have no contrast floor; only their dark-mode
 * restraint is checked.
 */
const { text: AA_TEXT, nonText: AA_NON_TEXT } = skTokens.contrastMinimum;
/** Test fixture: CIE76 ΔE below which two simulated colours read as the same series side by side. */
const MIN_CVD_DELTA_E = 8;

type Scheme = 'light' | 'dark';
type Role = keyof typeof skTokens.color.light;
const schemes: Scheme[] = ['light', 'dark'];
const palette = (scheme: Scheme): Record<Role, string> => skTokens.color[scheme];

const chartRoles = Object.keys(skTokens.color.light).filter((k) => k.startsWith('chartCategorical')) as Role[];
const ratioOn = (scheme: Scheme, fg: Role, bg: Role) => {
  const p = palette(scheme);
  return contrast(composite(p[fg], p[bg]), p[bg]);
};
const failures = (scheme: Scheme, pairs: [Role, Role][], min: number) =>
  pairs.map(([fg, bg]) => ({ fg, bg, r: ratioOn(scheme, fg, bg) })).filter(({ r }) => r < min).map(({ fg, bg, r }) => `${fg} on ${bg}: ${r.toFixed(2)}`);

describe('chart-categorical', () => {
  it('has eight series, the first in the navy family', () => {
    expect(chartRoles).toHaveLength(8);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(skTokens.color.light.chartCategorical1.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  for (const scheme of schemes) {
    it(`${scheme}: every series is >= ${AA_NON_TEXT}:1 as a mark on canvas, surface and surface-2`, () => {
      const pairs = (['canvas', 'surface', 'surface2'] as Role[]).flatMap((bg) => chartRoles.map((fg): [Role, Role] => [fg, bg]));
      expect(failures(scheme, pairs, AA_NON_TEXT)).toEqual([]);
    });

    it(`${scheme}: any two series stay apart under deuteranopia, protanopia and tritanopia`, () => {
      const p = palette(scheme);
      const tooClose = Object.entries(CVD).flatMap(([name, matrix]) =>
        chartRoles.flatMap((a, i) => chartRoles.slice(i + 1).flatMap((b) => {
          const d = deltaE(seenAs(p[a], matrix), seenAs(p[b], matrix));
          return d < MIN_CVD_DELTA_E ? [`${name}: ${a}/${b} ΔE ${d.toFixed(1)}`] : [];
        })));
      expect(tooClose).toEqual([]);
    });
  }
});

for (const scheme of schemes) {
  describe(`${scheme}: on the navy`, () => {
    const navy: Role[] = ['heroBg', 'brandNavy', 'navBg', 'sidebar'];

    it('on-hero-attention and nav-danger are AA text on every navy surface', () => {
      const pairs = navy.flatMap((bg) => (['onHeroAttention', 'navDanger'] as Role[]).map((fg): [Role, Role] => [fg, bg]));
      expect(failures(scheme, pairs, AA_TEXT)).toEqual([]);
    });

    it('on-hero and on-hero-2 stay AA on the on-hero-veil fill', () => {
      const p = palette(scheme);
      const veil = composite(p.onHeroVeil, p.heroBg);
      for (const fg of ['onHero', 'onHero2'] as Role[]) expect(contrast(p[fg], veil), fg).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('the filled progress (on-hero) is >= 3:1 against the on-hero-track', () => {
      const p = palette(scheme);
      expect(contrast(p.onHero, composite(p.onHeroTrack, p.heroBg))).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });

    it('on-hero-veil, on-hero-track and on-hero-rule are translucent light fills (they follow whatever navy is behind them)', () => {
      const p = palette(scheme);
      for (const role of ['onHeroVeil', 'onHeroTrack', 'onHeroRule'] as Role[]) {
        expect(p[role], role).toMatch(/^#[0-9A-F]{8}$/);
        expect(luminance(composite(p[role], p.heroBg)), role).toBeGreaterThan(luminance(p.heroBg));
      }
    });
  });

  describe(`${scheme}: on action`, () => {
    it('on-action-2 is AA muted text on action and action-hover', () => {
      expect(failures(scheme, [['onAction2', 'action'], ['onAction2', 'actionHover']], AA_TEXT)).toEqual([]);
    });
  });

  describe(`${scheme}: scrims`, () => {
    it('are translucent and darken the page behind them; scrim-strong darkens more', () => {
      const p = palette(scheme);
      for (const role of ['scrim', 'scrimStrong'] as Role[]) {
        expect(p[role], role).toMatch(/^#[0-9A-F]{8}$/);
        expect(luminance(composite(p[role], p.canvas)), role).toBeLessThan(luminance(p.canvas));
      }
      expect(luminance(composite(p.scrimStrong, p.surface))).toBeLessThan(luminance(composite(p.scrim, p.surface)));
    });

  });

  describe(`${scheme}: paper prescription`, () => {
    it('paper-ink and paper-ink-2 are AA on paper', () => {
      expect(failures(scheme, [['paperInk', 'paper'], ['paperInk2', 'paper']], AA_TEXT)).toEqual([]);
    });
  });
}

describe('light: a surface sheet stands out from the scrimmed page', () => {
  // Dark sheets separate by their rule border and the darker scrim, not by 3:1 fill contrast.
  it('>= 3:1', () => {
    const p = skTokens.color.light;
    expect(contrast(p.surface, composite(p.scrim, p.canvas))).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe('paper stays a light sheet in dark mode', () => {
  it('dark paper is lighter than its ink and than every dark surface; the ink does not change', () => {
    const p = skTokens.color.dark;
    expect(luminance(p.paper)).toBeGreaterThan(luminance(p.paperInk));
    for (const surface of ['canvas', 'surface', 'surface2', 'surface3'] as Role[]) expect(luminance(p.paper), surface).toBeGreaterThan(luminance(p[surface]));
    expect(p.paperInk).toBe(skTokens.color.light.paperInk);
    expect(p.paperInk2).toBe(skTokens.color.light.paperInk2);
  });
});

describe('QR codes never invert', () => {
  it('qr-foreground and qr-background are identical in both schemes', () => {
    expect(skTokens.color.dark.qrForeground).toBe(skTokens.color.light.qrForeground);
    expect(skTokens.color.dark.qrBackground).toBe(skTokens.color.light.qrBackground);
  });

  it('dark modules on a light background, AA or better', () => {
    const { qrForeground, qrBackground } = skTokens.color.light;
    expect(luminance(qrForeground)).toBeLessThan(luminance(qrBackground));
    expect(contrast(qrForeground, qrBackground)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('dark illustration tints do not glare', () => {
  it('every illustration soft tint is darker in dark mode than in light', () => {
    const softs = Object.keys(skTokens.color.light).filter((k) => /^illustration\w+Soft$/.test(k)) as Role[];
    expect(softs.length).toBeGreaterThan(0);
    for (const role of softs) expect(luminance(skTokens.color.dark[role]), role).toBeLessThan(luminance(skTokens.color.light[role]));
  });

  it('art tints and the illustration highlight are dimmed in dark mode', () => {
    const roles = [...Object.keys(skTokens.color.light).filter((k) => k.startsWith('artTint')), 'illustrationHighlight'] as Role[];
    for (const role of roles) expect(luminance(skTokens.color.dark[role]), role).toBeLessThan(luminance(skTokens.color.light[role]));
  });
});

describe('the token source declares the opaque new pairs, so skTokens.test checks them too', () => {
  const declared = skTokens.contrastPairs.map(({ fg, bg }) => `${fg}/${bg}`);
  const required = [
    'onHeroAttention/heroBg', 'navDanger/navBg', 'navDanger/sidebar', 'paperInk/paper', 'paperInk2/paper', 'qrForeground/qrBackground',
    ...chartRoles.flatMap((role) => [`${role}/canvas`, `${role}/surface`]),
  ];
  it.each(required)('%s', (pair) => {
    expect(declared).toContain(pair);
  });
});
