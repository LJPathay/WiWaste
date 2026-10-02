import { test, expect } from '@playwright/test';

test.describe('Inventory Receive Stock', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'inventory');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inventory\/manage/);
  });

  test('receives stock with batch and expiry', async ({ page }) => {
    await page.goto('/inventory/manage');
    
    // Click receive button for a product
    await page.click('button:has-text("Receive")');
    
    // Fill receive form
    await page.fill('input[placeholder*="batch"]', 'BATCH-001');
    await page.fill('input[placeholder*="expiry"]', '2026-12-31');
    await page.fill('input[placeholder*="quantity"]', '50');
    await page.click('button:has-text("Save")');
    
    // Verify success
    await expect(page.locator('text=Stock received')).toBeVisible();
  });

  test('blocks past expiry date', async ({ page }) => {
    await page.goto('/inventory/manage');
    
    await page.click('button:has-text("Receive")');
    
    // Try past date
    await page.fill('input[placeholder*="expiry"]', '2020-01-01');
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=Expiry date cannot be in the past')).toBeVisible();
  });

  test('near expiry list shows items expiring soon', async ({ page }) => {
    await page.goto('/inventory/fefo');
    
    // Check near-expiry section
    await expect(page.locator('text=Near Expiry')).toBeVisible();
  });
});