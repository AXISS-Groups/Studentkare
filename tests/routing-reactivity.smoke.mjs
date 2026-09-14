// Run directly (PLAYWRIGHT_MODULE may point to a Playwright-compatible install),
// or use the browser-automation runner --script while Vite is running.
// API responses are intercepted; no real accounts or backend writes are used.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function run(page) {
  const base = process.env.ROUTING_TEST_URL || 'http://127.0.0.1:3017';
  const user = { id: 'routing-test', fullName: 'Routing Test', role: 'STUDENT', university: 'Test Campus' };
  let sessionUser = user;
  let sessionError = false;
  let releaseSession;
  let heldSession;
  let holdSession = false;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let json = { items: [], total: 0 };
    if (path === '/api/auth/session') {
      if (holdSession) await heldSession;
      if (sessionError) return route.fulfill({ status: 503, json: { detail: 'Session temporarily unavailable' } });
      json = { user: sessionUser, csrfToken: sessionUser ? 'test-csrf' : '' };
    } else if (path === '/api/auth/options') json = { channels: ['EMAIL'] };
    else if (path === '/api/auth/otp/send') json = { targetMasked: 'test@example.test' };
    else if (path === '/api/auth/otp/verify') {
      sessionUser = user;
      json = { user, csrfToken: 'test-csrf' };
    } else if (path === '/api/home') json = { hero: [], aside: [], movement: [], features: [], links: [], articles: [] };
    else if (path === '/api/blood/donors') json = { donors: [] };
    else if (path === '/api/meds/schedule') json = { plans: [], daily_completion_rate: 0, todays_taken: 0, loop_status: 'idle' };
    else if (path === '/api/config/public') json = {};
    return route.fulfill({ json });
  });
  let visit = 0;
  // A unique document query forces a cold load rather than a same-document hash change.
  const go = path => page.goto(`${base}/?routing-test=${++visit}#${path}`);
  const at = path => page.waitForURL(url => url.hash === `#${path}`);

  await go('/');
  await at('/shop');
  await page.getByRole('button', { name: 'Studentkare home', exact: true }).waitFor();
  await go('/does-not-exist');
  await at('/shop');

  holdSession = true;
  heldSession = new Promise(resolve => { releaseSession = resolve; });
  const sessionRequest = page.waitForRequest(request => new URL(request.url()).pathname === '/api/auth/session');
  await go('/records');
  await sessionRequest;
  await page.waitForFunction(() => document.querySelector('#main-content') !== null);
  assert.equal(new URL(page.url()).hash, '#/records', 'loading must retain the deep link');
  holdSession = false;
  releaseSession();
  await page.getByRole('heading', { name: 'Every record has a place.', exact: true }).waitFor();

  sessionError = true;
  await go('/records');
  await page.getByRole('button', { name: 'Retry session check', exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '#/records');
  sessionError = false;
  await page.getByRole('button', { name: 'Retry session check', exact: true }).click();
  await page.getByRole('heading', { name: 'Every record has a place.', exact: true }).waitFor();

  sessionUser = null;
  await page.evaluate(() => window.dispatchEvent(new Event('care:session-expired')));
  await at('/login?next=records');
  sessionUser = user;
  await go('/records');
  await page.getByRole('heading', { name: 'Every record has a place.', exact: true }).waitFor();

  await page.locator('.wf-skip-link').focus();
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '#/records');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content');

  await go('/admin/catalog');
  await at('/health');
  await page.getByRole('button', { name: 'Find your movement', exact: true }).click();
  await at('/movement');
  await go('/health');
  await page.getByRole('button', { name: /records in your health vault/ }).click();
  await at('/records');

  sessionUser = null;
  await go('/checkout');
  await at('/login?next=checkout');
  await page.getByLabel('Email address', { exact: true }).fill('test@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
  await at('/checkout');
  await page.getByRole('dialog', { name: 'Your care cart', exact: true }).waitFor();

  await go('/login?next=https%3A%2F%2Fexample.com');
  await at('/health');

  await page.setViewportSize({ width: 390, height: 500 });
  await go('/shop');
  await page.getByText('Display settings', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Reduce interface motion', exact: true }).check();
  await page.waitForFunction(() => document.documentElement.dataset.uiMotion === 'reduced');
  await page.getByRole('button', { name: /Have a prescription/ }).click();
  const modal = page.locator('.wf-modal-card');
  await modal.waitFor();
  assert.ok(await modal.evaluate(element => element.getBoundingClientRect().height <= window.innerHeight), 'modal fits a short mobile viewport');
  assert.equal(await page.locator('[data-ui="page"]').first().evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.ok(await page.getByRole('button', { name: 'Close modal', exact: true }).evaluate(element => element.getBoundingClientRect().height >= 44));
  await page.setViewportSize({ width: 844, height: 390 });
  assert.ok(await modal.evaluate(element => element.getBoundingClientRect().height <= window.innerHeight), 'modal also fits landscape');
  await page.getByRole('button', { name: 'Close modal', exact: true }).click();
  await page.getByText('Display settings', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Reduce interface motion', exact: true }).uncheck();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.documentElement.dataset.uiMotion === 'reduced');
  assert.equal(await page.getByRole('checkbox', { name: 'Reduce interface motion', exact: true }).isDisabled(), true);

  await page.goto(`${base}/tests/fixtures/router-state.html#/draft`);
  await page.getByLabel('Draft', { exact: true }).fill('Keep my unsaved draft');
  await page.getByRole('button', { name: 'Rerender shell 0', exact: true }).click();
  await page.getByRole('button', { name: 'Rerender shell 1', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Draft', { exact: true }).inputValue(), 'Keep my unsaved draft');
  assert.equal(await page.getByLabel('Load count', { exact: true }).textContent(), '1');

  await page.goto(`${base}/tests/fixtures/native-reactivity.html`);
  await page.getByRole('button', { name: 'Complete next station', exact: true }).waitFor();
  const before = await page.locator('body').innerText();
  await page.getByRole('button', { name: 'Complete next station', exact: true }).click();
  await page.getByRole('button', { name: 'Seal & award points', exact: true }).click();
  await page.waitForFunction(old => document.body.innerText !== old, before);
  assert.notEqual((await page.locator('body').innerText()).match(/\d+ of \d+ stations/)[0], before.match(/\d+ of \d+ stations/)[0], 'native progress updates without a reload');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  return { passed: ['root/fallback', 'session loading/retry/expiry', 'absolute role redirect', 'skip-link focus', 'dashboard CTAs', 'checkout return', 'invalid next', 'mobile modal/motion', 'lazy state retention', 'native camp reactivity'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { createServer } = await import('vite');
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const address = new URL(process.env.ROUTING_TEST_URL || 'http://127.0.0.1:3017');
  const server = await createServer({ server: { host: address.hostname, port: Number(address.port), strictPort: true } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    console.log(await run(page));
  } finally {
    await browser?.close();
    await server.close();
  }
}
