import { test, expect, type Page } from '@playwright/test';
import { login, waitForPage, MAIN, collectPageErrors } from '../helpers/auth';

/**
 * `/inventory/wastage` — `Frontend/src/pages/inventory/RecordWastage.tsx`.
 *
 * The form is a product typeahead (a text input plus a popover of matches, not a
 * `<select>`), a quantity box, a read-only cost box the picker auto-fills, and a
 * reason `<select>`. Submitting opens a `ConfirmDialog` from `components/ui/Toast`,
 * which is the only thing that writes the record.
 */

const ITEM = 'input[placeholder="Type product name or SKU (e.g. Biogesic)..."]';
const QTY = 'input[placeholder="e.g. 5"]';
const COST = 'input[placeholder="Auto-filled"]';
const LOG_SEARCH = 'input[placeholder="Search logs..."]';
const REASON = `${MAIN} select`;
const ROWS = `${MAIN} tbody tr`;

/**
 * Picks a product out of the typeahead by reading the first match's name back out of
 * the popover, so the spec does not depend on which products the seeder created.
 */
async function pickProduct(page: Page, probe: string): Promise<string> {
  await page.locator(ITEM).fill(probe);

  const options = page.locator('button').filter({ has: page.locator('p.font-mono') });
  await expect(options.first()).toBeVisible();

  const name = (await options.first().locator('p').first().textContent())?.trim() ?? '';
  expect(name, 'the product typeahead offered no matches').not.toBe('');

  await options.first().click();
  return name;
}

/**
 * The log table renders its empty state as a row, so "one row" never means "loaded".
 * Wait for the record-count summary the table only renders once data has arrived.
 */
async function settledLog(page: Page): Promise<number> {
  await expect(page.getByText(/^\d+ records? found$/)).toBeVisible();
  return page.locator(ROWS).count();
}

test.describe('Inventory · Wastage log', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'inventory');
    await page.goto('/inventory/wastage');
    await waitForPage(page);
  });

  test('renders the loss summary and the seeded log', async ({ page }) => {
    const errors = collectPageErrors(page);

    await expect(page.getByRole('heading', { name: 'Record Wastage' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Log Wastage Record' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Wastage Logs' })).toBeVisible();

    // Loss roll-ups. The weekly and monthly figures are real sums over the seeded
    // rows — they read "NaN" whenever the decimal column arrives as a string.
    for (const label of ["Today's Loss", 'Weekly Loss', 'Monthly Loss']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    const monthly = page.getByText('Monthly Loss', { exact: true });
    await expect(monthly.locator('xpath=following-sibling::*[1]')).not.toContainText('NaN');

    // The seeded wastage history is paginated into the table below.
    await expect(page.locator(ROWS).first()).toBeVisible();
    await settledLog(page);
    await expect(page.locator(`${MAIN} thead th`)).toHaveText([
      'Item',
      'Qty',
      'Loss Cost',
      'Reason',
      'Recorded At',
    ]);

    expect(errors()).toEqual([]);
  });

  test('commits a wastage record and adds it to the log', async ({ page }) => {
    const errors = collectPageErrors(page);

    const before = await settledLog(page);

    const product = await pickProduct(page, 'a');
    // Choosing a match fills the read-only cost box and the quantity defaults empty.
    await expect(page.locator(COST)).not.toHaveValue('');

    await page.locator(QTY).fill('3');
    await page.locator(REASON).selectOption({ label: 'Expired on Shelf' });

    await page.getByRole('button', { name: 'Commit Wastage Record' }).click();

    // Nothing is written until the confirmation is accepted.
    const confirm = page.locator('[role="dialog"]').filter({ hasText: 'Are you sure' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText('3 units')).toBeVisible();
    await expect(confirm.getByText(new RegExp(product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeVisible();

    await confirm.getByRole('button', { name: 'Commit Loss' }).click();
    await expect(confirm).toBeHidden({ timeout: 20_000 });

    // The form resets, and the log now carries the new row.
    await expect(page.locator(ITEM)).toHaveValue('');
    await expect(page.locator(QTY)).toHaveValue('');
    await expect(page.locator(ROWS)).toHaveCount(before + 1);

    const row = page.locator(ROWS).filter({ hasText: product }).first();
    await expect(row).toBeVisible();

    expect(errors()).toEqual([]);
  });

  test('cancelling the confirmation writes nothing', async ({ page }) => {
    const errors = collectPageErrors(page);

    const before = await settledLog(page);
    const product = await pickProduct(page, 'a');
    await page.locator(QTY).fill('2');

    await page.getByRole('button', { name: 'Commit Wastage Record' }).click();
    const confirm = page.locator('[role="dialog"]').filter({ hasText: 'Are you sure' });
    await expect(confirm).toBeVisible();

    await confirm.getByRole('button', { name: /Cancel/ }).click();
    await expect(confirm).toBeHidden();

    await expect(page.locator(ROWS)).toHaveCount(before);
    // The typed values survive so the operator can correct them instead of retyping.
    await expect(page.locator(ITEM)).toHaveValue(product);
    await expect(page.locator(QTY)).toHaveValue('2');

    expect(errors()).toEqual([]);
  });

  test('enforces the form constraints before anything is written', async ({ page }) => {
    const errors = collectPageErrors(page);

    const before = await settledLog(page);
    const submit = page.getByRole('button', { name: 'Commit Wastage Record' });

    // An empty item and a missing quantity are both `required`, so the browser blocks
    // submit, focuses the offending field, and the handler is never reached.
    await submit.click();
    await expect(page.locator(ITEM)).toBeFocused();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    await page.locator(ITEM).fill('unregistered item');
    await submit.click();
    await expect(page.locator(QTY)).toBeFocused();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    // `min="1"` likewise rejects a zero quantity before submit.
    await page.locator(QTY).fill('0');
    await submit.click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    await expect(page.locator(ROWS)).toHaveCount(before);
    await expect(page.locator(ROWS).filter({ hasText: 'unregistered item' })).toHaveCount(0);

    expect(errors()).toEqual([]);
  });

  test('searches the log', async ({ page }) => {
    const errors = collectPageErrors(page);

    await settledLog(page);
    const first = page.locator(ROWS).first();
    await expect(first).toBeVisible();
    const firstText = (await first.textContent()) ?? '';

    await page.locator(LOG_SEARCH).fill('zzzznosuchitem');
    await expect(page.getByText('No wastage records found')).toBeVisible();

    // A prefix of the first logged item brings at least that row back.
    const word = firstText.trim().split(/\s+/)[0]?.slice(0, 4) ?? '';
    await page.locator(LOG_SEARCH).fill(word);
    await expect(page.locator(ROWS).first()).toBeVisible();

    expect(errors()).toEqual([]);
  });
});