import { expect, test } from '@playwright/test';
import { signUp } from './support/journeys';

const BUYER = 'buyer@example.test';
const ITEM = 'Campus digital thermometer';

test('ordering from the shop: a declined payment charges nothing, and paying again completes the order', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await signUp(page, BUYER, 'Test Buyer');
  await expect(page).toHaveURL(/\/health$/);

  await page.goto('/shop');
  await page.getByRole('button', { name: `Add, ${ITEM}`, exact: true }).click();
  await page.getByRole('button', { name: 'Cart, 1 item', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  // The price shown is the server's price for the fixture item (25000 paise).
  const pay = page.getByRole('button', { name: 'Continue to pay ₹250', exact: true });
  await expect(pay).toBeVisible();
  await page.getByLabel('City', { exact: true }).fill('Hyderabad');
  await page.getByLabel('Pincode', { exact: true }).fill('500001');

  // Home delivery is refused when the provider has not listed the pincode (the fixture
  // seller lists none), and the student is told what to do instead. Nothing is ordered.
  await page.getByRole('radio', { name: /Home delivery or collection/ }).click();
  await page.getByLabel('Full address', { exact: true }).fill('Room 214, Block C, Boys Hostel');
  await pay.click();
  await expect(page.getByText('The provider does not deliver to this pincode. Choose pickup at the provider, or use another address.')).toBeVisible();
  await expect(page.getByText('This is a test payment', { exact: true })).toHaveCount(0);

  // Pickup needs no delivery cover.
  await page.getByRole('radio', { name: /At the provider/ }).click();
  await pay.click();

  // The fixture runs the test gateway: no real money can move.
  await expect(page.getByText('This is a test payment', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: /Bank declines the payment/ }).click();
  await page.getByRole('button', { name: /^Pay ₹250/ }).click();
  await expect(page.getByRole('heading', { name: 'Payment failed' })).toBeVisible();
  await expect(page.getByText('Your bank declined it. Nothing was charged.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Try another method', exact: true }).click();
  await page.getByRole('radio', { name: /Payment goes through/ }).click();
  await page.getByRole('button', { name: /^Pay ₹250/ }).click();
    await expect(page.getByText('Order placed', { exact: true })).toBeVisible();
  await expect(page.getByText('₹250 paid', { exact: true })).toBeVisible();

  // The paid order is on the student's own orders page, waiting on the provider.
  await page.getByRole('button', { name: 'My orders', exact: true }).click();
  await expect(page).toHaveURL(/\/orders$/);
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
  await expect(page.getByText(ITEM, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('1 item · ₹250 paid', { exact: true })).toBeVisible();
  await expect(page.getByText('Waiting for payment', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
