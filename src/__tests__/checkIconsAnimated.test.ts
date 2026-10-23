// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * scripts/icons/check-icons.mjs and the animated set (`animated` in the icon manifest). Each case
 * runs the real script in a throw-away kit.
 */
const SCRIPT = resolve(process.cwd(), 'scripts/icons/check-icons.mjs');
const need = (icons: string[]) => ({ icons, icons3d: [], glyphs: [], brand: [], illustrations: [], assets: [], textGlyphs: [] });
const anim = (name: string, screens: string[]) => ({ name, kind: 'icon', file: `src/assets/lottie/${name}.json`, screens });

let dirs: string[] = [];
afterEach(() => { dirs.forEach((d) => rmSync(d, { recursive: true, force: true })); dirs = []; });

function kit(code: string, animated = [anim('anim-bell', ['Home'])]) {
  const dir = mkdtempSync(join(tmpdir(), 'sk-check-anim-'));
  dirs.push(dir);
  const write = (path: string, body: string) => { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), body); };
  write('design/icons/icon-manifest.json', JSON.stringify({ textGlyphs: {}, screens: { Home: need(['bell']) }, animated }));
  write('design/screens/implementation-map.json', JSON.stringify({ inProgress: {}, screens: { Home: ['src/Home.tsx'] } }));
  write('src/Home.tsx', code);
  for (const a of animated) write(a.file, '{}');
  const run = (...args: string[]) => {
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
    return { code: r.status, out: r.stdout };
  };
  return { dir, run };
}

describe('check-icons: animations', () => {
  it('passes a screen that uses the animation listed for it', () => {
    const r = kit("<Icon name='bell' /><AnimatedIcon name='anim-bell' />").run('--screen', 'Home');
    expect(r.code).toBe(0);
  });

  it('fails a screen listed for an animation it does not use', () => {
    const r = kit("<Icon name='bell' />").run('--screen', 'Home');
    expect(r.code).toBe(1);
    expect(r.out).toContain('missing animated: anim-bell');
  });

  it('fails a screen that names an animation outside the manifest', () => {
    const r = kit("<Icon name='bell' /><AnimatedIcon name='anim-bell' /><AnimatedIllustration name='scene-made-up' />").run('--screen', 'Home');
    expect(r.code).toBe(1);
    expect(r.out).toContain('animations not in the manifest: scene-made-up');
  });

  it('the ratchet fails an animation whose file is missing', () => {
    const { dir, run } = kit("<Icon name='bell' /><AnimatedIcon name='anim-bell' />");
    rmSync(join(dir, 'src/assets/lottie/anim-bell.json'));
    const r = run('--ratchet');
    expect(r.code).toBe(1);
    expect(r.out).toContain('animated anim-bell: src/assets/lottie/anim-bell.json is missing');
  });
});
