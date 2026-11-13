import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const generator = 'scripts/tokens/build-tokens.mjs';
const outputs = ['src/theme/tokens/generated/skTokens.ts', 'src/theme/tokens/generated/sk-tokens.css'];
const fixtures: string[] = [];

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'studentkare-token-check-'));
  fixtures.push(root);
  for (const path of [generator, 'design/tokens/studentkare.tokens.json']) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    copyFileSync(resolve(path), join(root, path));
  }
  execFileSync(process.execPath, [join(root, generator)], { stdio: 'pipe' });
  return root;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('token generator freshness', () => {
  it.each(['\n', '\r\n'])('accepts unchanged outputs with %j line endings', (newline) => {
    const root = project();
    for (const path of outputs) {
      const output = join(root, path);
      writeFileSync(output, readFileSync(output, 'utf8').replace(/\n/g, newline));
    }
    const before = outputs.map((path) => readFileSync(join(root, path), 'utf8'));
    expect(spawnSync(process.execPath, [join(root, generator), '--check']).status).toBe(0);
    expect(outputs.map((path) => readFileSync(join(root, path), 'utf8'))).toEqual(before);
  });

  it.each(outputs)('rejects real output drift in %s', (path) => {
    const root = project();
    const output = join(root, path);
    writeFileSync(output, `${readFileSync(output, 'utf8')}drift\n`);
    expect(spawnSync(process.execPath, [join(root, generator), '--check']).status).toBe(1);
  });

  it('rejects source drift even if existing outputs use CRLF', () => {
    const root = project();
    for (const path of outputs) {
      const output = join(root, path);
      writeFileSync(output, readFileSync(output, 'utf8').replace(/\n/g, '\r\n'));
    }
    const source = join(root, 'design/tokens/studentkare.tokens.json');
    writeFileSync(source, readFileSync(source, 'utf8').replace('Plus Jakarta Sans', 'Synthetic Test Font'));
    expect(spawnSync(process.execPath, [join(root, generator), '--check']).status).toBe(1);
  });
});
