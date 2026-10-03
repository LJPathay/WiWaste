import { test, expect, type Page } from '@playwright/test';
import { login, waitForPage, collectPageErrors } from '../helpers/auth';

/**
 * `/cashier/pos` — `Frontend/src/pages/cashier/POSTerminal.tsx`.
 *
 * A kiosk screen: a virtualised product grid on the left, the cart on the right, and a
 * checkout overlay. Its heading is screen-reader-only, so the spec keys off the grid and
 * cart rather than off visible chrome.
 *
 * `globalSetup` seeds one pending and one received delivery; this spec consumes a unit
 * of catalogue stock, so it reads its expectations back out of the DOM.
 */

const SEARCH = 'input[placeholder="Search product or scan barcode... (F2)"]';
const checkout = (page: Page) => page.getByRole('button', { name: /Proceed to Checkout/ });

/** Product grid cards. Each is a real `<button>` labelled "Add <name> to cart, <price>". */
const cards = (page: Page) => page.getByRole('button', { name: /^Add .+ to cart,/ });

/** The cart's per-line row, found by product name. */
const cartLine = (page: Page, name: string) =>
  page.locator('div.cursor-pointer').filter({ hasText: name }).first();

/**
 * Waits for the virtualised grid to paint, then returns the first card's product name.
 *
 * The grid is virtualised and loads asynchronously, so both the count and the name have
 * to be taken after the first card exists.
 */
async function firstProduct(page: Page): Promise<string> {
  const card = cards(page).first();
  await expect(card).toBeVisible({ timeout: 20_000 });

  const label = (await card.getAttribute('aria-label')) ?? '';
  const name = /^Add (.+) to cart,/.exec(label)?.[1] ?? '';
  expect(name, `product card had no usable label: ${label}`).not.toBe('');
  return name;
}

test.describe('Cashier · Point of sale', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'cashier');
    await page.goto('/cashier/pos');
    await waitForPage(page);
  });

  test('renders the kiosk shell and catalogue', async ({ page }) => {
    const errors = collectPageErrors(page);

    await expect(page.getByRole('heading', { name: 'Point of Sale' })).toBeAttached();
    await expect(page.getByRole('img', { name: 'WiWaste POS' })).toBeVisible();
    await expect(page.locator(SEARCH)).toBeVisible();

    // Category filters, with "All Items" active on arrival.
    for (const cat of ['All Items', 'Grocery', 'Beverages', 'Snacks', 'Pharmacy']) {
      await expect(page.getByRole('button', { name: cat, exact: true })).toBeVisible();
    }

    await expect(firstProduct(page)).resolves.toBeTruthy();
    expect(errors()).toEqual([]);
  });

  test('search narrows the grid and clearing it restores it', async ({ page }) => {
    const errors = collectPageErrors(page);

    const product = await firstProduct(page);
    const all = await cards(page).count();
    expect(all).toBeGreaterThan(1);

    const word = product.split(/\s+/)[0];
    expect(word.length).toBeGreaterThan(2);

    await page.locator(SEARCH).fill(word);
    await expect(cards(page).first()).toBeVisible();
    const narrowed = await cards(page).count();
    expect(narrowed).toBeLessThanOrEqual(all);

    await page.locator(SEARCH).fill('');
    await expect(cards(page)).toHaveCount(all);

    expect(errors()).toEqual([]);
  });

  test('adds a product to the cart and adjusts its quantity', async ({ page }) => {
    const errors = collectPageErrors(page);

    const product = await firstProduct(page);
    await cards(page).first().click();

    const line = cartLine(page, product);
    await expect(line).toBeVisible();
    await expect(line).toContainText('1');

    // Two stepper controls per line, minus then plus.
    await line.getByRole('button').nth(1).click();
    await expect(line).toContainText('2');

    await line.getByRole('button').first().click();
    await expect(line).toContainText('1');

    expect(errors()).toEqual([]);
  });

  test('takes a cash payment and clears the cart', async ({ page }) => {
    const errors = collectPageErrors(page);

    const product = await firstProduct(page);
    await cards(page).first().click();
    await expect(cartLine(page, product)).toBeVisible();

    await checkout(page).click();

    const due = page.getByText('Amount Due', { exact: true });
    await expect(due).toBeVisible();
    await expect(page.getByText('Amount Received', { exact: true })).toBeVisible();

    // A quick-amount chip fills the tender box without touching the keyboard.
    const chip = page.locator('button').filter({ hasText: /^₱[\d,]+$/ }).first();
    await expect(chip).toBeVisible();
    await chip.click();

    const complete = page.getByRole('button', { name: 'Complete Payment' });
    await expect(complete).toBeEnabled();
    await complete.click();

    // The sale is written and the kiosk returns to an empty cart.
    await expect(due).toBeHidden({ timeout: 20_000 });
    await expect(cartLine(page, product)).toHaveCount(0);

    expect(errors()).toEqual([]);
  });

  test('refuses to complete an underpayment', async ({ page }) => {
    const errors = collectPageErrors(page);

    await firstProduct(page);
    await cards(page).first().click();
    await checkout(page).click();

    const due = page.getByText('Amount Due', { exact: true });
    await expect(due).toBeVisible();

    // Nothing tendered cannot cover the total, so the button stays inert.
    const complete = page.getByRole('button', { name: 'Complete Payment' });
    await expect(complete).toBeDisabled();

    await page.getByPlaceholder('0.00').fill('0.01');
    await expect(complete).toBeDisabled();

    expect(errors()).toEqual([]);
  });
});
