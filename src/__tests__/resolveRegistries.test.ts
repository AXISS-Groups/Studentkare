// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * scripts/git/resolve-registries.mjs (`npm run merge:resolve`). Each case builds a throw-away git
 * repository, makes two branches that collide in a registry, merges them and runs the real script.
 */
const SCRIPT = resolve(process.cwd(), 'scripts/git/resolve-registries.mjs');
const CHECK_ICONS = resolve(process.cwd(), 'scripts/icons/check-icons.mjs');

let dirs: string[] = [];
afterEach(() => { dirs.forEach((d) => rmSync(d, { recursive: true, force: true })); dirs = []; });

const ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com', GIT_CONFIG_NOSYSTEM: '1', HOME: tmpdir() };

function repo(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'sk-resolve-'));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const write = (fs: Record<string, string>) => Object.entries(fs).forEach(([path, body]) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  });
  const read = (path: string) => readFileSync(join(dir, path), 'utf8');
  git('init', '-q', '-b', 'main');
  git('config', 'merge.conflictstyle', 'merge');
  write(files);
  git('add', '-A');
  git('commit', '-qm', 'base');
  /** Commit `fs` on a new branch from main. */
  const branch = (name: string, fs: Record<string, string>) => {
    git('checkout', '-q', '-b', name, 'main');
    write(fs);
    git('add', '-A');
    git('commit', '-qm', name);
    git('checkout', '-q', 'main');
  };
  /** Merge a into main, then b; returns git's exit status for b. */
  const mergeBoth = (a: string, b: string) => {
    git('merge', '-q', '--no-edit', a);
    return spawnSync('git', ['merge', '--no-edit', b], { cwd: dir, env: ENV, encoding: 'utf8' }).status;
  };
  const run = () => {
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: dir, env: ENV, encoding: 'utf8' });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const unmerged = () => git('diff', '--name-only', '--diff-filter=U').trim();
  return { dir, git, write, read, branch, mergeBoth, run, unmerged };
}

const list = (name: string, entries: string[]) => `export const ${name} = [\n  // keep-sorted start\n${entries.map((e) => `  '${e}',`).join('\n')}\n  // keep-sorted end\n] as const;\n`;
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

describe('merge:resolve', () => {
  it('unions two branches that add neighbouring entries to a sorted list, then sorts it', () => {
    const r = repo({ 'src/routes.ts': list('routePaths', ['a', 'c', 'e']) });
    r.branch('one', { 'src/routes.ts': list('routePaths', ['a', 'b', 'c', 'e']) });
    r.branch('two', { 'src/routes.ts': list('routePaths', ['a', 'bb', 'c', 'e']) });
    expect(r.mergeBoth('one', 'two')).not.toBe(0);
    const out = r.run();
    expect(out.code).toBe(0);
    expect(r.read('src/routes.ts')).toBe(list('routePaths', ['a', 'b', 'bb', 'c', 'e']));
    expect(r.unmerged()).toBe('');
  });

  it('keeps a deletion from one side while adding the other side\'s entry', () => {
    const r = repo({ 'src/routes.ts': list('routePaths', ['a', 'b', 'c']) });
    r.branch('one', { 'src/routes.ts': list('routePaths', ['a', 'c']) });
    r.branch('two', { 'src/routes.ts': list('routePaths', ['a', 'b', 'bb', 'c']) });
    r.mergeBoth('one', 'two');
    expect(r.run().code).toBe(0);
    expect(r.read('src/routes.ts')).toBe(list('routePaths', ['a', 'bb', 'c']));
  });

  it('re-sorts a list that git\'s union driver merged without a conflict', () => {
    const r = repo({ '.gitattributes': 'src/routes.ts merge=union\n', 'src/routes.ts': list('routePaths', ['a', 'c']) });
    r.branch('one', { 'src/routes.ts': list('routePaths', ['a', 'b', 'c']) });
    r.branch('two', { 'src/routes.ts': list('routePaths', ['a', 'ab', 'c']) });
    r.git('merge', '-q', '--no-edit', 'one');
    expect(spawnSync('git', ['merge', '--no-commit', '--no-ff', 'two'], { cwd: r.dir, env: ENV }).status).toBe(0);
    expect(r.read('src/routes.ts')).not.toBe(list('routePaths', ['a', 'ab', 'b', 'c']));
    expect(r.run().code).toBe(0);
    expect(r.read('src/routes.ts')).toBe(list('routePaths', ['a', 'ab', 'b', 'c']));
    expect(r.git('diff', '--name-only').trim()).toBe(''); // staged
  });

  it('merges the implementation map: union per screen, finished screens leave inProgress, nothing stale comes back', () => {
    const base = { _readme: 'r', screens: { A: ['a.tsx'] }, inProgress: { X: ['x.tsx'], Y: ['y.tsx'] }, superseded: { Old: { by: ['A'], source: 's' } } };
    const r = repo({ 'design/screens/implementation-map.json': json(base) });
    // one: finishes X (moves it to screens) and adds P; touches A.
    r.branch('one', { 'design/screens/implementation-map.json': json({ ...base, screens: { A: ['a.tsx', 'a2.tsx'], X: ['x.tsx', 'x2.tsx'], P: ['p.tsx'] }, inProgress: { Y: ['y.tsx'] } }) });
    // two: drops Y (abandoned), adds Q, edits X while it is still in progress, and builds Old (superseded).
    r.branch('two', { 'design/screens/implementation-map.json': json({ ...base, screens: { A: ['a.tsx', 'a3.tsx'], Q: ['q.tsx'], Old: ['old.tsx'] }, inProgress: { X: ['x.tsx', 'x3.tsx'] } }) });
    expect(r.mergeBoth('one', 'two')).not.toBe(0);
    const out = r.run();
    expect(out.code).toBe(0);
    expect(out.out).toContain('Old is superseded');
    const merged = JSON.parse(r.read('design/screens/implementation-map.json'));
    expect(merged.screens).toEqual({ A: ['a.tsx', 'a2.tsx', 'a3.tsx'], X: ['x.tsx', 'x2.tsx'], P: ['p.tsx'], Q: ['q.tsx'] });
    expect(merged.inProgress).toEqual({});
    expect(merged.superseded).toEqual(base.superseded);
    expect(merged._readme).toBe('r');
  });

  it('merges legacy lists shrink-only (what either side removed stays removed)', () => {
    const r = repo({ 'config/any-legacy.json': json(['a.ts', 'b.ts', 'c.ts', 'd.ts']), 'config/icon-coverage-legacy.json': json({ S: ['icons:x', 'icons:y'], T: ['icons:z'] }) });
    // Neighbouring lines, so git reports conflicts in both files.
    r.branch('one', { 'config/any-legacy.json': json(['a.ts', 'c.ts', 'd.ts']), 'config/icon-coverage-legacy.json': json({ S: ['icons:y'], T: ['icons:z'] }) });
    r.branch('two', { 'config/any-legacy.json': json(['a.ts', 'b.ts', 'c2.ts', 'd.ts']), 'config/icon-coverage-legacy.json': json({ S: ['icons:x'], T: ['icons:z'] }) });
    expect(r.mergeBoth('one', 'two')).not.toBe(0);
    expect(r.unmerged().split('\n').sort()).toEqual(['config/any-legacy.json', 'config/icon-coverage-legacy.json']);
    expect(r.run().code).toBe(0);
    // b.ts went on one; c.ts -> c2.ts is a rename on two (kept for the ratchet to judge).
    expect(JSON.parse(r.read('config/any-legacy.json'))).toEqual(['a.ts', 'd.ts', 'c2.ts']);
    expect(JSON.parse(r.read('config/icon-coverage-legacy.json'))).toEqual({ S: [], T: ['icons:z'] });
    expect(r.unmerged()).toBe('');
  });

  it('regenerates the icon coverage report from the merged map', () => {
    const need = (icons: string[]) => ({ icons, icons3d: [], glyphs: [], brand: [], illustrations: [], assets: [], textGlyphs: [] });
    const map = (screens: Record<string, string[]>) => json({ screens, inProgress: {} });
    const r = repo({
      'design/icons/icon-manifest.json': json({ textGlyphs: {}, screens: { A: need(['bell']), B: need(['bell']), C: need(['bell']) } }),
      'design/screens/implementation-map.json': map({}),
      'design/screens/icon-coverage.md': 'old\n',
      'src/A.tsx': "<Icon name='bell' />\n",
      'src/B.tsx': "<Icon name='bell' />\n",
    });
    mkdirSync(join(r.dir, 'scripts/icons'), { recursive: true });
    copyFileSync(CHECK_ICONS, join(r.dir, 'scripts/icons/check-icons.mjs'));
    r.branch('one', { 'design/screens/implementation-map.json': map({ A: ['src/A.tsx'] }), 'design/screens/icon-coverage.md': 'one\n' });
    r.branch('two', { 'design/screens/implementation-map.json': map({ B: ['src/B.tsx'] }), 'design/screens/icon-coverage.md': 'two\n' });
    expect(r.mergeBoth('one', 'two')).not.toBe(0);
    expect(r.run().code).toBe(0);
    const report = r.read('design/screens/icon-coverage.md');
    expect(report).toContain('**2 / 3**');
    expect(report).toContain('| A | pass |');
    expect(report).toContain('| B | pass |');
    expect(r.unmerged()).toBe('');
  });

  it('refuses a conflict in code with logic and names the file', () => {
    const code = (body: string) => `export function f(x: number) {\n  ${body}\n}\n`;
    const r = repo({ 'src/logic.ts': code('return x;'), 'src/routes.ts': list('routePaths', ['a', 'c']) });
    r.branch('one', { 'src/logic.ts': code('return x + 1;'), 'src/routes.ts': list('routePaths', ['a', 'b', 'c']) });
    r.branch('two', { 'src/logic.ts': code('return x * 2;'), 'src/routes.ts': list('routePaths', ['a', 'bb', 'c']) });
    r.mergeBoth('one', 'two');
    const out = r.run();
    expect(out.code).toBe(1);
    expect(out.out).toContain('src/logic.ts');
    expect(r.unmerged()).toBe('src/logic.ts');
    expect(r.read('src/logic.ts')).toContain('<<<<<<<');
    expect(r.read('src/routes.ts')).toBe(list('routePaths', ['a', 'b', 'bb', 'c'])); // the list still resolved
  });

  it('refuses a conflicted file it has no rule for (JSON outside the registries)', () => {
    const r = repo({ 'package.json': json({ v: 1 }) });
    r.branch('one', { 'package.json': json({ v: 2 }) });
    r.branch('two', { 'package.json': json({ v: 3 }) });
    r.mergeBoth('one', 'two');
    const out = r.run();
    expect(out.code).toBe(1);
    expect(out.out).toContain('package.json');
  });
});
