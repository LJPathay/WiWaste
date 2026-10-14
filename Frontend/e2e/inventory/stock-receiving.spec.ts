import { test, expect, type Page, type Locator } from '@playwright/test';
import { login, waitForPage, MAIN, collectPageErrors } from '../helpers/auth';

/**
 * `/inventory/stock-receiving` — `Frontend/src/pages/inventory/StockReceiving.tsx`.
 *
 * The screen is a delivery inbox over the `stock_receiving` feed: four status tabs,
 * and per-row Receive / Reject / Discard controls that open a `ConfirmDialog` from
 * `components/ui/Toast`. Nothing is written until the dialog is confirmed.
 *
 * `globalSetup` seeds one pending and one received delivery, and the tests share that
 * database, so exactly one test consumes the pending delivery and everything else is
 * written to tolerate having happened.
 */

const ROWS = `${MAIN} tbody tr`;
const EMPTY = 'No receiving records found.';
const TABS = ['All', 'Pending', 'Received', 'Rejected'];

/** Tab buttons, as opposed to the stat cards that repeat the same words. */
const tab = (page: Page, name: string): Locator =>
  page
    .getByRole('group', { name: 'Filter deliveries by status' })
    .getByRole('button', { name, exact: true });

/**
 * Real data rows. The table renders its empty state *as a row*, so an unfiltered
 * `tbody tr` locator is never a reliable "is there data here" signal.
 */
const dataRows = (page: Page): Locator => page.locator(ROWS).filter({ hasText: /RCV-\d+/ });

/**
 * Clicks a status tab and waits for the request that tab implies, returning its
 * payload. Clicking alone is not enough: the swap is a round trip, and every DOM read
 * has to happen after it lands.
 */
async function selectStatus(page: Page, name: string): Promise<Record<string, unknown>[]> {
  const query =
    name === 'All' ? '/stock-receiving?' : `/stock-receiving?status=${name.toLowerCase()}`;
  const response = page.waitForResponse(
    (r) => r.url().includes(query) && r.request().resourceType() !== 'document',
  );

  await tab(page, name).click();
  const body = (await (await response).json()) as { data?: Record<string, unknown>[] };
  return body.data ?? [];
}

/** Waits for the table to finish rendering after a status request has landed. */
async function settle(page: Page, name: string): Promise<void> {
  if (name === 'Rejected') {
    await expect(page.getByText(EMPTY)).toBeVisible();
    return;
  }
  await expect(dataRows(page).first()).toBeVisible();
}

async function referenceOf(row: Locator): Promise<string> {
  return ((await row.locator('td').first().textContent()) ?? '').trim();
}

test.describe('Inventory · Stock receiving', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'inventory');
    await page.goto('/inventory/stock-receiving');
    await waitForPage(page);
  });

  test('renders the delivery inbox and its status tabs', async ({ page }) => {
    const errors = collectPageErrors(page);

    await expect(page.getByRole('heading', { name: 'Stock Receiving' })).toBeVisible();

    // One stat card per bucket plus a total.
    for (const label of ['Total', 'Pending', 'Received', 'Rejected']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }

    for (const name of TABS) {
      await expect(tab(page, name)).toBeVisible();
    }
    await expect(tab(page, 'All')).toHaveAttribute('aria-pressed', 'true');

    await expect(page.locator(`${MAIN} thead th`)).toHaveText([
      'Reference',
      'Supplier',
      'Received',
      'Outstanding',
      'Status',
      'Actions',
    ]);

    // The seeder creates one pending and one received delivery.
    await expect(dataRows(page)).toHaveCount(2);
    await expect(page.getByText('PharmaDist Corp')).toBeVisible();

    // The pending delivery's controls are live; the settled one's are not.
    const pending = dataRows(page).filter({ hasText: 'PharmaDist Corp' });
    const settled = dataRows(page).filter({ hasText: 'Coca-Cola Beverages PH' });
    await expect(pending.getByText('Pending')).toBeVisible();
    await expect(pending.getByRole('button', { name: /^Receive RCV-/ })).toBeEnabled();
    await expect(settled.getByText('Received')).toBeVisible();
    await expect(settled.getByRole('button', { name: /^Receive RCV-/ })).toBeDisabled();

    expect(errors()).toEqual([]);
  });

  test('each status tab re-queries and returns only its own rows', async ({ page }) => {
    const errors = collectPageErrors(page);

    // "All" is the default view, loaded on mount. It is deliberately not clicked:
    // `useApi` caches that payload for 30s, so re-selecting it issues no request.
    await expect(dataRows(page)).toHaveCount(2);
    await expect(tab(page, 'All')).toHaveAttribute('aria-pressed', 'true');

    for (const name of ['Pending', 'Received', 'Rejected']) {
      const rows = await selectStatus(page, name);
      await settle(page, name);

      // The payload is already scoped, which proves the server-side filter ran.
      for (const row of rows) {
        expect(String(row.status)).toBe(name.toLowerCase());
      }

      // …and the rendered table agrees with it.
      const shown = await dataRows(page).count();
      expect(shown).toBe(rows.length);

      if (shown > 0) {
        for (const text of await dataRows(page).allTextContents()) {
          expect(text).toContain(name);
        }
      }

      await expect(tab(page, name)).toHaveAttribute('aria-pressed', 'true');
    }

    expect(errors()).toEqual([]);
  });

  /**
   * Receiving consumes the only delivery with live controls, so the cancel path and
   * the confirm path share one test. Splitting them would make the file depend on
   * declaration order — and a test that runs after the receive has nothing left to act
   * on, because both deliveries are then settled.
   */
  test('receives a pending delivery, and cancelling the dialog changes nothing', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);

    await selectStatus(page, 'Pending');
    await settle(page, 'Pending');

    const row = dataRows(page).first();
    const ref = await referenceOf(row);
    expect(ref).toMatch(/^RCV-\d+$/);

    const confirm = page.locator('[role="dialog"]').filter({ hasText: `receive ${ref}` });

    // ── cancel leaves the delivery untouched ──
    const before = await page.locator(ROWS).count();

    await row.getByRole('button', { name: `Receive ${ref}` }).click();
    await expect(confirm).toBeVisible();

    await confirm.getByRole('button', { name: /Cancel/ }).click();
    await expect(confirm).toBeHidden();

    // No write request goes out, so the row is still pending and still actionable.
    await expect(page.locator(ROWS)).toHaveCount(before);
    await expect(row.getByText('Pending')).toBeVisible();
    await expect(row.getByRole('button', { name: `Receive ${ref}` })).toBeEnabled();

    // ── confirming writes ──
    await row.getByRole('button', { name: `Receive ${ref}` }).click();
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Receive' }).click();
    await expect(confirm).toBeHidden({ timeout: 20_000 });

    // The delivery leaves the pending bucket…
    await selectStatus(page, 'Pending');
    await expect(page.locator(ROWS).filter({ hasText: ref })).toHaveCount(0, {
      timeout: 20_000,
    });

    // …and turns up as received, with its controls now disabled.
    await selectStatus(page, 'Received');
    const settled = page.locator(ROWS).filter({ hasText: ref });
    await expect(settled).toBeVisible({ timeout: 20_000 });
    await expect(settled.getByText('Received')).toBeVisible();
    await expect(settled.getByRole('button', { name: `Receive ${ref}` })).toBeDisabled();

    expect(errors()).toEqual([]);
  });
});
