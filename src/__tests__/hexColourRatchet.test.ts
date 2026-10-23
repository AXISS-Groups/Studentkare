import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const legacy: string[] = JSON.parse(readFileSync(resolve(process.cwd(), 'config/hex-colour-legacy.json'), 'utf8'));

/** The raw-hex lint exemption list may only shrink (DESIGN.md §3, remediation plan 2.5). */
describe('raw hex colour ratchet', () => {
  it('never grows past its starting size of 236', () => {
    expect(legacy.length).toBeLessThanOrEqual(236);
  });

  it('lists only files that still exist', () => {
    expect(legacy.filter((file) => !existsSync(resolve(process.cwd(), file)))).toEqual([]);
  });
});
