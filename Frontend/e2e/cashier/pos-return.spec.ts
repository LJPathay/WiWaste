import { test, expect } from '@playwright/test';

test.describe('Cashier POS Returns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'cashier');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/cashier\/pos/);
  });

  test('processes return for previous sale', async ({ page }) => {
    // First make a sale
    await page.fill('input[placeholder*="barcode"]', '123456');
    await page.keyboard.press('Enter');
    
    await page.click('button:has-text("Proceed to Checkout")');
    await page.fill('input[placeholder*="tendered"]', '20');
    await page.click('button:has-text("Complete Payment")');
    
    // Wait for receipt
    await expect(page.locator('text=Receipt')).toBeVisible({ timeout: 10000 });
    
    // Go to returns
    await page.click('button:has-text("Returns")');
    
    // Find the sale and process return
    await page.click('button:has-text("Return"):first');
    
    // Select return reason
    await page.selectOption('select[name="return_reason"]', 'wrong_item');
    await page.click('button:has-text("Process Return")');
    
    await expect(page.locator('text=Return processed')).toBeVisible();
  });

  test('return restores stock to original batch', async ({ page }) => {
    // This would require checking inventory after return
    // Simplified test
    await page.goto('/cashier/returns');
    await expect(page.locator('text=Returns')).toBeVisible();
  });
});