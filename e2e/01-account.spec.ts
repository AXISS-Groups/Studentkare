import { expect, test } from '@playwright/test';
import { latestCode } from './support/codes';
import { sessionUser, signIn, signOut, signUp } from './support/journeys';

const MEMBER = 'member@example.test';

test.describe.configure({ mode: 'serial' });

test.describe('creating an account and signing in', () => {
  test('a signed-out visitor is sent to sign-in from a private page', async ({ page }) => {
    await page.goto('/records');
    await expect(page).toHaveURL(/\/login\?next=records$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await sessionUser(page)).toBeNull();
  });

  test('sign-up needs a delivered code and all three consent ticks, then opens My health', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await signUp(page, MEMBER, 'Test Member', async () => {
      // A wrong code must not move the journey forward or open a session.
      const real = await latestCode(MEMBER);
      await page.getByLabel('Verification code', { exact: true }).fill(real === '000000' ? '111111' : '000000');
      await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible();
      expect(await sessionUser(page)).toBeNull();
    });
    await expect(page).toHaveURL(/\/health$/);
    expect(await sessionUser(page)).toMatchObject({ email: MEMBER, role: 'STUDENT' });
    expect(errors).toEqual([]);
  });

  test('consent cannot be submitted until every required item is ticked', async ({ page }) => {
    const second = 'consent-check@example.test';
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Create my account', exact: true }).click();
    await page.getByLabel('Full name', { exact: true }).fill('Consent Check');
    await page.getByLabel('Campus email address', { exact: true }).fill(second);
    await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
    await page.getByLabel('Verification code', { exact: true }).fill(await latestCode(second));
    await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
    await page.getByLabel('Full name', { exact: true }).fill('Consent Check');
    await page.getByLabel('Date of birth', { exact: true }).fill('2000-03-14');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Add campus details', exact: true }).click();
    await page.getByLabel('University or institution', { exact: true }).fill('Test University');
    await page.getByLabel('Student or roll number', { exact: true }).fill('TEST-43');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill('Harbour-Lantern-42x');
    await page.getByLabel('Type it again', { exact: true }).fill('Harbour-Lantern-42x');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    const submit = page.locator('button.sk-consent__continue');
    const items = page.locator('label.sk-consent__item');
    await expect(submit).toBeDisabled();
    await items.nth(0).click();
    await items.nth(1).click();
    await expect(submit).toBeDisabled();
    expect(await sessionUser(page)).toBeNull();
  });

  test('signing out ends the session; signing back in needs a fresh code and returns to the page asked for', async ({ page }) => {
    await signIn(page, MEMBER);
    await expect(page).toHaveURL(/\/health$/);

    // A student who opens the admin console is taken back to their own space.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/health$/);

    await signOut(page);
    await expect(page).toHaveURL(/\/logged-out$/);
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login\?next=orders$/);

    await signIn(page, MEMBER, true);
    await expect(page).toHaveURL(/\/orders$/);
    expect(await sessionUser(page)).toMatchObject({ email: MEMBER });
  });
});
