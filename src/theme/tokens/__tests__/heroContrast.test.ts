import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { skTokens } from '../generated/skTokens';

import { contrast } from './wcag';

/** The AA pass marks, named once in the token source (contrast-minimum). */
const { text: AA_TEXT, nonText: AA_NON_TEXT } = skTokens.contrastMinimum;

type Scheme = 'light' | 'dark';
type Role = keyof typeof skTokens.color.light;
const schemes: Scheme[] = ['light', 'dark'];
const heroSurfaces: Role[] = ['heroBg', 'heroBgTop'];

/**
 * Every text/icon token drawn directly on a hero or feature panel today
 * (grep `hero-bg` / `heroBg`: clinician Today hero, consult-room stage,
 * doctor-apply offer panel, lab-booked header). A new one goes here.
 */
const onHero: Role[] = ['onHero', 'onHero2', 'onHeroLabel', 'onHeroPositive'];

/** Dark-scheme roles the founder checked against the navy (2026-10-20). Light-on-dark only. */
const darkTextOnHero: Role[] = ['text', 'text2', 'text3', 'action', 'positive', 'attention', 'danger'];

describe('hero and feature panels', () => {
  it('are the same navy in both schemes (the panel stays dark)', () => {
    expect(skTokens.color.dark.heroBg).toBe(skTokens.color.light.heroBg);
    expect(skTokens.color.dark.heroBgTop).toBe(skTokens.color.light.heroBgTop);
  });

  it('are not the full-screen dark canvas', () => {
    expect(skTokens.color.dark.canvas).not.toBe(skTokens.color.dark.heroBg);
  });

  for (const scheme of schemes) {
    const palette = skTokens.color[scheme];
    for (const surface of heroSurfaces) {
      it(`${scheme}: every on-hero text token meets AA (${AA_TEXT}:1) on ${surface}`, () => {
        const failures = onHero
          .map((fg) => ({ fg, ratio: contrast(palette[fg], palette[surface]) }))
          .filter(({ ratio }) => ratio < AA_TEXT)
          .map(({ fg, ratio }) => `${fg}: ${ratio.toFixed(2)}`);
        expect(failures).toEqual([]);
      });

      it(`${scheme}: the current/selected pill is visible on ${surface} (${AA_NON_TEXT}:1) and its text is AA`, () => {
        expect(contrast(palette.heroCurrent, palette[surface])).toBeGreaterThanOrEqual(AA_NON_TEXT);
        expect(contrast(palette.onHeroCurrent, palette.heroCurrent)).toBeGreaterThanOrEqual(AA_TEXT);
      });

      it(`${scheme}: the on-hero button (on-hero fill, hero-bg text) is AA on ${surface}`, () => {
        expect(contrast(palette.heroBg, palette.onHero)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrast(palette.onHero, palette[surface])).toBeGreaterThanOrEqual(AA_NON_TEXT);
      });

      it(`${scheme}: the LIVE pill and danger controls keep their own AA pair on ${surface}`, () => {
        expect(contrast(palette.onDangerFill, palette.dangerFill)).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }

  it('dark: every light-on-dark text token the founder checked is AA on the navy', () => {
    const palette = skTokens.color.dark;
    const failures = darkTextOnHero
      .map((fg) => ({ fg, ratio: contrast(palette[fg], palette.heroBg) }))
      .filter(({ ratio }) => ratio < AA_TEXT)
      .map(({ fg, ratio }) => `${fg}: ${ratio.toFixed(2)}`);
    expect(failures).toEqual([]);
  });

  it('nav-current fails on the navy, so it is never a hero indicator (hero-current is)', () => {
    for (const scheme of schemes) {
      const palette = skTokens.color[scheme];
      expect(contrast(palette.navCurrent, palette.heroBg)).toBeLessThan(AA_NON_TEXT);
      expect(contrast(palette.sidebarActive, palette.heroBg)).toBeLessThan(AA_NON_TEXT);
    }
  });

  it('every declared pair is held to one of the named minimums, never a number of its own', () => {
    const named = Object.values(skTokens.contrastMinimum) as number[];
    for (const { fg, bg, min } of skTokens.contrastPairs) expect(named, `${fg}/${bg}`).toContain(min);
  });

  it('every hero contrast pair is declared in the token source, so skTokens.test checks it too', () => {
    const declared = skTokens.contrastPairs.map(({ fg, bg }) => `${fg}/${bg}`);
    for (const fg of onHero) expect(declared, fg).toContain(`${fg}/heroBg`);
    expect(declared).toContain('heroCurrent/heroBg');
    expect(declared).toContain('onHeroCurrent/heroCurrent');
  });
});

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'generated' || name === '__tests__' ? [] : cssFiles(path);
    return name.endsWith('.css') ? [path] : [];
  });
}

describe('no CSS rule paints a selected indicator in nav-current on the hero', () => {
  const root = resolve(process.cwd(), 'src');
  const offending = cssFiles(root).flatMap((file) => {
    const css = readFileSync(file, 'utf8');
    return css.split('}').map((chunk) => chunk.slice(chunk.lastIndexOf('{') + 1))
      .filter((body) => /--sk-color-hero-bg/.test(body) && /--sk-color-(nav-current|sidebar-active)/.test(body))
      .map(() => file.replace(`${root}/`, ''));
  });
  it('finds none', () => {
    expect(offending).toEqual([]);
  });
});
