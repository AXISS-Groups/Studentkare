import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { skAnimated } from '../../generated/skAnimatedData';

/**
 * The shipped animations (src/assets/lottie) as scripts/icons/build-lottie.mjs leaves them: every
 * colour is a token role, art never uses danger, and nothing the packs drew as fake data survives.
 */
interface Entry { name: string; file: string; kind: string; screens: string[]; danger: boolean }
const root = process.cwd();
const manifest = JSON.parse(readFileSync(resolve(root, 'design/icons/icon-manifest.json'), 'utf8')) as { animated: Entry[] };
const light = skTokens.color.light as Record<string, string>;
const channels = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
/** Baked colours are rounded to two decimals (the component swaps in the exact token at run time). */
const near = (rgb: number[], token: string) => channels(token).every((c, i) => Math.abs(Math.round(rgb[i] * 255) - c) <= 2);

type Node = { [key: string]: unknown };
function walk(node: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(node)) { node.forEach((n) => walk(n, visit)); return; }
  if (node && typeof node === 'object') { visit(node as Node); Object.values(node).forEach((v) => walk(v, visit)); }
}

describe('animated set', () => {
  it('ships exactly the manifest entries, each with a generated loader', () => {
    const files = readdirSync(resolve(root, 'src/assets/lottie')).filter((f) => f.endsWith('.json')).sort();
    expect(files).toEqual(manifest.animated.map((a) => `${a.name}.json`).sort());
    expect(Object.keys(skAnimated).sort()).toEqual(manifest.animated.map((a) => a.name).sort());
  });

  it.each(manifest.animated.map((a) => [a.name, a] as const))('%s: every colour is a token role, never red', (_name, entry) => {
    const data: unknown = JSON.parse(readFileSync(resolve(root, entry.file), 'utf8'));
    const roles: string[] = [];
    walk(data, (n) => {
      if ((n.ty === 'fl' || n.ty === 'st') && n.c) {
        expect(n.sk, 'colour without a role').toBeDefined();
        const k = (n.c as { k: unknown }).k;
        if (typeof n.sk === 'string') {
          roles.push(n.sk);
          if (!n.sk.startsWith('@')) expect(near(k as number[], light[n.sk])).toBe(true);
        }
      }
      if ((n.ty === 'gf' || n.ty === 'gs')) expect(Array.isArray(n.sk)).toBe(true);
      if (Array.isArray(n.sk)) roles.push(...(n.sk as string[]));
      // Text layers (fake chart numbers), image layers and expressions never ship.
      if (Array.isArray(n.layers)) for (const layer of n.layers as Node[]) expect([2, 5]).not.toContain(layer.ty);
      expect(typeof n.x === 'string').toBe(false);
    });
    expect(roles.length).toBeGreaterThan(0);
    for (const role of roles) {
      if (entry.kind === 'icon') expect(['@ink', '@bg']).toContain(role);
      else {
        expect(role).toMatch(/^illustration/);
        expect(light[role]).toBeDefined();
      }
      expect(role.toLowerCase()).not.toContain('danger');
    }
  });

  it('chart loops are decoration only: never on a clinical screen', () => {
    for (const a of manifest.animated.filter((x) => x.kind === 'chart')) expect(a.screens).toEqual([]);
  });
});
