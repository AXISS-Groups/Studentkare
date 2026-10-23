// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findBlocks } from '../../../scripts/git/keep-sorted.mjs';

/**
 * git's union merge driver keeps both sides' lines instead of reporting a conflict. That is only
 * safe for files that are pure one-entry-per-line lists (a merged list is re-sorted by
 * `npm run merge:resolve`, and registryLists.test.ts fails until it is). Never JSON, never logic.
 */
const root = process.cwd();
const LIST_FILES = [
  'src/i18n/areasEn.ts',
  'src/i18n/areasHi.ts',
  'src/i18n/areasTe.ts',
  'src/lib/utils/routes/publicRoutes.ts',
  'src/lib/utils/routes/routePaths.ts',
  'src/lib/utils/routes/routeRoles.ts',
];

describe('.gitattributes: merge=union only on pure lists', () => {
  const unionFiles = readFileSync(join(root, '.gitattributes'), 'utf8')
    .split('\n')
    .filter((line) => !line.startsWith('#') && /\bmerge=union\b/.test(line))
    .map((line) => line.split(/\s+/)[0]);

  it('names only the list files', () => {
    expect(unionFiles.length).toBeGreaterThan(0);
    for (const path of unionFiles) {
      expect(LIST_FILES, `${path} is not a known list file`).toContain(path);
      expect(path).toMatch(/\.ts$/); // never JSON
    }
  });

  // Outside the sorted lists a union file may hold only comments, type imports, simple
  // constants and the lines that open and close a list: no functions, no branches.
  const ALLOWED = [
    /^$/, /^\s*(\/\/|\/\*\*|\*)/, /^import (type )?\{ [\w, ]+ \} from '[^']+';$/,
    /^export type \w+ = [\w[\]. ]+;$/, /^const [A-Z_]+: \w+ = \[[^\]]*\];$/,
    /^export const \w+(: [^=]+)? = [[{]$/, /^[\]}]( as const)?;$/,
  ];
  it.each(unionFiles)('%s holds no logic outside its lists', (path) => {
    const lines = readFileSync(join(root, path), 'utf8').split('\n');
    const inside = new Set(findBlocks(lines.join('\n')).flatMap((b) => Array.from({ length: b.end - b.start + 1 }, (_, i) => b.start + i)));
    const stray = lines.filter((line, i) => !inside.has(i) && !ALLOWED.some((re) => re.test(line)));
    expect(stray).toEqual([]);
  });
});
