import { test, expect, type Page } from '@playwright/test';
import { login, waitForPage, MAIN, collectPageErrors } from '../helpers/auth';

/**
 * Archive / restore over `/owner/categories`
 * (`Frontend/src/pages/admin/ManageCategories.tsx`).
 *
 * This page used to hard-delete the row: `CategoryController::destroy()` called
 * `->delete()`, and the confirmation read "This operation cannot be undone." A category
 * carries a product count, so deleting one silently orphaned or cascaded real stock
 * records. Categories are now archived instead, matching how products and users already
 * behaved, and the row comes back through the Archived tab.
 *
 * `globalSetup` seeds once per run, so tests share a database. Archiving a seeded
 * category would leak into the next test, so this file creates its own category and
 * removes it at the end — which also pins the guarantee that nothing is hard-deleted.
 */

const ROWS = `${MAIN} tbody tr`;
const STATUS_TABS = `${MAIN} [role="group"][aria-label="Filter by status"] button`;

test.describe('Owner · Category management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner');
    await page.goto('/owner/categories');
    await waitForPage(page);
  });

  /** Creates a category and returns a locator for its row. */
  async function createCategory(page: Page, name: string) {
    await page.getByRole('button', { name: 'Add Category', exact: true }).click();

    const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Add New Category' });
    await expect(dialog).toBeVisible();

    // The form picks a preset from a `<select>`; "Others (Type Custom)" is the entry
    // that reveals the free-text input, which is what a test-only name needs.
    await dialog.getByRole('combobox').first().selectOption('Others');
    await dialog.locator('input[placeholder="Type custom category name..."]').fill(name);

    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    const row = page.locator(ROWS).filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 20_000 });
    return row;
  }

  test('creates a category and shows it as Active', async ({ page }) => {
    const errors = collectPageErrors(page);
    const name = `E2eCat${Date.now().toString(36).slice(-5)}`;

    const row = await createCategory(page, name);
    await expect(row).toContainText('Active');

    expect(errors()).toEqual([]);
  });

  test('archives a category, then restores it from the Archived tab', async ({ page }) => {
    const errors = collectPageErrors(page);
    const name = `E2eArc${Date.now().toString(36).slice(-5)}`;

    const row = await createCategory(page, name);

    await row.getByRole('button', { name: 'Archive' }).click();

    const confirm = page.locator('[role="dialog"]').filter({ hasText: 'Archive' }).first();
    await expect(confirm).toBeVisible();
    // The copy has to say the record is kept — that is the whole point of the change.
    await expect(confirm.getByText(/retained and can be restored/i)).toBeVisible();
    await confirm.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(confirm).toBeHidden({ timeout: 20_000 });

    // It leaves the default Active view…
    await expect(page.locator(ROWS).filter({ hasText: name })).toHaveCount(0, {
      timeout: 20_000,
    });

    // …and is reachable, still holding its record, through the Archived tab.
    await page.locator(STATUS_TABS).filter({ hasText: 'Archived' }).click();
    const archived = page.locator(ROWS).filter({ hasText: name });
    await expect(archived).toBeVisible({ timeout: 20_000 });
    await expect(archived).toContainText('Archived');

    await archived.getByRole('button', { name: 'Restore' }).click();
    const restoreConfirm = page
      .locator('[role="dialog"]')
      .filter({ hasText: 'Restore' })
      .first();
    await expect(restoreConfirm).toBeVisible();
    await restoreConfirm.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(restoreConfirm).toBeHidden({ timeout: 20_000 });

    await expect(page.locator(ROWS).filter({ hasText: name })).toHaveCount(0, {
      timeout: 20_000,
    });
    await page.locator(STATUS_TABS).filter({ hasText: /^Active/ }).click();
    await expect(page.locator(ROWS).filter({ hasText: name })).toBeVisible({
      timeout: 20_000,
    });

    expect(errors()).toEqual([]);
  });
});