// Run with browser-automation --script while Vite is running. Synthetic API responses only.
import assert from 'node:assert/strict';

export default async function run(page) {
  const origin = new URL(page.url()).origin;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let preferences = { seasonalEducationEnabled: false, promotionsEnabled: false, region: '', topics: [], consentVersion: 1, updatedAt: null };
  let reviews = [];
  let failVaccines = true;
  const writes = [];
  const fixtureVaccine = { id: 'vaccine-fixture', providerId: 'provider-fixture', providerName: 'Fixture Clinic', vaccineName: 'Influenza vaccine listing', pincode: '500001', region: 'Fixture region', sourceUrl: 'https://example.test/source', bookingUrl: 'https://example.test/book', lastVerifiedAt: null, expiresAt: null, pricePaise: null, currency: 'INR', availability: 'UNKNOWN', verificationStatus: 'UNVERIFIED' };
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postData() ? request.postDataJSON() : {};
    if (request.method() !== 'GET') {
      assert.equal(request.headers()['x-csrf-token'], 'patient-test-csrf');
      writes.push({ path, body });
    }
    let json = { items: [], total: 0, limit: 20, offset: 0 };
    if (path === '/api/auth/session') json = { user: { id: 'patient-fixture', fullName: 'Fixture Patient', role: 'STUDENT', university: 'Fixture Campus' }, csrfToken: 'patient-test-csrf' };
    else if (path === '/api/config/public') json = {};
    else if (path === '/api/preventive/providers') json = { ...json, items: [{ id: 'provider-fixture', name: 'Fixture Clinic' }], total: 1 };
    else if (path === '/api/preventive/vaccines') {
      if (failVaccines) return route.fulfill({ status: 503, json: { detail: 'Directory unavailable' } });
      json = { items: [fixtureVaccine], total: 1, offset: 0, limit: 12 };
    } else if (path === '/api/preventive/preferences') {
      if (request.method() === 'PUT') preferences = { ...body, consentVersion: 1, updatedAt: 1789400000 };
      json = preferences;
    } else if (path === '/api/health/documents') json = { items: [{ id: 'document-fixture', title: 'Fixture lab report', category: 'LAB', filename: 'report.pdf' }] };
    else if (path === '/api/preventive/report-reviews') {
      if (request.method() === 'POST') {
        const review = { id: 'review-fixture', documentId: body.documentId, status: 'REQUESTED', version: 1, guidance: null, reviewedBy: null, reviewedAt: null };
        reviews = [review]; json = review;
      } else json = { ...json, items: reviews, total: reviews.length };
    } else if (path.endsWith('/review-fixture/withdraw')) { reviews = [{ ...reviews[0], status: 'WITHDRAWN', guidance: null }]; json = reviews[0]; }
    return route.fulfill({ json });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/?preventive-patient-test=1#/preventive-care`);
  await page.getByText('Directory unavailable', { exact: true }).waitFor();
  failVaccines = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('heading', { name: fixtureVaccine.vaccineName, exact: true }).waitFor();
  await page.getByText('Ask provider for price', { exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Contact provider', exact: true }).getAttribute('href'), fixtureVaccine.bookingUrl);
  await page.getByLabel('Pincode (optional)', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Search listings', exact: true }).click();
  await page.getByText('Enter a valid six-digit Indian pincode.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: fixtureVaccine.vaccineName, exact: true }).count(), 0);
  await page.getByLabel('Pincode (optional)', { exact: true }).fill('500001');
  await page.getByRole('button', { name: 'Search listings', exact: true }).click();
  await page.getByRole('heading', { name: fixtureVaccine.vaccineName, exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'portrait must not overflow');

  await page.getByRole('button', { name: 'Seasonal care & preferences', exact: true }).click();
  const promotions = page.getByRole('checkbox', { name: /Provider promotions/ });
  await promotions.waitFor();
  assert.equal(await promotions.isChecked(), false);
  await promotions.check();
  await page.getByRole('checkbox', { name: /Seasonal health education/ }).check();
  await page.getByLabel('Region (optional)', { exact: true }).fill('Fixture region');
  await page.getByRole('button', { name: 'Save preventive preferences', exact: true }).click();
  await page.getByText(/Preferences saved\./).waitFor();
  assert.equal(writes.at(-1).body.promotionsEnabled, true);
  assert.equal('accountId' in writes.at(-1).body, false);
  await promotions.uncheck();
  await page.getByRole('button', { name: 'Save preventive preferences', exact: true }).click();
  await page.getByText(/Preferences saved\./).waitFor();
  assert.equal(writes.at(-1).body.promotionsEnabled, false);

  await page.getByRole('button', { name: 'Report follow-up', exact: true }).click();
  await page.getByLabel('Report to review', { exact: true }).selectOption('document-fixture');
  await page.getByRole('button', { name: 'Request clinician review', exact: true }).click();
  await page.getByText('REQUESTED', { exact: true }).waitFor();
  assert.equal(writes.at(-1).body.documentId, 'document-fixture');
  assert.equal(await page.getByRole('heading', { name: 'Next steps discussed with your clinician', exact: true }).count(), 0);
  reviews = [{ ...reviews[0], status: 'APPROVED', version: 3, reviewedAt: 1789400000, reviewedBy: 'doctor-fixture', guidance: { summary: 'Fixture clinician-approved explanation.', nextSteps: ['Discuss the result at your follow-up appointment.'], questions: ['What affects this result?'], sourceRefs: [{ title: 'Fixture reference', url: 'https://example.test/reference' }] } }];
  await page.getByRole('button', { name: 'Refresh reviews', exact: true }).click();
  await page.getByText('Fixture clinician-approved explanation.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Withdraw review request', exact: true }).click();
  await page.getByText('WITHDRAWN', { exact: true }).waitFor();
  assert.equal(await page.getByText('Fixture clinician-approved explanation.', { exact: true }).count(), 0);

  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Vaccines & providers', exact: true }).click();
  await page.getByRole('heading', { name: fixtureVaccine.vaccineName, exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'landscape must not overflow');
  assert.equal(await page.locator('.preventive-resource').first().evaluate(element => getComputedStyle(element).transitionDuration), '0s');
  assert.deepEqual(errors, []);
  if (process.env.PREVENTIVE_SCREENSHOT) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: process.env.PREVENTIVE_SCREENSHOT, fullPage: true });
  }
  return { passed: ['patient route', 'directory failure/retry', 'pincode validation', 'source/unknown price', 'consent opt-in/withdrawal', 'report request', 'approved-only guidance', 'review withdrawal', 'portrait/landscape', 'reduced motion'], writes: writes.length };
}
