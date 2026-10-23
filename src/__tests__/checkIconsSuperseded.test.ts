// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * scripts/icons/check-icons.mjs and the `superseded` section of
 * design/screens/implementation-map.json. Each case runs the real script in a
 * throw-away kit (it reads design/ from its working directory).
 */
const SCRIPT = resolve(process.cwd(), 'scripts/icons/check-icons.mjs');
const need = (icons: string[]) => ({ icons, icons3d: [], glyphs: [], brand: [], illustrations: [], assets: [], textGlyphs: [] });

type Map = { screens: Record<string, string[]>; inProgress?: Record<string, string[]>; superseded?: Record<string, unknown>; retiredIcons?: Record<string, unknown> };

let dirs: string[] = [];
afterEach(() => { dirs.forEach((d) => rmSync(d, { recursive: true, force: true })); dirs = []; });

function kit(map: Map, files: Record<string, string> = { 'src/New.tsx': "<Icon name='bell' />" }) {
  const dir = mkdtempSync(join(tmpdir(), 'sk-check-icons-'));
  dirs.push(dir);
  const write = (path: string, body: string) => { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), body); };
  write('design/icons/icon-manifest.json', JSON.stringify({ textGlyphs: {}, screens: { Old: need(['bell']), New: need(['bell']), Other: need(['x']) } }));
  write('design/screens/implementation-map.json', JSON.stringify({ inProgress: {}, ...map }));
  Object.entries(files).forEach(([path, body]) => write(path, body));
  const run = (...args: string[]) => {
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
    return { code: r.status, out: r.stdout };
  };
  return { dir, run };
}

const ok: Map = { screens: { New: ['src/New.tsx'] }, superseded: { _note: 'ignored', Old: { by: ['New'], source: 'plan.md', redirects: { '/old': '/new' } } } };

describe('check-icons: superseded boards', () => {
  it('--screen on a superseded board names its successor and passes', () => {
    const { run } = kit(ok);
    const r = run('--screen', 'Old');
    expect(r.code).toBe(0);
    expect(r.out).toContain('Old is superseded by New');
  });

  it('--all lists it as superseded, not as not started, and leaves it out of the total', () => {
    const { dir, run } = kit(ok);
    const r = run('--all');
    const report = readFileSync(join(dir, 'design/screens/icon-coverage.md'), 'utf8');
    expect(report).toContain('| Old | superseded | by New |');
    expect(report).toContain('| Other | not started | — |');
    expect(report).not.toContain('| Old | not started');
    expect(report).toContain('**1 / 2**');
    expect(report).toContain('superseded: 1');
    expect(r.code).toBe(0);
  });

  it('--ratchet passes a consistent entry', () => {
    expect(kit(ok).run('--ratchet').code).toBe(0);
  });

  it.each([
    ['a successor that is not built', { screens: {}, superseded: { Old: { by: ['New'], source: 's' } } }, 'successor New has no files'],
    ['no successor', { screens: { New: ['src/New.tsx'] }, superseded: { Old: { by: [], source: 's' } } }, '"by" must name'],
    ['an unknown successor', { screens: { New: ['src/New.tsx'] }, superseded: { Old: { by: ['Nope'], source: 's' } } }, 'successor Nope is not a canvas screen'],
    ['an unknown screen', { screens: { New: ['src/New.tsx'] }, superseded: { Ghost: { by: ['New'], source: 's' } } }, 'Ghost: not a canvas screen'],
    ['a board that is also mapped', { screens: { New: ['src/New.tsx'], Old: ['src/New.tsx'] }, superseded: { Old: { by: ['New'], source: 's' } } }, 'also has files under "screens"'],
    ['a board still in progress', { screens: { New: ['src/New.tsx'] }, inProgress: { Old: ['src/New.tsx'] }, superseded: { Old: { by: ['New'], source: 's' } } }, 'still listed under "inProgress"'],
    ['no recorded source', { screens: { New: ['src/New.tsx'] }, superseded: { Old: { by: ['New'] } } }, '"source" must say'],
  ])('fails every mode for %s', (_label, map, message) => {
    const { run } = kit(map as Map);
    for (const args of [['--ratchet'], ['--all']]) {
      const r = run(...args);
      expect(r.code, args.join(' ')).toBe(1);
      expect(r.out).toContain(message);
    }
  });

  it('the real map is consistent: every superseded board has a built successor and a recorded source', () => {
    const map = JSON.parse(readFileSync(resolve(process.cwd(), 'design/screens/implementation-map.json'), 'utf8'));
    const entries = Object.entries(map.superseded as Record<string, { by: string[]; source: string }>).filter(([k]) => !k.startsWith('_'));
    expect(entries.map(([k]) => k).sort()).toEqual(['MyReports', 'ReportInsights', 'WebDashboard', 'WebHome']);
    for (const [screen, entry] of entries) {
      expect(map.screens[screen], screen).toBeUndefined();
      expect(map.inProgress[screen], screen).toBeUndefined();
      expect(entry.source).toBeTruthy();
      for (const next of entry.by) expect(map.screens[next]?.length, `${screen} -> ${next}`).toBeGreaterThan(0);
    }
  });
});

describe('check-icons: icons a recorded decision retired', () => {
  // Screen "Other" needs `x`; the file draws only `bell`.
  const base = { screens: { New: ['src/New.tsx'], Other: ['src/New.tsx'] } };

  it('a retired icon is not required, with its source recorded', () => {
    const { run } = kit({ ...base, retiredIcons: { _readme: 'ignored', Other: { icons: ['x'], source: 'decision.md' } } });
    expect(run('--ratchet').code).toBe(0);
    expect(run('--screen', 'Other').code).toBe(0);
  });

  it('without the entry the icon is a new gap', () => {
    const r = kit(base).run('--ratchet');
    expect(r.code).toBe(1);
    expect(r.out).toContain('icons:x');
  });

  it.each([
    ['no recorded source', { Other: { icons: ['x'] } }, '"source" must say'],
    ['an icon the brief does not have', { Other: { icons: ['x', 'bell-off'], source: 's' } }, 'bell-off is not in this screen'],
    ['an icon the screen still uses (stale)', { New: { icons: ['bell'], source: 's' }, Other: { icons: ['x'], source: 's' } }, 'bell is still used here'],
  ])('fails for %s', (_label, retiredIcons, message) => {
    const r = kit({ ...base, retiredIcons }).run('--ratchet');
    expect(r.code).toBe(1);
    expect(r.out).toContain(message);
  });

  it('the real map records its source for every retired icon', () => {
    const map = JSON.parse(readFileSync(resolve(process.cwd(), 'design/screens/implementation-map.json'), 'utf8'));
    const entries = Object.entries(map.retiredIcons as Record<string, { icons: string[]; source: string }>).filter(([k]) => !k.startsWith('_'));
    expect(entries.length).toBeGreaterThan(0);
    for (const [screen, entry] of entries) {
      expect(entry.source, screen).toMatch(/^docs\/ux\/web-mobile-parity-2026-10-23\.md#approved-decisions/);
      expect(entry.icons.length, screen).toBeGreaterThan(0);
    }
  });
});
