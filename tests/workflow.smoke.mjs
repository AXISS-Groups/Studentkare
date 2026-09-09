import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const directory = await mkdtemp(join(process.env.WORKFLOW_TEST_TMP || tmpdir(), 'care-workflow-'));
const codes = new Map();
const api = spawn(process.env.PYTHON || 'backend/.venv/bin/python', ['backend/tests/workflow_server.py'], {
  env: { ...process.env, WORKFLOW_E2E: '1', WORKFLOW_TEST_DATABASE: join(directory, 'isolated.db') }, stdio: ['ignore', 'pipe', 'pipe'],
});
let buffer = '';
api.stdout.on('data', data => {
  buffer += data.toString();
  const lines = buffer.split('\n'); buffer = lines.pop();
  for (const line of lines) if (line.startsWith('TEST_OTP ')) { const entry = JSON.parse(line.slice(9)); codes.set(entry.identifier, entry.code); }
});
let serverErrors = '';
api.stderr.on('data', data => { serverErrors += data.toString(); });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '3001', '--strictPort'], {
  env: { ...process.env, CARE_API_TARGET: 'http://127.0.0.1:8011' }, stdio: ['ignore', 'ignore', 'pipe'],
});
vite.stderr.on('data', data => { serverErrors += data.toString(); });
let browser;
let page;
const baseURL = 'http://127.0.0.1:3001';
async function waitForServer(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch { /* Wait for startup. */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Test server did not start: ${serverErrors}`);
}

try {
  await waitForServer('http://127.0.0.1:8011/api/health');
  await waitForServer(baseURL);
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const visible = locator => locator.waitFor({ state: 'visible' });
  const go = async path => { await page.goto(`${baseURL}/#/${path}`); };
  const screenshot = async name => {
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}.png`, fullPage: true, animations: 'disabled' });
  };
  async function verify(identifier) {
    await visible(page.getByLabel('Verification code', { exact: true }));
    assert.ok(codes.has(identifier), 'The delivery boundary must actually receive a generated code');
    await page.getByLabel('Verification code', { exact: true }).fill(codes.get(identifier));
    await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
  }
  async function signup(identifier, name) {
    await go('signup');
    await page.getByRole('button', { name: 'Create my account', exact: true }).click();
    await page.getByLabel('Email address', { exact: true }).fill(identifier);
    await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
    await verify(identifier);
    await page.getByLabel('Full name', { exact: true }).fill(name);
    await page.getByLabel('Date of birth', { exact: true }).fill('2000-03-14');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Add campus details', exact: true }).click();
    await page.getByLabel('University or institution', { exact: true }).fill('Test University');
    await page.getByLabel('Student or roll number', { exact: true }).fill('TEST-42');
    await page.getByRole('button', { name: 'Complete registration', exact: true }).click();
    await visible(page.getByRole('heading', { name: 'A clearer picture of your health.', exact: true }));
  }
  async function login(identifier, homeHeading) {
    await go('login');
    await page.getByLabel('Email address', { exact: true }).fill(identifier);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
    await verify(identifier);
    await visible(page.getByRole('heading', { name: homeHeading, exact: true }));
  }
  async function logout() {
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await visible(page.getByRole('heading', { name: /Care that connects/ }));
  }

  await go('shop');
  await visible(page.getByRole('button', { name: 'View Campus digital thermometer', exact: true }));
  assert.equal(await page.getByText('Demo workspaces', { exact: true }).count(), 0);
  await screenshot('real-marketplace');
  await go('admin');
  await visible(page.getByRole('heading', { name: 'Welcome back', exact: true }));
  await signup('member@example.test', 'Test Member');
  await visible(page.getByRole('heading', { name: 'Your readings start here.', exact: true }));
  await screenshot('real-health-empty');
  await page.getByRole('button', { name: 'Record a reading', exact: true }).first().click();
  await page.getByRole('dialog').getByLabel('Value (bpm)', { exact: true }).fill('74');
  await page.getByRole('button', { name: 'Save reading', exact: true }).click();
  await visible(page.getByText('One reading recorded. Add another measurement to see a trend.', { exact: true }));
  await page.reload();
  await visible(page.getByText('One reading recorded. Add another measurement to see a trend.', { exact: true }));
  await go('records');
  await page.getByRole('button', { name: 'Upload a record', exact: true }).first().click();
  await page.getByLabel('Record title', { exact: true }).fill('My uploaded report');
  await page.getByLabel('File', { exact: false }).setInputFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'My uploaded report', exact: true }));
  await screenshot('real-records');
  await go('admin');
  await visible(page.getByRole('heading', { name: 'This workspace is not available to your role.', exact: true }));
  await go('support');
  await page.getByLabel('Subject', { exact: true }).fill('Account support request');
  await page.getByLabel('Message', { exact: true }).fill('Please help me understand my campus verification status.');
  await page.getByRole('button', { name: 'Send support request', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'Account support request', exact: true }));

  await go('shop');
  await page.getByRole('button', { name: 'Add Campus digital thermometer', exact: true }).click();
  await page.getByRole('button', { name: 'Open cart, 1 items', exact: true }).click();
  await page.getByLabel('City', { exact: true }).fill('Hyderabad');
  await page.getByLabel('Pincode', { exact: true }).fill('500001');
  await page.getByRole('button', { name: 'Send order request', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'Your request has been saved.', exact: true }));
  await page.getByRole('button', { name: 'Track my request', exact: true }).click();
  await visible(page.getByText('REQUESTED', { exact: true }));
  await screenshot('real-order-request');
  await logout();
  await login('vendor@example.test', 'Requests & fulfilment.');
  await visible(page.getByRole('heading', { name: 'Campus digital thermometer', exact: true }));
  await page.getByRole('button', { name: 'Accept request', exact: true }).click();
  await page.getByRole('button', { name: 'Mark dispatched', exact: true }).click();
  await page.getByRole('button', { name: 'Mark completed', exact: true }).click();
  await visible(page.locator('.wf-status.status-completed'));
  await screenshot('real-provider-workspace');
  await logout();
  await login('admin@example.test', 'Your operational overview.');
  await visible(page.getByRole('heading', { name: 'Request status distribution', exact: true }));
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.wf-metric-card')).every(element => getComputedStyle(element).opacity === '1'));
  await screenshot('real-admin-overview');
  await page.getByRole('button', { name: 'Catalog management', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'Products & care services.', exact: true }));
  await page.getByRole('button', { name: 'Support queue', exact: true }).click();
  await page.getByRole('button', { name: 'Mark resolved', exact: true }).click();
  await visible(page.getByText('RESOLVED', { exact: true }));
  await page.getByRole('button', { name: 'Workflow audit', exact: true }).click();
  await visible(page.getByText('ORDER REQUESTED', { exact: true }));
  await page.getByRole('button', { name: 'Service availability', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'Online payments', exact: true }));
  await logout();
  await login('member@example.test', 'A clearer picture of your health.');
  await go('orders');
  await visible(page.locator('.wf-status.status-completed'));

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['health', 'records', 'orders', 'insurance', 'movement', 'support']) {
    await go(route);
    await visible(page.locator('.wf-workspace-main'));
    assert.equal(await page.locator('.wf-workspace-main').evaluate(element => element.scrollWidth > element.clientWidth + 1), false, `${route} must fit mobile`);
  }
  await go('movement');
  await page.getByRole('button', { name: 'Save Gentle neck rotation', exact: true }).click();
  await visible(page.getByRole('button', { name: 'Unsave Gentle neck rotation', exact: true }));
  await page.reload();
  await visible(page.getByRole('button', { name: 'Unsave Gentle neck rotation', exact: true }));
  await page.getByRole('button', { name: /The desk-side reset/ }).click();
  const questions = page.getByRole('dialog').locator('fieldset');
  for (let index = 0; index < 9; index++) await questions.nth(index).getByRole('radio', { name: 'No', exact: true }).check();
  await page.getByRole('button', { name: 'Open session player', exact: true }).click();
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'Skip move', exact: true }).click();
  await visible(page.getByText('Saved to your account.', { exact: true }));
  await page.getByRole('button', { name: 'Back to movement', exact: true }).click();
  await page.reload();
  await visible(page.locator('.exercise-history li'));
  await screenshot('real-movement-mobile');
  await page.getByRole('button', { name: 'Open workspace navigation', exact: true }).click();
  await logout();
  await signup('second@example.test', 'Second Member');
  await visible(page.getByRole('heading', { name: 'Your readings start here.', exact: true }));
  await go('records');
  await visible(page.getByRole('heading', { name: 'Your vault is ready.', exact: true }));
  await go('orders');
  await visible(page.getByRole('heading', { name: 'No requests yet.', exact: true }));
  await screenshot('real-private-mobile');
  await page.getByText('Display settings', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Reduce interface motion', exact: true }).check();
  assert.equal(await page.locator('html').getAttribute('data-ui-motion'), 'reduced');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS real workflow: verified registration, restored sessions, private readings/documents, server-priced order, vendor fulfilment, admin support/audit, cross-user isolation, mobile pages, and persistent exercise bookmarks.');
} catch (error) {
  if (page && process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/real-workflow-failure.png`, fullPage: true, animations: 'disabled' });
  throw error;
} finally {
  await browser?.close();
  api.kill('SIGTERM'); vite.kill('SIGTERM');
  await Promise.all([new Promise(resolve => api.exitCode !== null ? resolve() : api.once('exit', resolve)), new Promise(resolve => vite.exitCode !== null ? resolve() : vite.once('exit', resolve))]);
  await rm(directory, { recursive: true, force: true });
}
