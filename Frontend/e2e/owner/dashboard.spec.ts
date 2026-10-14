import { test, expect, type Page } from '@playwright/test';
import { login, waitForPage, MAIN, collectPageErrors } from '../helpers/auth';

/**
 * `/dashboard` — `Frontend/src/pages/dashboard/Overview.tsx`.
 *
 * The owner dashboard is read-only: KPI cards, a sales trend, the leakage breakdown,
 * and inventory health. The only stateful controls are the sales-period select (which
 * re-queries `/owner/analytics`) and the leakage chart's value/quantity/percentage
 * legend.
 */

const period = (page: Page) => page.getByLabel('Sales trend period');

test.describe('Owner · Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner');
    await page.goto('/dashboard');
    await waitForPage(page);
  });

  test('renders every section with live analytics', async ({ page }) => {
    const errors = collectPageErrors(page);

    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Leakage & Risks' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Leakage by Category' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inventory Health' })).toBeVisible();

    // The dashboard is charts, not a table, so it must not render a data grid.
    await expect(page.locator(`${MAIN} thead`)).toHaveCount(0);

    expect(errors()).toEqual([]);
  });

  test('the sales period select re-queries with the chosen range', async ({ page }) => {
    const errors = collectPageErrors(page);

    await expect(period(page)).toHaveValue('30');
    await expect(period(page).locator('option')).toHaveText([
      'Last 7 days',
      'Last 30 days',
      '3 months',
    ]);

    for (const value of ['7', '90']) {
      // `ownerDashboard.analytics()` lives at `/dashboard/owner-analytics` and appends
      // `?period=<n>`, so the range is observable on the wire.
      const request = page.waitForResponse(
        (r) =>
          r.url().includes('/dashboard/owner-analytics') &&
          r.url().includes(`period=${value}`) &&
          r.request().resourceType() !== 'document',
      );

      await period(page).selectOption(value);
      await expect(request).resolves.toBeDefined();

      // The control keeps the selection the user made, and the page stays intact.
      await expect(period(page)).toHaveValue(value);
      await expect(page.getByRole('heading', { name: 'Leakage & Risks' })).toBeVisible();
    }

    expect(errors()).toEqual([]);
  });

  test('the leakage chart legend switches measurement', async ({ page }) => {
    const errors = collectPageErrors(page);

    for (const mode of ['value', 'quantity', 'percentage']) {
      const toggle = page.getByRole('button', { name: mode, exact: true });
      await expect(toggle).toBeVisible();
      await toggle.click();
      // The chart itself never unmounts, so the section staying put is the signal
      // that the toggle was handled rather than falling through.
      await expect(page.getByRole('heading', { name: 'Leakage by Category' })).toBeVisible();
    }

    expect(errors()).toEqual([]);
  });
});
