// Run with browser-automation's --script against a running Vite server.
// All API requests are intercepted; the fixture is independent of route registration.
import assert from 'node:assert/strict';

export default async function run(page) {
  const base = new URL(page.url()).origin;
  const errors = [];
  const writes = [];
  const now = Math.floor(Date.now() / 1000);
  const provider = { id: 'provider-fixture', name: 'Fixture clinic', sourceUrl: 'https://example.test/source', bookingUrl: null, lastVerifiedAt: now - 3600, expiresAt: now + 86400, active: true, verificationStatus: 'VERIFIED' };
  const vaccine = { ...provider, id: 'vaccine-fixture', providerId: provider.id, providerName: provider.name, vaccineName: 'Fixture vaccine', pincode: '110001', region: '', pricePaise: null, currency: 'INR', availability: 'UNKNOWN' };
  let queue = [{ id: 'review-fixture', documentId: 'document-fixture', status: 'REQUESTED', version: 3, assignedClinicianId: null, createdAt: now, updatedAt: now, guidance: null, reviewedAt: null, reviewedBy: null }];
  let failQueue = true;
  let failAssignment = true;
  let failDecision = true;
  const pageOf = items => ({ items, total: items.length, offset: 0, limit: 20 });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method !== 'GET') {
      assert.equal(request.headers()['x-csrf-token'], 'preventive-fixture-csrf');
      const body = request.postDataJSON();
      writes.push({ path, method, body });
      if (path.endsWith('/assign')) {
        if (failAssignment) { failAssignment = false; return route.fulfill({ status: 422, json: { detail: 'A current owner-granted document share is required.' } }); }
        queue = [{ ...queue[0], assignedClinicianId: body.clinicianId, status: 'ASSIGNED', version: 4 }];
        return route.fulfill({ json: queue[0] });
      }
      if (path.endsWith('/review')) {
        if (failDecision) { failDecision = false; return route.fulfill({ status: 409, json: { detail: 'Review version changed. Refresh the queue.' } }); }
        const reviewed = { ...queue[0], status: body.decision, version: 5 };
        queue = [];
        return route.fulfill({ json: reviewed });
      }
      if (path.includes('/ops/providers')) return route.fulfill({ json: { ...provider, ...body } });
      if (path.includes('/ops/vaccines')) return route.fulfill({ json: { ...vaccine, ...body } });
      throw new Error(`Unexpected mutation ${path}`);
    }
    if (path === '/api/preventive/providers') return route.fulfill({ json: pageOf([provider]) });
    if (path === '/api/preventive/vaccines') return route.fulfill({ json: pageOf([vaccine]) });
    if (path === '/api/ops/accounts') return route.fulfill({ json: { items: [
      { id: 'doctor-fixture', fullName: 'Fixture doctor', identifier: 'doctor@example.test', role: 'NMC_DOCTOR', active: true },
      { id: 'inactive-fixture', fullName: 'Inactive doctor', role: 'NMC_DOCTOR', active: false },
      { id: 'admin-fixture', fullName: 'Fixture administrator', role: 'SUPER_ADMIN', active: true },
    ] } });
    if (path === '/api/preventive/ops/report-reviews') {
      if (failQueue) { failQueue = false; return route.fulfill({ status: 503, json: { detail: 'Queue temporarily unavailable' } }); }
      return route.fulfill({ json: pageOf(queue) });
    }
    if (path === '/api/preventive/work/report-reviews') return route.fulfill({ json: pageOf(queue.map(item => ({ ...item, shareId: 'share-fixture' }))) });
    throw new Error(`Unexpected GET ${path}`);
  });
  await page.goto(`${base}/tests/fixtures/preventive-staff.html`);
  await page.getByText('Queue temporarily unavailable', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByLabel('Assign clinician').waitFor();
  assert.equal(await page.getByLabel('Assign clinician').locator('option').count(), 2, 'only active NMC doctors are eligible choices');
  await page.getByLabel('Assign clinician').selectOption('doctor-fixture');
  await page.getByRole('button', { name: 'Assign review', exact: true }).click();
  await page.getByText('A current owner-granted document share is required.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Assign review', exact: true }).click();
  await page.getByText('ASSIGNED', { exact: true }).waitFor();
  assert.deepEqual(writes.find(item => item.path.endsWith('/assign')).body, { clinicianId: 'doctor-fixture', expectedVersion: 3 });

  await page.getByRole('button', { name: 'Add provider', exact: true }).click();
  await page.getByLabel('Provider name', { exact: true }).fill('New clinic');
  await page.getByLabel('Source URL', { exact: true }).fill('https://example.test/provider');
  await page.getByRole('button', { name: 'Create provider', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Provider created.' }).waitFor();
  const created = writes.find(item => item.path === '/api/preventive/ops/providers');
  assert.equal(created.method, 'POST');
  assert.equal(created.body.name, 'New clinic');
  assert.equal(created.body.lastVerifiedAt, null);

  await page.getByRole('button', { name: 'Edit Fixture clinic', exact: true }).click();
  await page.getByLabel('Booking URL', { exact: true }).fill('https://example.test/book');
  await page.getByRole('button', { name: 'Save provider changes', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Provider updated.' }).waitFor();
  assert.deepEqual(writes.at(-1).body, { bookingUrl: 'https://example.test/book' });

  await page.getByRole('button', { name: 'Add offering', exact: true }).click();
  await page.getByLabel('Provider', { exact: true }).selectOption(provider.id);
  await page.getByLabel('Vaccine name', { exact: true }).fill('New vaccine');
  await page.getByLabel('Pincode', { exact: true }).fill('110001');
  await page.getByLabel('Price (₹)', { exact: true }).fill('0');
  await page.getByLabel('Source URL', { exact: true }).fill('https://example.test/vaccine');
  await page.getByLabel('Availability', { exact: true }).selectOption('CONFIRMED');
  const beforeInvalidOffering = writes.length;
  await page.getByRole('button', { name: 'Create offering', exact: true }).click();
  await page.getByText('Confirmed availability requires a verification time and a future expiry.', { exact: true }).waitFor();
  assert.equal(writes.length, beforeInvalidOffering);
  const dates = await page.evaluate(now => [now - 3600, now + 86400].map(value => {
    const date = new Date(value * 1000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }), now);
  await page.getByLabel('Last verified', { exact: true }).fill(dates[0]);
  await page.getByLabel('Verification expires', { exact: true }).fill(dates[1]);
  await page.getByRole('button', { name: 'Create offering', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Offering created.' }).waitFor();
  assert.equal(writes.at(-1).body.pricePaise, 0, 'zero must remain distinct from unknown');
  assert.equal(writes.at(-1).body.availability, 'CONFIRMED');
  assert.ok(Math.abs(writes.at(-1).body.lastVerifiedAt - (now - 3600)) < 60, 'dates must be Unix seconds');

  await page.getByRole('button', { name: 'Edit Fixture vaccine', exact: true }).click();
  await page.getByLabel('Region', { exact: true }).fill('Updated region');
  await page.getByRole('button', { name: 'Save offering changes', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Offering updated.' }).waitFor();
  assert.deepEqual(writes.find(item => item.path.endsWith('/ops/vaccines/vaccine-fixture')).body, { region: 'Updated region' }, 'PATCH must not overwrite masked price or availability');
  await page.getByRole('button', { name: 'Deactivate Fixture vaccine', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Offering deactivated.' }).waitFor();
  assert.deepEqual(writes.at(-1).body, { active: false });

  await page.goto(`${base}/tests/fixtures/preventive-staff.html?review`);
  const source = page.getByRole('link', { name: 'Open shared report' });
  await source.waitFor();
  assert.equal(await source.getAttribute('href'), '/api/records/shares/share-fixture/document');
  await page.getByLabel('Summary', { exact: true }).fill('Clinician-authored follow-up summary.');
  await page.getByLabel('Next steps', { exact: true }).fill('Arrange a follow-up consultation.');
  await page.getByLabel('Source title 1', { exact: true }).fill('Clinical reference');
  await page.getByLabel('Source URL 1', { exact: true }).fill('https://example.test/reference');
  await page.getByRole('button', { name: 'Approve guidance', exact: true }).click();
  await page.getByText('Review version changed. Refresh the queue.', { exact: true }).waitFor();
  const approval = writes.at(-1).body;
  assert.equal(approval.expectedVersion, 4);
  assert.equal(approval.decision, 'APPROVED');
  assert.deepEqual(approval.sourceRefs, [{ title: 'Clinical reference', url: 'https://example.test/reference' }]);
  await page.getByRole('button', { name: 'Approve guidance', exact: true }).click();
  await page.getByText('No reports ready for review.', { exact: true }).waitFor();
  assert.equal(writes.at(-1).body.summary, 'Clinician-authored follow-up summary.');
  queue = [{ id: 'second-review', documentId: 'second-document', status: 'ASSIGNED', version: 8, assignedClinicianId: 'doctor-fixture', createdAt: now, updatedAt: now, guidance: null, reviewedAt: null, reviewedBy: null }];
  await page.getByRole('button', { name: 'Refresh reviews', exact: true }).click();
  await page.getByRole('heading', { name: 'Report second-document' }).waitFor();
  await page.getByLabel('Summary', { exact: true }).fill('Draft that must not be sent on rejection');
  await page.getByLabel('Decision', { exact: true }).selectOption('REJECTED');
  await page.getByRole('button', { name: 'Reject review', exact: true }).click();
  await page.getByText('No reports ready for review.', { exact: true }).waitFor();
  assert.deepEqual(writes.at(-1).body, { expectedVersion: 8, decision: 'REJECTED' });

  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(`${base}/tests/fixtures/preventive-staff.html`);
  await page.getByRole('button', { name: 'Add provider', exact: true }).click();
  await page.getByLabel('Provider name', { exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile layout must not overflow');
  assert.deepEqual(errors, []);
  return { passed: ['queue retry', 'active NMC accounts', 'share-required error', 'versioned assignment', 'create and PATCH provider', 'confirmation validation', 'create offering with zero price and Unix dates', 'partial offering PATCH', 'deactivate', 'share URL', 'approval and conflict', 'guidance-free rejection', 'mobile layout'] };
}
