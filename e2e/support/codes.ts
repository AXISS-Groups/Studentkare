import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The newest verification code the fixture API "delivered" to an identifier.
 * Polls briefly, because the code is written a moment after the request returns.
 */
export async function latestCode(identifier: string, timeoutMs = 10_000): Promise<string> {
  const file = join(process.env.E2E_RUN_DIR ?? '', 'codes.ndjson');
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index--) {
      const entry = JSON.parse(lines[index]) as { identifier: string; code: string };
      if (entry.identifier === identifier) return entry.code;
    }
    if (Date.now() > deadline) throw new Error(`No verification code was delivered to ${identifier}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
