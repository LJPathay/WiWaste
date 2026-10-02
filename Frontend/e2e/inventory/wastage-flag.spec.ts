import { test, expect } from '@playwright/test';

test.describe('Wastage Flag & Confirm Workflow', () => {
  test('cashier can flag wastage', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'cashier');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/cashier\/pos/);

    // Navigate to flag wastage (might be in POS or separate page)
    await page.goto('/cashier/pos');
    
    // Click flag wastage button
    await page.click('button:has-text("Flag Wastage")');
    
    // Fill flag form
    await page.selectOption('select[name="product"]', '1');
    await page.fill('input[name="quantity"]', '5');
    await page.fill('input[name="reason"]', 'Damaged');
    await page.click('button:has-text("Flag")');
    
    await expect(page.locator('text=Wastage flagged for review')).toBeVisible();
  });

  test('inventory can confirm flagged wastage', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'inventory');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inventory\/manage/);

    await page.goto('/inventory/wastage');
    
    // Find pending flag and confirm
    await page.click('button:has-text("Confirm"):first');
    
    await expect(page.locator('text=Wastage confirmed')).toBeVisible();
  });

  test('inventory can reject flagged wastage', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'inventory');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inventory\/manage/);

    await page.goto('/inventory/wastage');
    
    await page.click('button:has-text("Reject"):first');
    await page.fill('input[name="rejection_reason"]', 'Not actually damaged');
    await page.click('button:has-text("Reject")');
    
    await expect(page.locator('text=Wastage flag rejected')).toBeVisible();
  });

  test('inventory can record wastage directly', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'inventory');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inventory\/manage/);

    await page.goto('/inventory/wastage');
    await page.click('button:has-text("Record Wastage")');
    
    await page.selectOption('select[name="product_id"]', '1');
    await page.selectOption('select[name="wastage_type"]', 'Expired');
    await page.fill('input[name="quantity"]', '10');
    await page.fill('input[name="estimated_loss"]', '50.00');
    await page.click('button:has-text("Record")');
    
    await expect(page.locator('text=Wastage recorded')).toBeVisible();
  });
});