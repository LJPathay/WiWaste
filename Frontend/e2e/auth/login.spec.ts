import { test, expect } from '@playwright/test';
import { CREDENTIALS, login } from '../helpers/auth';

const ERROR = 'div[role="alert"]';

test.describe('Login and role routing', () => {
  test('owner signs in and lands on the dashboard', async ({ page }) => {
    await login(page, 'owner');

    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });

  test('inventory signs in and lands on the inventory dashboard', async ({ page }) => {
    await login(page, 'inventory');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Inventory Dashboard' }),
    ).toBeVisible();
  });

  test('cashier signs in and lands on the POS terminal', async ({ page }) => {
    await login(page, 'cashier');

    // The POS kiosk has no page heading — the barcode/search field is its anchor.
    await expect(page.locator('input[placeholder*="barcode"]')).toBeVisible();
  });

  test('rejects a wrong password without leaving the login page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', CREDENTIALS.cashier.username);
    await page.fill('#password', 'definitely-not-the-password');
    await page.click('button[type="submit"]');

    await expect(page.locator(ERROR)).toHaveText(/invalid credentials/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('blocks submission when the password is missing', async ({ page }) => {
    let loginCalls = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('/api/v1/login') && r.method() === 'POST') loginCalls++;
    });

    await page.goto('/login');
    await page.fill('#email', CREDENTIALS.cashier.username);
    await page.click('button[type="submit"]');

    // `required` on the password field stops submission, so no auth call is made.
    await expect(page.locator('#password')).toHaveJSProperty('validity.valueMissing', true);
    await page.waitForTimeout(500);
    expect(loginCalls).toBe(0);
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected routes redirect anonymous visitors to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/inventory/manage');

    await expect(page).toHaveURL(/\/login/);
  });

  test('cashier is bounced off owner-only routes', async ({ page }) => {
    await login(page, 'cashier');

    await page.goto('/owner/users');

    // ProtectedRoute redirects to the role's own landing page.
    await expect(page).toHaveURL(/\/cashier\/pos$/);
  });

  test('inventory is bounced off owner-only routes', async ({ page }) => {
    await login(page, 'inventory');

    await page.goto('/owner/users');

    // ProtectedRoute sends inventory to its own default landing page.
    await expect(page).toHaveURL(/\/inventory\/manage$/);
  });

  test('signing out clears the session and gates protected routes', async ({ page }) => {
    // `fresh` bypasses the cached-session replay, which would otherwise re-seed
    // localStorage on the navigation after sign-out and undo the sign-out.
    await login(page, 'owner', { fresh: true });

    await page.locator('[aria-label="Sign out"]').first().click();

    // `DashboardLayout.handleLogout()` signs out and then navigates to `/`, which is
    // the public marketing home page — not `/login`. Reaching `/` is the expected
    // result; what matters is that the session no longer grants access.
    await expect(page).toHaveURL(/\/$/);

    // Session must be gone, not merely hidden.
    await page.goto('/owner/users');
    await expect(page).toHaveURL(/\/login/);
  });
});