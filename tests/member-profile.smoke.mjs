import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const directory = await mkdtemp(join(process.env.WORKFLOW_TEST_TMP || tmpdir(), 'care-profile-'));
const codes = new Map();
const api = spawn(process.env.PYTHON || 'backend/.venv/bin/python', ['backend/tests/workflow_server.py'], {
  env: { ...process.env, WORKFLOW_E2E: '1', WORKFLOW_TEST_DATABASE: join(directory, 'isolated.db') }, stdio: ['ignore', 'pipe', 'pipe'],
});
let buffer = '', errors = '';
api.stdout.on('data', data => {
  buffer += data.toString();
  const lines = buffer.split('\n'); buffer = lines.pop();
  for (const line of lines) if (line.startsWith('TEST_OTP ')) { const entry = JSON.parse(line.slice(9)); codes.set(entry.identifier, entry.code); }
});
api.stderr.on('data', data => { errors += data.toString(); });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '3001', '--strictPort'], {
  env: { ...process.env, CARE_API_TARGET: 'http://127.0.0.1:8011' }, stdio: ['ignore', 'ignore', 'pipe'],
});
vite.stderr.on('data', data => { errors += data.toString(); });
let browser;
async function ready(url) {
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(url)).ok) return; } catch { /* Await isolated servers. */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(errors || `Unable to start ${url}`);
}
try {
  await ready('http://127.0.0.1:8011/api/health');
  await ready('http://127.0.0.1:3001');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:3001/#/signup');
  // Exercise the real authenticated HTTP boundary; generated OTPs only leave the fixture pipe.
  const signup = await page.evaluate(async () => (await fetch('/api/auth/otp/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'profile@example.test', channel: 'EMAIL', intent: 'SIGNUP' }),
  })).status);
  assert.equal(signup, 200);
  const otp = codes.get('profile@example.test');
  assert.ok(otp);
  await page.evaluate(async code => {
    const verified = await (await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otp: code }) })).json();
    const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': verified.csrfToken }, body: JSON.stringify({ fullName: 'Test Member', dob: '2000-03-14', university: 'Test University', rollNumber: 'TEST-42' }) });
    if (response.status !== 201) throw new Error('Fixture registration failed');
  }, otp);
  await page.goto('http://127.0.0.1:3001/#/profile');
  await page.reload();
  await page.getByRole('heading', { name: 'Your profile, connected.' }).waitFor();
  await page.getByLabel('Full name', { exact: true }).fill('Updated Test Member');
  await page.getByLabel('Blood group', { exact: true }).selectOption('O+');
  await page.getByLabel('Emergency contact name', { exact: true }).fill('Test Guardian');
  await page.getByLabel('Emergency phone', { exact: true }).fill('+919876543210');
  await page.getByLabel('Allergies', { exact: true }).fill('Penicillin');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.getByText('Profile saved to your account.', { exact: true }).waitFor();
  await page.reload();
  await page.getByLabel('Full name', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Full name', { exact: true }).inputValue(), 'Updated Test Member');
  assert.equal(await page.getByLabel('Allergies', { exact: true }).inputValue(), 'Penicillin');
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'member-profile-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Digital ID', exact: true }).click();
  await page.getByRole('button', { name: 'Create Digital ID', exact: true }).click();
  await page.getByRole('img', { name: 'Your scannable member verification QR code' }).waitFor();
  assert.equal(await page.getByText('Penicillin', { exact: true }).count(), 0);
  const firstQr = await page.getByRole('img', { name: 'Your scannable member verification QR code' }).getAttribute('src');
  await page.reload();
  await page.getByRole('img', { name: 'Your scannable member verification QR code' }).waitFor();
  assert.equal(await page.getByRole('img', { name: 'Your scannable member verification QR code' }).getAttribute('src'), firstQr);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download QR (SVG)', exact: true }).click();
  assert.equal((await downloadPromise).suggestedFilename(), 'studentkare-member-qr.svg');
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'digital-id-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Replace QR code', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm replacement', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.notEqual(await page.getByRole('img', { name: 'Your scannable member verification QR code' }).getAttribute('src'), firstQr);
  await page.getByText('Verification code for a staff scanner', { exact: true }).click();
  const verificationCode = await page.getByLabel('Member verification code', { exact: true }).inputValue();
  const staffPage = await browser.newPage();
  await staffPage.goto('http://127.0.0.1:3001/#/login');
  await staffPage.evaluate(async () => {
    const sent = await fetch('/api/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'admin@example.test', channel: 'EMAIL', intent: 'LOGIN' }) });
    if (!sent.ok) throw new Error('Staff verification delivery failed');
  });
  await staffPage.evaluate(async otp => {
    const verified = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otp }) });
    if (!verified.ok) throw new Error('Staff login failed');
  }, codes.get('admin@example.test'));
  await staffPage.goto('http://127.0.0.1:3001/#/digital-id');
  await staffPage.reload();
  await staffPage.getByLabel('Scanned verification code', { exact: true }).fill(verificationCode);
  await staffPage.getByRole('button', { name: 'Verify member code', exact: true }).click();
  await staffPage.getByText('Active member code · Updated Test Member', { exact: true }).waitFor();
  await staffPage.getByLabel('Scanned verification code', { exact: true }).fill('invalid-code');
  assert.equal(await staffPage.getByText('Active member code · Updated Test Member', { exact: true }).count(), 0);
  await staffPage.close();
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.member-print-card').evaluate(node => getComputedStyle(node).visibility), 'visible');
  assert.equal(await page.locator('.member-id-controls').evaluate(node => getComputedStyle(node).visibility), 'hidden');
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1, 'Print only one card page');
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'digital-id-print.png'), fullPage: true, animations: 'disabled' });
  await page.emulateMedia({ media: 'screen' });
  await page.getByText('Display settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Midnight', exact: true }).click();
  await page.getByText('Display settings', { exact: true }).click();
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'digital-id-dark.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Revoke QR code', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm revocation', exact: true }).click();
  await page.getByRole('button', { name: 'Create Digital ID', exact: true }).waitFor();
  assert.equal(await page.getByRole('img', { name: 'Your scannable member verification QR code' }).count(), 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.care-ambient-orbit').first().evaluate(node => getComputedStyle(node).animationName), 'none');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}px`);
  }
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'digital-id-mobile.png'), fullPage: true, animations: 'disabled' });
  assert.deepEqual(pageErrors, []);
  console.log('PASS: real profile persistence, ID lifecycle, QR download, responsive layout, reduced motion, and no uncaught browser errors.');
} finally {
  if (browser) await browser.close();
  for (const process of [api, vite]) process.kill('SIGTERM');
  await Promise.all([api, vite].map(process => process.exitCode !== null ? Promise.resolve() : new Promise(resolve => process.once('exit', resolve))));
  await rm(directory, { recursive: true, force: true });
}
