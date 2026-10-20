import { describe, expect, it } from 'vitest';
import { skTokens } from '../generated/skTokens';

import { contrast } from './wcag';

/**
 * The whole app in the founder's navy (2026-10-20): hero-bg is the brand navy,
 * and action (light), nav-bg, sidebar and brand-navy are the same value. Every
 * pair that sits on, or is drawn as, the navy is checked here in both schemes.
 * Values come only from the token source; pass marks only from contrastMinimum.
 */
const { text: AA_TEXT, nonText: AA_NON_TEXT } = skTokens.contrastMinimum;

type Scheme = 'light' | 'dark';
type Role = keyof typeof skTokens.color.light;
const schemes: Scheme[] = ['light', 'dark'];

/** Surfaces painted in the navy. */
const navySurfaces: Role[] = ['navBg', 'sidebar', 'brandNavy', 'heroBg'];

/** Text drawn on a navy surface in both schemes (grep sidebar-ink*, on-hero*, nav-text/label on these surfaces). */
const textOnNavy: Role[] = ['navText', 'navLabel', 'sidebarInk', 'sidebarInk2', 'sidebarInk3', 'onHero', 'onHero2'];

/** Non-text indicators drawn on a navy surface: current-page fills and the focus ring. */
const indicatorsOnNavy: Role[] = ['navCurrent', 'sidebarActive', 'heroCurrent', 'focus'];

const ratio = (scheme: Scheme, fg: Role, bg: Role) => contrast(skTokens.color[scheme][fg], skTokens.color[scheme][bg]);
const failuresOf = (scheme: Scheme, pairs: [Role, Role][], min: number) =>
  pairs
    .map(([fg, bg]) => ({ fg, bg, r: ratio(scheme, fg, bg) }))
    .filter(({ r }) => r < min)
    .map(({ fg, bg, r }) => `${fg} on ${bg}: ${r.toFixed(2)}`);

describe('one navy across the app', () => {
  it('nav-bg, sidebar and brand-navy are the hero navy in both schemes', () => {
    for (const scheme of schemes) {
      const palette = skTokens.color[scheme];
      for (const role of ['navBg', 'sidebar', 'brandNavy'] as const) expect(palette[role], `${scheme}.${role}`).toBe(palette.heroBg);
    }
  });

  it('light action is the navy; dark action stays light so buttons do not vanish on the dark canvas', () => {
    expect(skTokens.color.light.action).toBe(skTokens.color.light.heroBg);
    expect(skTokens.color.dark.action).not.toBe(skTokens.color.dark.heroBg);
    expect(ratio('dark', 'action', 'canvas')).toBeGreaterThanOrEqual(AA_TEXT);
    expect(ratio('dark', 'action', 'surface')).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

for (const scheme of schemes) {
  describe(`${scheme}: navy contrast`, () => {
    it('on-action is AA on action and action-hover', () => {
      expect(failuresOf(scheme, [['onAction', 'action'], ['onAction', 'actionHover']], AA_TEXT)).toEqual([]);
    });

    it('link/action text is AA on canvas, surface, surface-3 and the action-soft tint', () => {
      const pairs: [Role, Role][] = [['action', 'canvas'], ['action', 'surface'], ['action', 'surface3'], ['action', 'actionSoft']];
      expect(failuresOf(scheme, pairs, AA_TEXT)).toEqual([]);
    });

    it('every text token drawn on a navy surface is AA', () => {
      const pairs = navySurfaces.flatMap((bg) => textOnNavy.map((fg): [Role, Role] => [fg, bg]));
      expect(failuresOf(scheme, pairs, AA_TEXT)).toEqual([]);
    });

    it('current-page fills and the focus ring are visible on every navy surface', () => {
      const pairs = navySurfaces.flatMap((bg) => indicatorsOnNavy.map((fg): [Role, Role] => [fg, bg]));
      expect(failuresOf(scheme, pairs, AA_NON_TEXT)).toEqual([]);
    });

    it('the label on a current-page fill is AA', () => {
      const pairs: [Role, Role][] = [['onNavCurrent', 'navCurrent'], ['sidebarInk', 'sidebarActive'], ['onHeroCurrent', 'heroCurrent']];
      expect(failuresOf(scheme, pairs, AA_TEXT)).toEqual([]);
    });

    it('the focus ring is visible on every light-or-dark surface it can sit on', () => {
      const pairs: [Role, Role][] = [['focus', 'canvas'], ['focus', 'surface'], ['focus', 'surface2'], ['focus', 'surface3']];
      expect(failuresOf(scheme, pairs, AA_NON_TEXT)).toEqual([]);
    });
  });
}

describe('things drawn on brand-navy', () => {
  it('light: on-action (toast neutral, landing hero titles) is AA on brand-navy', () => {
    // Dark on-action is dark ink for the light dark-mode button, so it is not a
    // brand-navy foreground in dark; components that draw it there move to on-hero.
    expect(ratio('light', 'onAction', 'brandNavy')).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('the token source declares every navy pair, so skTokens.test checks it too', () => {
  const declared = skTokens.contrastPairs.map(({ fg, bg }) => `${fg}/${bg}`);
  const required = [
    'onAction/action', 'onAction/actionHover', 'action/canvas', 'action/surface', 'action/actionSoft',
    'navText/navBg', 'navLabel/navBg', 'onNavCurrent/navCurrent', 'navCurrent/navBg', 'sidebarActive/sidebar',
    'sidebarInk/sidebarActive', 'focus/navBg', 'focus/sidebar', 'focus/brandNavy', 'focus/heroBg', 'focus/canvas', 'focus/surface',
    'sidebarInk/brandNavy', 'sidebarInk2/brandNavy', 'sidebarInk3/brandNavy', 'onHero/brandNavy', 'onHero2/brandNavy',
  ];
  it.each(required)('%s', (pair) => {
    expect(declared).toContain(pair);
  });
});
