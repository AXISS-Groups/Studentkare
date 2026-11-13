import { expect, type Page } from '@playwright/test';
import { latestCode } from './codes';

/** Long enough for the server's rules, and not a real password anywhere. */
export const TEST_PASSWORD = 'Harbour-Lantern-42x';

/** Types the code the fixture API delivered to this address and submits it. */
export async function enterCode(page: Page, identifier: string): Promise<void> {
  const field = page.getByLabel('Verification code', { exact: true });
  await expect(field).toBeVisible();
  await field.fill(await latestCode(identifier));
  await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
}

/**
 * Creates a student account the way a student does: contact, code, details,
 * campus, password, then the three consent ticks. Ends signed in.
 */
export async function signUp(page: Page, identifier: string, name: string, beforeCode?: () => Promise<void>): Promise<void> {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create my account', exact: true }).click();
  await page.getByLabel('Full name', { exact: true }).fill(name);
  await page.getByLabel('Campus email address', { exact: true }).fill(identifier);
  await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
  await beforeCode?.();
  await enterCode(page, identifier);

  await expect(page.getByRole('heading', { name: 'A few details about you.' })).toBeVisible();
  await page.getByLabel('Full name', { exact: true }).fill(name);
  await page.getByLabel('Date of birth', { exact: true }).fill('2000-03-14');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await page.getByRole('button', { name: 'Add campus details', exact: true }).click();
  await page.getByLabel('University or institution', { exact: true }).fill('Test University');
  await page.getByLabel('Student or roll number', { exact: true }).fill('TEST-42');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Create a password' })).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel('Type it again', { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await acceptRequiredConsent(page);
}

/** Ticks each required consent item by its label, as a person would, then submits. */
export async function acceptRequiredConsent(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Your data, your call' })).toBeVisible();
  const items = page.locator('label.sk-consent__item');
  await expect(items).toHaveCount(3);
  for (let index = 0; index < 3; index++) await items.nth(index).click();
  for (const box of await page.getByRole('checkbox').all()) await expect(box).toBeChecked();
  await page.locator('button.sk-consent__continue').click();
}

/** Signs out through the confirmation dialog and waits for the session to be gone. */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out here', exact: true }).click();
  await expect.poll(() => sessionUser(page)).toBeNull();
}

/**
 * Signs an existing account in with a one-time code. Pass `stay` when the
 * browser is already on the sign-in page and its address must be kept (for
 * example `/login?next=orders`).
 */
export async function signIn(page: Page, identifier: string, stay = false): Promise<void> {
  if (!stay) await page.goto('/login');
  await page.getByLabel('Campus email address', { exact: true }).fill(identifier);
  await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
  await enterCode(page, identifier);
  // The session exists before the caller navigates anywhere else.
  await expect.poll(() => sessionUser(page)).not.toBeNull();
}

/** Who the server says is signed in on this browser, or null. */
export async function sessionUser(page: Page): Promise<{ email: string; role: string } | null> {
  return page.evaluate(async () => (await (await fetch('/api/auth/session')).json()).user);
}
