import { expect, test } from '@playwright/test';
import { signIn, signOut, signUp } from './support/journeys';
import { probeRecord, uploadRecord } from './support/records';

const OWNER = 'owner@example.test';
const OTHER = 'other@example.test';
const TITLE = 'Blood report March';

test('a record is filed into its folder, and no other student can list, open, move or delete it', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  // The owner adds a record; the file name alone files it under blood tests.
  await signUp(page, OWNER, 'Record Owner');
  await expect(page).toHaveURL(/\/health$/);
  const stored = await uploadRecord(page, TITLE, 'cbc-blood-report.pdf');
  expect(stored).toMatchObject({ status: 201, kind: 'blood', duplicate: false });

  // The same file again is the same record, not a second copy.
  expect(await uploadRecord(page, TITLE, 'cbc-blood-report.pdf')).toMatchObject({ status: 200, id: stored.id, duplicate: true });

  await page.goto('/records');
  const row = page.getByRole('row', { name: new RegExp(TITLE) });
  await expect(row).toBeVisible();
  await expect(row.getByRole('cell', { name: 'Lab report · Blood tests' })).toBeVisible();
  await expect(row.getByRole('cell', { name: 'Private', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lab reports · 1' }).first()).toBeVisible();

  // The owner can re-file it; the choice is theirs and it sticks.
  await row.getByRole('button', { name: 'Move to a folder' }).click();
  const sheet = page.getByRole('dialog', { name: `Move ${TITLE}` });
  await expect(sheet.getByRole('button', { name: 'Blood tests', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: 'Urine tests', exact: true }).click();
  await expect(row.getByRole('cell', { name: 'Lab report · Urine tests' })).toBeVisible();

  await signOut(page);

  // Signed out, the file is not served at all.
  const signedOut = await page.evaluate(async id => (await fetch(`/api/health/documents/${id}/file`)).status, stored.id);
  expect(signedOut).toBe(401);

  // A second student sees an empty vault, and the server refuses every route to the owner's record.
  await signUp(page, OTHER, 'Other Student');
  await expect(page).toHaveURL(/\/health$/);
  await page.goto('/records');
  await expect(page.getByRole('heading', { name: 'Your vault is empty' })).toBeVisible();
  await expect(page.getByText(TITLE)).toHaveCount(0);

  // 404, not 403: the server does not even confirm that the record exists.
  expect(await probeRecord(page, stored.id)).toEqual({ listed: false, file: 404, move: 404, remove: 404 });

  // None of that touched the owner's record.
  await signOut(page);
  await signIn(page, OWNER);
  await page.goto('/records');
  await expect(page.getByRole('row', { name: new RegExp(TITLE) }).getByRole('cell', { name: 'Lab report · Urine tests' })).toBeVisible();
  expect(errors).toEqual([]);
});
