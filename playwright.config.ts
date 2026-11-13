import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// One throwaway folder per run holds the SQLite file and the delivered codes.
// The config is evaluated again in each worker, so the first evaluation
// publishes the folder through the environment and the rest reuse it.
const runDir = process.env.E2E_RUN_DIR ?? mkdtempSync(join(tmpdir(), 'sk-e2e-'));
process.env.E2E_RUN_DIR = runDir;

const WEB = 'http://127.0.0.1:3001';
const API = 'http://127.0.0.1:8011';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // The specs share one fixture database, and each creates its own accounts,
  // so they run one at a time in a fixed order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // A local machine can point at an already-installed browser.
    launchOptions: process.env.E2E_CHROMIUM_PATH
      ? { executablePath: process.env.E2E_CHROMIUM_PATH, args: ['--no-sandbox'] }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: [
    {
      command: 'node e2e/support/start-api.mjs',
      url: `${API}/api/health`,
      env: { E2E_RUN_DIR: runDir },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3001 --strictPort',
      url: WEB,
      env: { CARE_API_TARGET: API },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
