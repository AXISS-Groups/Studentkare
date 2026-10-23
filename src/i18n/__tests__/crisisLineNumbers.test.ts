import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Audit 2026-10-22 (Low): an unused hub told students to call Tele-MANAS on
// 1056, which is not its number (Tele-MANAS is 14416). It is deleted; this keeps
// the wrong number from coming back anywhere in the app source.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('crisis line numbers', () => {
  it('never pairs Tele-MANAS with a wrong number', () => {
    const offenders = sourceFiles(join(process.cwd(), 'src'))
      .filter((path) => /Tele-?MANAS[^\n]{0,40}\b1056\b/i.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
