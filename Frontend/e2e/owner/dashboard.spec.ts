import { test, expect } from '@playwright/test';

test.describe('Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'owner');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/owner\/users/);
  });

  test('displays sales vs wastage summary', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    // Check KPI cards
    await expect(page.locator('text=Units Sold')).toBeVisible();
    await expect(page.locator('text=Units Wasted')).toBeVisible();
    await expect(page.locator('text=Wastage Rate')).toBeVisible();
    await expect(page.locator('text=Near-Expiry Batches')).toBeVisible();
  });

  test('shows category breakdown chart', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    await expect(page.locator('text=Units Sold vs Wasted by Category')).toBeVisible();
    // Check for chart canvas
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('shows waste by reason pie chart', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    await expect(page.locator('text=Waste by Reason')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('shows daily trend line chart', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    await expect(page.locator('text=Daily Trend: Units Sold vs Wasted')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('shows top wasted products table', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    await expect(page.locator('text=Top 10 Wasted Products')).toBeVisible();
    await expect(page.locator('text=Product')).toBeVisible();
    await expect(page.locator('text=Units Wasted')).toBeVisible();
  });

  test('shows slow movers table', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    await expect(page.locator('text=Slow Movers')).toBeVisible();
    await expect(page.locator('text=Product')).toBeVisible();
    await expect(page.locator('text=Units Sold')).toBeVisible();
  });

  test('date range picker works', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    // Click date picker
    await page.click('button:has-text("Select date range")');
    
    // Select date range
    await page.click('text=Last 30 days');
    
    // Charts should update
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('export CSV works', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    // Click export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export CSV")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/sales-wastage-report.*\.csv/);
  });

  test('shows near-expiry count', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    await expect(page.locator('text=Near-Expiry Batches')).toBeVisible();
  });

  test('shows waste by reason breakdown', async ({ page }) => {
    await page.goto('/dashboard/sales-wastage');
    
    // Check for reason categories
    const reasons = ['Expired', 'Damaged', 'Recalled', 'Spoiled', 'Other'];
    for (const reason of reasons) {
      await expect(page.locator(`text=${reason}`)).toBeVisible();
    }
  });
});