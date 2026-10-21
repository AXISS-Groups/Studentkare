// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { areasEn } from '../areasEn';
import { areasHi } from '../areasHi';
import { areasTe } from '../areasTe';

/**
 * Each catalogue is its own keys (en.ts, hi.ts, te.ts) plus every area catalogue spread in
 * (areasEn.ts, areasHi.ts, areasTe.ts, sorted by name). A later spread overrides an earlier
 * key, so the order would matter if a key were defined twice; it never is, so the area lists
 * can stay sorted and two branches can each add an area without colliding.
 */
const dir = join(process.cwd(), 'src/i18n');
const LANGS = [
  { lang: 'en', suffix: 'En', merged: areasEn },
  { lang: 'hi', suffix: 'Hi', merged: areasHi },
  { lang: 'te', suffix: 'Te', merged: areasTe },
] as const;

/** Keys written directly in the catalogue file (before the area spread). */
function ownKeys(lang: string): string[] {
  const text = readFileSync(join(dir, `${lang}.ts`), 'utf8');
  const body = text.slice(text.indexOf(`export const ${lang}`));
  return [...body.matchAll(/^\s*'([^']+)'\s*:/gm)].map((m) => m[1]);
}

async function areaCatalogues(suffix: string): Promise<{ name: string; keys: string[] }[]> {
  const files = readdirSync(join(dir, 'areas')).filter((f) => f.endsWith('.ts'));
  const out: { name: string; keys: string[] }[] = [];
  for (const file of files) {
    const mod: Record<string, unknown> = await import(/* @vite-ignore */ join(dir, 'areas', file));
    for (const [name, value] of Object.entries(mod)) {
      if (name.endsWith(suffix) && value && typeof value === 'object') out.push({ name: `${file}:${name}`, keys: Object.keys(value) });
    }
  }
  return out;
}

describe('i18n catalogues: no key is defined twice', () => {
  it.each(LANGS)('$lang: every key has one home (own keys or one area)', async ({ lang, suffix }) => {
    const owners = new Map<string, string[]>();
    const own = (key: string, where: string) => owners.set(key, [...(owners.get(key) ?? []), where]);
    ownKeys(lang).forEach((key) => own(key, `${lang}.ts`));
    for (const area of await areaCatalogues(suffix)) area.keys.forEach((key) => own(key, area.name));
    const twice = [...owners].filter(([, where]) => where.length > 1).map(([key, where]) => `${key}: ${where.join(', ')}`);
    expect(twice).toEqual([]);
  });

  it.each(LANGS)('$lang: every area catalogue is spread in', async ({ suffix, merged }) => {
    const missing = (await areaCatalogues(suffix)).flatMap(({ name, keys }) => keys.filter((k) => !(k in merged)).slice(0, 1).map(() => name));
    expect(missing).toEqual([]);
  });
});
