// API-intercepted browser regressions; no backend writes or real patient data.
// Run: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/marketplace-truthfulness.smoke.mjs
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function run(page) {
  page.setDefaultTimeout(10000);
  const base = process.env.MARKETPLACE_TEST_URL || 'http://127.0.0.1:3018';
  const product = (id, overrides = {}) => ({ id, providerId: 'test-provider', kind: 'product', name: id,
    brand: 'Test', category: 'medicines', description: 'Test catalog entry', pack: 'Pack',
    pricePaise: 1234, mrpPaise: 1500, stock: 2, active: true, requiresPrescription: false, preparation: '', ...overrides });
  const lab = product('Published lab', { kind: 'lab', stock: 0 });
  const products = [product('Eligible'), product('Rx only', { requiresPrescription: true }),
    product('Unavailable', { stock: 0 }), product('Inactive', { active: false }),
    product('Missing Rx flag', { requiresPrescription: undefined }), product('Not a product', { kind: 'consultation' })];
  const extracted = [...products.map(item => ({ matched_catalog_id: item.id, matched_catalog_name: 'Untrusted extraction name',
    price_paise: 1, requires_prescription: false, dosage: 'unknown', frequency: 'unknown' })),
    { raw_name: 'Unknown medicine', matched_catalog_id: 'unknown' },
    { raw_name: 'No catalog match' }, { matched_catalog_id: 'Eligible' }, { matched_catalog_id: 'Eligible' }];
  const slotStart = new Date(Date.now() + 86400000).toISOString();
  const slotEnd = new Date(Date.now() + 90000000).toISOString();
  const slot = { id: 'published-slot', slotStart, slotEnd, capacity: 2, booked: 0, available: 2 };
  let rxMode = 'error';
  let catalogError = false;
  let availabilityMode = 'empty';
  let bookingMode = 'conflict';
  const writes = [];
  const pages = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'POST') writes.push({ path, body: request.postDataJSON(), csrf: request.headers()['x-csrf-token'] });
    let json = { items: [], total: 0 };
    if (path === '/api/auth/session') json = { user: { id: 'test-user', fullName: 'Test', role: 'STUDENT' }, csrfToken: 'test-csrf' };
    else if (path === '/api/config/public') json = {};
    else if (path === '/api/home') json = { hero: [], aside: [], movement: [], features: [], links: [], articles: [] };
    else if (path === '/api/catalog') {
      if (url.searchParams.get('limit') === '100') {
        pages.push(Number(url.searchParams.get('offset')));
        if (catalogError) return route.fulfill({ status: 503, json: { detail: 'Catalog temporarily unavailable' } });
        // Force multiple pages even though this fixture is small.
        const offset = Number(url.searchParams.get('offset'));
        json = { items: products.slice(offset, offset + 3), total: products.length };
      } else json = { items: [lab], total: 1 };
    } else if (path === '/api/rx/extract-ai') {
      if (rxMode === 'error') return route.fulfill({ status: 503, json: { detail: 'Extraction temporarily unavailable' } });
      if (rxMode === 'network') return route.abort('failed');
      json = rxMode === 'malformed' ? { success: true } : { extracted_items: extracted, detected_doctor: 'unknown', detected_date: 'unknown' };
    } else if (path === '/api/appointments/availability') {
      assert.equal(url.searchParams.get('catalogItemId'), lab.id);
      if (availabilityMode === 'error') return route.fulfill({ status: 503, json: { detail: 'Availability temporarily unavailable' } });
      json = availabilityMode === 'malformed' ? { success: true } : { slots: availabilityMode === 'empty' ? [] : [
        { ...slot, id: 'past', slotStart: '2020-01-01T08:00:00Z' },
        { ...slot, id: 'full', booked: 2, available: 0 },
        { ...slot, id: 'invalid', slotEnd: 'invalid' }, slot] };
    } else if (path === '/api/appointments' && request.method() === 'POST') {
      assert.deepEqual(request.postDataJSON(), { slotId: slot.id });
      if (bookingMode === 'conflict') return route.fulfill({ status: 409, json: { detail: 'This slot is fully booked.' } });
      if (bookingMode === 'network') return route.abort('failed');
      json = bookingMode === 'malformed' ? { status: 'CONFIRMED_DISPATCHED', booking_id: 'fake' } : { id: 'saved-appointment', slotStart, slotEnd, status: 'REQUESTED' };
    }
    return route.fulfill({ json });
  });
  await page.goto(`${base}/?marketplace-truthfulness-test=1#/shop`);
  await page.getByRole('button', { name: 'My workspace', exact: true }).waitFor();
  await page.getByRole('button', { name: /Have a prescription/ }).click();
  const modal = page.locator('.wf-modal-card');
  const scan = () => modal.getByRole('button', { name: /^(Find catalog matches|Run AI Prescription Extraction)$/ }).click();
  const add = () => modal.getByRole('button', { name: 'Add eligible items to cart', exact: true }).click();
  const close = () => page.getByRole('button', { name: 'Close modal', exact: true }).click();
  // A failure must be visible, must preserve entered text, and must not invent matches.
  await modal.locator('textarea').fill('Test prescription text with an unknown medicine');
  await scan();
  await modal.getByRole('alert').filter({ hasText: 'Extraction temporarily unavailable' }).waitFor();
  assert.equal(await modal.getByRole('button', { name: 'Add eligible items to cart', exact: true }).count(), 0);
  for (const mode of ['network', 'malformed']) {
    rxMode = mode;
    await scan();
    await modal.getByRole('alert').filter({ hasText: mode === 'network' ? 'Cannot connect' : 'invalid' }).waitFor();
  }
  rxMode = 'success';
  await scan();
  await modal.getByText('Unknown medicine', { exact: true }).waitFor();
  await modal.getByText('No catalog match', { exact: true }).waitFor();
  assert.equal(await modal.getByText('AI Confidence: 94%', { exact: true }).count(), 0);
  catalogError = true;
  await add();
  await modal.getByRole('alert').filter({ hasText: 'Catalog temporarily unavailable' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Open cart, 0 items', exact: true }).count(), 1);
  catalogError = false;
  await add();
  await modal.getByRole('status').filter({ hasText: '2 added to cart; 8 blocked.' }).waitFor();
  assert.ok(pages.includes(3), 'catalog validation follows pagination');
  await modal.getByText('Unknown medicine', { exact: true }).waitFor();
  assert.equal(await modal.getByRole('button', { name: 'Add eligible items to cart', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Open cart, 2 items', exact: true }).count(), 1);
  await close();
  await page.getByRole('button', { name: 'Open cart, 2 items', exact: true }).click();
  const cart = page.getByRole('dialog', { name: 'Your care cart', exact: true });
  await cart.locator('.shop-cart-item-info strong').filter({ hasText: /^Eligible$/ }).waitFor();
  assert.ok((await cart.innerText()).includes('24.68'), 'cart uses server price for two accepted items');
  assert.equal(await cart.getByText('Untrusted extraction name', { exact: true }).count(), 0);
  await cart.getByRole('button', { name: 'Close dialog', exact: true }).click();
  // Already-full cart entries are blocked and accurately counted on a new scan.
  await page.getByRole('button', { name: /Have a prescription/ }).click();
  await modal.locator('textarea').fill('Another prescription');
  await scan();
  await add();
  await modal.getByRole('status').filter({ hasText: '0 added to cart; 10 blocked.' }).waitFor();
  await close();
  // Real availability only; empty/error/malformed responses never enable booking.
  const openLab = () => page.getByRole('button', { name: 'Book Slot', exact: true }).click();
  await openLab();
  await modal.getByText('No bookable slots are currently published for this test.', { exact: true }).waitFor();
  assert.equal(await modal.getByRole('button', { name: 'Request selected slot', exact: true }).isDisabled(), true);
  await modal.getByRole('button', { name: 'Continue with a care request', exact: true }).click();
  await cart.locator('.shop-cart-item-info strong').filter({ hasText: /^Published lab$/ }).waitFor();
  assert.equal(writes.filter(write => write.path === '/api/appointments').length, 0);
  await cart.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await openLab();
  const refresh = () => modal.getByRole('button', { name: 'Refresh availability', exact: true }).click();
  for (const mode of ['error', 'malformed']) {
    availabilityMode = mode;
    await refresh();
    await modal.getByRole('alert').filter({ hasText: mode === 'error' ? 'Availability temporarily unavailable' : 'invalid' }).waitFor();
    assert.equal(await modal.getByRole('button', { name: 'Request selected slot', exact: true }).isDisabled(), true);
  }
  availabilityMode = 'success';
  await refresh();
  await modal.getByLabel('Available provider slots', { exact: true }).selectOption(slot.id);
  assert.equal(await modal.locator('select option').count(), 2, 'only one future, non-full valid slot plus placeholder');
  const book = () => modal.getByRole('button', { name: 'Request selected slot', exact: true }).click();
  await book();
  await modal.getByRole('alert').filter({ hasText: 'This slot is fully booked.' }).waitFor();
  assert.equal(await modal.getByText('Appointment request saved', { exact: true }).count(), 0);
  for (const mode of ['network', 'malformed', 'success']) {
    bookingMode = mode;
    await refresh();
    await modal.getByLabel('Available provider slots', { exact: true }).selectOption(slot.id);
    await book();
    if (mode !== 'success') {
      await modal.getByRole('alert').filter({ hasText: mode === 'network' ? 'Cannot connect' : 'verify' }).waitFor();
      assert.equal(await modal.getByText('Appointment request saved', { exact: true }).count(), 0);
    }
  }
  await modal.getByText('Appointment request saved', { exact: true }).waitFor();
  assert.ok((await modal.innerText()).includes('REQUESTED'));
  assert.ok((await modal.innerText()).includes('Provider confirmation is pending'));
  assert.equal(await modal.getByText('Phlebotomist Dispatched Successfully!', { exact: true }).count(), 0);
  assert.ok(writes.every(write => write.csrf === 'test-csrf'), 'all writes use apiRequest CSRF');
  assert.ok(writes.every(write => ['/api/rx/extract-ai', '/api/appointments'].includes(write.path)), 'no clinician Rx or dispatch writes');
  await modal.getByRole('button', { name: 'View appointments', exact: true }).click();
  await page.waitForURL(url => url.hash === '#/appointments');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  return { passed: ['Rx HTTP/network/invalid response', 'catalog error and pagination', 'server-only eligibility/prices',
    'unknowns retained for review', 'accepted/blocked quantity counts', 'care-request fallback', 'availability filtering/errors',
    'booking conflict/network/invalid response', 'saved REQUESTED appointment', 'CSRF; no clinician Rx or fabricated dispatch'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { createServer } = await import('vite');
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const address = new URL(process.env.MARKETPLACE_TEST_URL || 'http://127.0.0.1:3018');
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
