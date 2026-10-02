import { test, expect } from '@playwright/test';

test.describe('Login Per Role', () => {
  test('owner can login and access dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'owner');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/owner\/users/);
    await expect(page.locator('text=Manage Users')).toBeVisible();
  });

  test('inventory can login and access inventory', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'inventory');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/inventory\/manage/);
    await expect(page.locator('text=Manage Inventory')).toBeVisible();
  });

  test('cashier can login and access POS', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'cashier');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/cashier\/pos/);
    await expect(page.locator('text=Scan Product')).toBeVisible();
  });

  test('cashier cannot access owner routes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'cashier');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Try to navigate to owner route
    await page.goto('/owner/users');
    await expect(page).toHaveURL(/\/cashier\/pos/);
  });

  test('logout works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'owner');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.click('button:has-text("Exit POS")');
    await expect(page).toHaveURL('/login');
  });
});