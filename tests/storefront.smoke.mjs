// Browser-automation --script entry. Requires the local, seeded development API.
// No server writes: exercises discovery, local cart, and the slot sign-in gate.
// STOREFRONT_TEST_URL defaults to http://127.0.0.1:3000.
import assert from 'node:assert/strict';

export default async function run(page, ui) {
  const base = process.env.STOREFRONT_TEST_URL || 'http://127.0.0.1:3000';
  const passed = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(15000);
  const home = async () => {
    await page.goto(`${base}/#/shop`);
    await page.locator('.storefront-hero').waitFor();
    await page.locator('#care-catalog .shop-product-card').first().waitFor();
  };
  const screenshot = async name => {
    if (process.env.STOREFRONT_SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.STOREFRONT_SCREENSHOT_DIR}/${name}.png`, fullPage: false });
    }
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await home();
  if (ui) await ui.snapshot();
  await page.waitForFunction(() => [...document.querySelectorAll('.storefront-hero-photo img')].every(img => img.complete && img.naturalWidth > 0));
  await screenshot('storefront-desktop');
  await page.getByRole('button', { name: 'Next highlight', exact: true }).click();
  await page.getByRole('heading', { name: /Good skin days/ }).waitFor();
  await page.getByRole('button', { name: 'Next highlight', exact: true }).click();
  await page.getByRole('heading', { name: /Nourish your day/ }).waitFor();
  await page.getByRole('button', { name: 'Next highlight', exact: true }).click();
  await page.getByRole('heading', { name: /A little care/ }).waitFor();
  await page.getByRole('button', { name: 'Previous highlight', exact: true }).click();
  await page.getByRole('heading', { name: /Nourish your day/ }).waitFor();
  passed.push('Carousel next/previous wrap and content updates');

  await page.getByRole('button', { name: 'Show highlight 2: Explore skin care', exact: true }).click();
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/catalog?') && response.url().includes('category=skin') && response.status() === 200),
    page.getByRole('button', { name: 'Explore skin care', exact: true }).click(),
  ]);
  await page.locator('#care-catalog .shop-product-card').first().waitFor();
  assert.equal(await page.getByLabel('Category', { exact: true }).inputValue(), 'skin');
  assert.equal(await page.locator('.storefront-hero').count(), 0);
  await page.getByLabel('Search products and services', { exact: true }).fill('sunscreen');
  await page.locator('#care-catalog .shop-product-card').filter({ hasText: 'Daily Defence Sunscreen' }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('#care-catalog .shop-product-card').length === 1);
  const product = page.locator('#care-catalog .shop-product-card').first();
  const productName = await product.locator('.shop-product-title').innerText();
  const productPrice = await product.locator('.shop-price-row strong').innerText();
  await product.getByRole('button', { name: `Add ${productName}`, exact: true }).click();
  await page.getByRole('button', { name: 'Open cart, 1 items', exact: true }).click();
  const cart = page.getByRole('dialog', { name: 'Your care cart', exact: true });
  await cart.waitFor();
  assert.equal(await cart.locator('.shop-cart-item-info strong').innerText(), productName);
  assert.equal(await cart.locator('.shop-cart-item-info b').innerText(), productPrice);
  await cart.getByRole('button', { name: 'Sign in to continue', exact: true }).waitFor();
  await cart.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.locator('.storefront-hero').waitFor();
  passed.push('Campaign/category filter, real search results, cart name/price, sign-in gate, clear filters');

  await page.locator('.storefront-labs .shop-lab-card').first().getByRole('button').click();
  await page.locator('.wf-modal-card').waitFor();
  await page.locator('.wf-modal-card').getByText('Sign in to view real availability and request an appointment.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close modal', exact: true }).click();
  await page.getByRole('button', { name: 'Find your plan', exact: true }).click();
  await page.waitForURL(url => url.hash === '#/pricing');
  await page.getByRole('heading', { name: 'Student Plus', exact: true }).waitFor();
  passed.push('Lab shelf preserves the availability sign-in gate; membership banner opens pricing');

  await home();
  for (const image of await page.locator('.storefront-collection-photo img').all()) await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.storefront-collection-photo img')].every(img => img.complete && img.naturalWidth > 0));
  assert.equal(await page.locator('.storefront-collection-photo img').count(), 5);
  await page.locator('.storefront-collections').scrollIntoViewIfNeeded();
  await screenshot('storefront-collections');
  passed.push('All five locally hosted category photographs load');

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert.ok(dimensions.content <= dimensions.viewport, `No page overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => scrollTo(0, 0));
  const buttons = await page.locator('.wf-market-nav button').evaluateAll(elements => elements.map(el => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })));
  assert.ok(buttons.every((button, index) => index === 0 || button.left >= buttons[index - 1].right), 'Mobile navigation buttons do not overlap');
  await screenshot('storefront-mobile');
  passed.push('No page overflow at 320/390/768/1024/1440px; mobile navigation does not overlap');

  await page.locator('summary').filter({ hasText: 'Display settings' }).click();
  if (ui) await ui.snapshot();
  await page.getByRole('button', { name: 'Midnight', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.documentElement.dataset.uiMotion === 'reduced');
  assert.equal(await page.locator('.storefront-hero-glow').evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.equal(await page.getByRole('button', { name: 'Pause promotions', exact: true }).count(), 0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot('storefront-dark');
  passed.push('Dark appearance and system reduced-motion preference');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  return { passed };
}
