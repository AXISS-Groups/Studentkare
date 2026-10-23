import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

describe('the selected nav item is a white pill with navy text (founder, 2026-10-20)', () => {
  it.each(schemes)('%s: nav-current and sidebar-active are white; on-nav-current is the navy', (scheme) => {
    const palette = skTokens.color[scheme];
    expect(palette.navCurrent).toBe(palette.heroCurrent);
    expect(palette.sidebarActive).toBe(palette.heroCurrent);
    expect(palette.onNavCurrent).toBe(palette.navBg);
    expect(palette.onNavCurrent).toBe(palette.onHeroCurrent);
  });
});

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
      const pairs: [Role, Role][] = [['onNavCurrent', 'navCurrent'], ['onNavCurrent', 'sidebarActive'], ['onHeroCurrent', 'heroCurrent']];
      expect(failuresOf(scheme, pairs, AA_TEXT)).toEqual([]);
    });

    it('the focus ring is visible on the white nav pill as well as on the navy', () => {
      const pairs: [Role, Role][] = [['focus', 'navCurrent'], ['focus', 'sidebarActive'], ['focus', 'heroCurrent'], ['focus', 'navBg'], ['focus', 'sidebar']];
      expect(failuresOf(scheme, pairs, AA_NON_TEXT)).toEqual([]);
    });

    it('on-hero is AA on brand-navy (toast neutral, landing titles and footers)', () => {
      expect(failuresOf(scheme, [['onHero', 'brandNavy']], AA_TEXT)).toEqual([]);
    });

    it('chat avatars: on-action icons sit on the action fill', () => {
      expect(failuresOf(scheme, [['onAction', 'action']], AA_TEXT)).toEqual([]);
    });

    it('the focus ring is visible on every light-or-dark surface it can sit on', () => {
      const pairs: [Role, Role][] = [['focus', 'canvas'], ['focus', 'surface'], ['focus', 'surface2'], ['focus', 'surface3']];
      expect(failuresOf(scheme, pairs, AA_NON_TEXT)).toEqual([]);
    });
  });
}

describe('things drawn on brand-navy', () => {
  it('dark on-action is NOT a brand-navy foreground (dark ink on navy), so toasts and landing titles use on-hero', () => {
    // Dark on-action is dark ink for the light dark-mode button. Drawn on
    // brand-navy it is about 1.2:1; that was the dark toast / landing bug.
    expect(ratio('dark', 'onAction', 'brandNavy')).toBeLessThan(AA_NON_TEXT);
    expect(ratio('dark', 'onHero', 'brandNavy')).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('the token source declares every navy pair, so skTokens.test checks it too', () => {
  const declared = skTokens.contrastPairs.map(({ fg, bg }) => `${fg}/${bg}`);
  const required = [
    'onAction/action', 'onAction/actionHover', 'action/canvas', 'action/surface', 'action/actionSoft',
    'navText/navBg', 'navLabel/navBg', 'onNavCurrent/navCurrent', 'navCurrent/navBg', 'sidebarActive/sidebar',
    'onNavCurrent/sidebarActive', 'focus/navCurrent', 'focus/sidebarActive', 'navText/sidebar', 'dangerFill/sidebar', 'focus/navBg', 'focus/sidebar', 'focus/brandNavy', 'focus/heroBg', 'focus/canvas', 'focus/surface',
    'sidebarInk/brandNavy', 'sidebarInk2/brandNavy', 'sidebarInk3/brandNavy', 'onHero/brandNavy', 'onHero2/brandNavy',
  ];
  it.each(required)('%s', (pair) => {
    expect(declared).toContain(pair);
  });
});

/** `color-mix(in srgb, fg p%, bg)` as the browser draws it, for the tinted rows on the navy. */
function mixHex(fg: string, percent: number, bg: string): string {
  const channels = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16));
  const [f, b] = [channels(fg), channels(bg)];
  return `#${f.map((v, i) => Math.round(v * (percent / 100) + b[i] * (1 - percent / 100)).toString(16).padStart(2, '0')).join('')}`;
}

describe('the student workspace sidebar on the navy (workflows.css / indigo.css .wf-sidebar)', () => {
  // The tints are the ones the stylesheets use: account card and sign-out 8%,
  // hover 12%, avatar 18% sidebar-ink over the sidebar navy.
  it.each(schemes)('%s: every text and indicator in the sidebar meets AA', (scheme) => {
    const c = skTokens.color[scheme];
    const card = mixHex(c.sidebarInk, 8, c.sidebar);
    const hover = mixHex(c.sidebarInk, 12, c.sidebar);
    const avatar = mixHex(c.sidebarInk, 18, c.sidebar);
    const checks: [string, string, string, number][] = [
      ['nav row text', c.navText, c.sidebar, AA_TEXT],
      ['hover row text', c.sidebarInk, hover, AA_TEXT],
      ['current row label on the white pill', c.onNavCurrent, c.navCurrent, AA_TEXT],
      ['white pill on the navy', c.navCurrent, c.sidebar, AA_NON_TEXT],
      ['account name', c.sidebarInk, card, AA_TEXT],
      ['account role', c.sidebarInk2, card, AA_TEXT],
      ['avatar initial', c.sidebarInk, avatar, AA_TEXT],
      ['sign-out label', c.sidebarInk, card, AA_TEXT],
      ['logo wordmark (--ink is sidebar-ink here)', c.sidebarInk, c.sidebar, AA_TEXT],
      // The ring has a 3 px offset, so it is drawn on the navy around a row, never on the row's own tint.
      ['focus ring on the navy', c.focus, c.sidebar, AA_NON_TEXT],
      ['focus ring on the white pill', c.focus, c.navCurrent, AA_NON_TEXT],
      ['sign-out error text on the danger fill', c.onDangerFill, c.dangerFill, AA_TEXT],
      ['danger fill on the navy', c.dangerFill, c.sidebar, AA_NON_TEXT],
    ];
    const failures = checks.filter(([, fg, bg, min]) => contrast(fg, bg) < min).map(([what, fg, bg]) => `${what}: ${contrast(fg, bg).toFixed(2)}`);
    expect(failures).toEqual([]);
  });

  it('the plain danger text is not AA on the navy, which is why the sidebar error uses the danger fill', () => {
    expect(contrast(skTokens.color.light.danger, skTokens.color.light.sidebar)).toBeLessThan(AA_TEXT);
  });
});

/** Every stylesheet under src/, except generated tokens and tests. */
function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'generated' || name === '__tests__' ? [] : cssFiles(path);
    return name.endsWith('.css') ? [path] : [];
  });
}

describe('nav-current, sidebar-active and on-nav-current only draw the current nav item', () => {
  // The white pill is invisible on light surfaces and on-nav-current is navy:
  // anything that is not the selected item on a navy nav uses action / sidebar-ink.
  const root = resolve(process.cwd(), 'src');
  const current = /is-active|is-current|is-selected|aria-current/;
  const offending = cssFiles(root).flatMap((file) => {
    const css = readFileSync(file, 'utf8');
    return css.split('}').flatMap((chunk) => {
      const open = chunk.lastIndexOf('{');
      const selector = chunk.slice(0, open);
      const body = chunk.slice(open + 1);
      return /--sk-color-(on-nav-current|nav-current|sidebar-active)\b/.test(body) && !current.test(selector)
        ? [`${file.replace(`${root}/`, '')}: ${selector.trim().split('\n').pop()}`]
        : [];
    });
  });
  it('finds none', () => {
    expect(offending).toEqual([]);
  });
});
