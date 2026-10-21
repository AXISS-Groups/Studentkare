// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * design/screens/implementation-map.json names the files that build each canvas
 * screen. check-icons.mjs skips a named file that does not exist, so a moved or
 * deleted file would otherwise leave a stale entry behind without failing.
 */
const root = process.cwd();
const map: { screens: Record<string, string[]>; inProgress: Record<string, string[]> } = JSON.parse(
  readFileSync(resolve(root, 'design/screens/implementation-map.json'), 'utf8'),
);

describe('design/screens/implementation-map.json', () => {
  it.each([['screens'], ['inProgress']] as const)('every file listed under %s exists', (section) => {
    const missing = Object.entries(map[section]).flatMap(([screen, files]) =>
      files.filter((file) => !existsSync(resolve(root, file))).map((file) => `${screen}: ${file}`),
    );
    expect(missing).toEqual([]);
  });
});
