import { test, expect, type Page } from '@playwright/test';
import { login, waitForPage, MAIN, collectPageErrors } from '../helpers/auth';

/**
 * `/cashier/returns` — `Frontend/src/pages/cashier/ReturnsRefunds.tsx`.
 *
 * Two panels: a searchable list of sold lines with a per-row "Select" control, and the
 * return form that appears once a line is picked. Recording a return writes a row into
 * the Returns History table below.
 *
 * This spec records a return, which mutates shared state — the only returning test in
 * the file, so there is no ordering constraint.
 */

const SEARCH = 'input[placeholder="Search by Transaction #, Product, or SKU..."]';
const SOLD_ROWS = `${MAIN} table tbody tr`;

/** The sold-line table's own rows, told apart from the history table's. */
const soldRows = (page: Page) =>
  page.locator(SOLD_ROWS).filter({ has: page.locator('button[aria-label="Select"]') });

/**
 * Waits for the sold-line table to populate. The page's heading renders before the
 * sales request resolves, so counting rows straight after `waitForPage` reads zero.
 */
async function loadedSoldRows(page: Page) {
  await expect(soldRows(page).first()).toBeVisible({ timeout: 20_000 });
  return soldRows(page).all();
}

test.describe('Cashier · Returns and refunds', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'cashier');
    await page.goto('/cashier/returns');
    await waitForPage(page);
  });

  test('renders both panels and the seeded sales history', async ({ page }) => {
    const errors = collectPageErrors(page);

    await expect(page.getByRole('heading', { name: 'Returns & Refunds', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create New Return' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Returns History' })).toBeVisible();
    await expect(page.locator(SEARCH)).toBeVisible();

    // The sold-lines table.
    await expect(page.getByRole('columnheader', { name: 'Transaction' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Line Total' })).toBeVisible();

    const rows = await loadedSoldRows(page);
    expect(rows.length, 'the seeder created no sales to return against').toBeGreaterThan(0);

    // Every sold line is selectable.
    await expect(page.locator('button[aria-label="Select"]')).toHaveCount(rows.length);

    expect(errors()).toEqual([]);
  });

  test('searching filters the sold lines', async ({ page }) => {
    const errors = collectPageErrors(page);

    const rows = await loadedSoldRows(page);
    const firstText = (await rows[0].textContent()) ?? '';
    const word = firstText.trim().split(/\s+/).find((w) => w.length > 4);
    expect(word).toBeTruthy();

    await page.locator(SEARCH).fill('zzzznosuchline');
    await expect(soldRows(page)).toHaveCount(0);

    await page.locator(SEARCH).fill(word!);
    await expect(soldRows(page).first()).toBeVisible();
    const matched = await soldRows(page).count();
    expect(matched).toBeGreaterThan(0);
    expect(matched).toBeLessThanOrEqual(rows.length);

    expect(errors()).toEqual([]);
  });

  test('selecting a line opens the return form, and cancelling closes it', async ({ page }) => {
    const errors = collectPageErrors(page);

    await soldRows(page).first().getByRole('button', { name: 'Select' }).click();

    await expect(page.getByRole('heading', { name: /^Return Details:/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record Return' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: /^Return Details:/ })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Record Return' })).toHaveCount(0);

    expect(errors()).toEqual([]);
  });

  test('refuses a quantity above what was sold', async ({ page }) => {
    const errors = collectPageErrors(page);

    const row = soldRows(page).first();
    const soldQty = Number(
      ((await row.getByRole('cell').nth(3).textContent()) ?? '0').replace(/[^\d]/g, ''),
    );
    expect(soldQty).toBeGreaterThan(0);

    await row.getByRole('button', { name: 'Select' }).click();
    const details = page.getByRole('heading', { name: /^Return Details:/ });
    await expect(details).toBeVisible();

    await page.getByRole('spinbutton').fill(String(soldQty + 1));
    await page.getByRole('button', { name: 'Record Return' }).click();

    await expect(
      page.getByText(`Quantity must be between 1 and ${soldQty}`),
    ).toBeVisible();

    // Still open, and nothing recorded.
    await expect(details).toBeVisible();
    await expect(page.getByRole('spinbutton')).toHaveValue(String(soldQty + 1));

    expect(errors()).toEqual([]);
  });

  test('records a return and appends it to the history', async ({ page }) => {
    const errors = collectPageErrors(page);

    const before = await page
      .getByText(/^\d+ returns$/)
      .textContent()
      .then((t) => Number(/(\d+)/.exec(t ?? '')?.[1] ?? 0));

    const row = soldRows(page).first();
    await row.getByRole('button', { name: 'Select' }).click();

    const details = page.getByRole('heading', { name: /^Return Details:/ });
    await expect(details).toBeVisible();

    await page.getByPlaceholder('Additional details...').fill('e2e return');
    await page.getByRole('button', { name: 'Record Return' }).click();

    // The form closes and the counter advances.
    await expect(details).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(`${before + 1} returns`)).toBeVisible();

    expect(errors()).toEqual([]);
  });
});
