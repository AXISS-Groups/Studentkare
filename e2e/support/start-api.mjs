// Starts the isolated fixture API for the browser suite and writes every
// verification code it "delivers" to a file the tests read.
//
// The codes travel over the child process pipe and a temp file on the same
// machine: there is no HTTP route that hands out a code, so the product has no
// bypass to leave switched on by mistake.
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const runDir = process.env.E2E_RUN_DIR;
if (!runDir) throw new Error('E2E_RUN_DIR must be set by playwright.config.ts');
mkdirSync(runDir, { recursive: true });
const codesFile = join(runDir, 'codes.ndjson');
mkdirSync(dirname(codesFile), { recursive: true });
writeFileSync(codesFile, '');

const api = spawn(process.env.PYTHON || 'python3', ['backend/tests/workflow_server.py'], {
  env: { ...process.env, WORKFLOW_E2E: '1', WORKFLOW_TEST_DATABASE: join(runDir, 'isolated.db') },
  stdio: ['ignore', 'pipe', 'inherit'],
});

let buffer = '';
api.stdout.on('data', data => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    if (line.startsWith('TEST_OTP ')) appendFileSync(codesFile, `${line.slice(9)}\n`);
  }
});
api.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => api.kill(signal));
