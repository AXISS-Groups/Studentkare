// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blockProblems, findBlocks } from '../../../scripts/git/keep-sorted.mjs';

/**
 * The shared registries every ticket branch adds to (routes, route access, i18n areas, phone
 * nav sets, native screens) are one entry per line between `// keep-sorted start` and
 * `// keep-sorted end`, sorted and without duplicates, so two branches adding different entries
 * touch different lines. After a merge, `npm run merge:resolve` sorts them again.
 */
const root = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const withLists = sourceFiles(join(root, 'src'))
  .map((path) => ({ path: relative(root, path), text: readFileSync(path, 'utf8') }))
  .filter(({ text }) => text.includes('keep-sorted start'));

/** Each registry and the number of sorted lists it must keep (so a list can't silently go away). */
const REGISTRIES: Record<string, number> = {
  'src/lib/utils/routes/routePaths.ts': 1,
  'src/lib/utils/routes/publicRoutes.ts': 1,
  'src/lib/utils/routes/routeRoles.ts': 2,
  'src/i18n/areasEn.ts': 2,
  'src/i18n/areasHi.ts': 2,
  'src/i18n/areasTe.ts': 2,
  'src/screens/workspace/StudentPhoneFrame.tsx': 3,
  'src/screens/workspace/WorkspaceScreen.tsx': 1,
  'src/features/phoneKit/studentPhoneBoards.tsx': 1,
  'src/native/App.tsx': 1,
  'src/native/StudentTabBar.tsx': 2,
};

describe('registry lists: one entry per line, sorted, no duplicates', () => {
  it('finds the lists', () => {
    expect(withLists.length).toBeGreaterThanOrEqual(Object.keys(REGISTRIES).length);
  });

  it.each(Object.entries(REGISTRIES))('%s keeps its %i sorted list(s)', (path, count) => {
    expect(findBlocks(readFileSync(join(root, path), 'utf8'))).toHaveLength(count);
  });

  it.each(withLists.map(({ path }) => path))('%s: every list is sorted, one per line, without duplicates', (path) => {
    const { text } = withLists.find((f) => f.path === path)!;
    const problems = findBlocks(text).flatMap((block) => blockProblems(block.lines).map((p) => `line ${block.start + 2}…: ${p}`));
    // Fix: `npm run merge:resolve` sorts every list and drops exact duplicates.
    expect(problems).toEqual([]);
  });

  it('keeps every route and public route on its own line', () => {
    for (const path of ['src/lib/utils/routes/routePaths.ts', 'src/lib/utils/routes/publicRoutes.ts']) {
      const [block] = findBlocks(readFileSync(join(root, path), 'utf8'));
      expect(block.lines.filter((line) => !/^ {2}'[^']+',$/.test(line))).toEqual([]);
    }
  });
});
