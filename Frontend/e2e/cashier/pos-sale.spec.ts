import { test, expect } from '@playwright/test';

test.describe('Cashier POS Sale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'cashier');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/cashier\/pos/);
  });

  test('completes cash sale with barcode scanner', async ({ page }) => {
    // Scan product
    await page.fill('input[placeholder*="barcode"]', '123456');
    await page.keyboard.press('Enter');
    
    // Verify item added
    await expect(page.locator('text=Paracetamol 500mg')).toBeVisible();
    await expect(page.locator('text=₱10.50')).toBeVisible();
    
    // Checkout
    await page.click('button:has-text("Proceed to Checkout")');
    await expect(page.locator('text=CASH')).toBeVisible();
    
    // Tender cash
    await page.fill('input[placeholder*="tendered"]', '20');
    await page.click('button:has-text("Complete Payment")');
    
    // Verify receipt
    await expect(page.locator('text=Receipt')).toBeVisible({ timeout: 10000 });
  });

  test('completes sale with multiple quantities', async ({ page }) => {
    // Scan product
    await page.fill('input[placeholder*="barcode"]', '123456');
    await page.keyboard.press('Enter');
    
    // Scan again to increase quantity
    await page.fill('input[placeholder*="barcode"]', '123456');
    await page.keyboard.press('Enter');
    
    // Verify quantity is 2
    await expect(page.locator('input[value="2"]')).toBeVisible();
    
    // Checkout
    await page.click('button:has-text("Proceed to Checkout")');
    await page.fill('input[placeholder*="tendered"]', '30');
    await page.click('button:has-text("Complete Payment")');
    
    await expect(page.locator('text=Receipt')).toBeVisible({ timeout: 10000 });
  });

  test('applies senior discount', async ({ page }) => {
    await page.fill('input[placeholder*="barcode"]', '123456');
    await page.keyboard.press('Enter');
    
    // Select item and apply discount
    await page.click('[data-testid="cart-item-0"]');
    await page.click('button:has-text("Discount")');
    await page.click('button:has-text("Senior/PWD")');
    await page.fill('input[name="seniorName"]', 'Juan Dela Cruz');
    await page.fill('input[name="seniorId"]', 'SC-12345');
    await page.click('button:has-text("Confirm")');
    
    // Verify 20% discount applied
    await expect(page.locator('text=-20%')).toBeVisible();
  });

  test('handles invalid barcode', async ({ page }) => {
    await page.fill('input[placeholder*="barcode"]', '9999999999999');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('text=Product not found')).toBeVisible();
  });

  test('void item works', async ({ page }) => {
    await page.fill('input[placeholder*="barcode"]', '123456');
    await page.keyboard.press('Enter');
    
    await page.click('[data-testid="cart-item-0"]');
    await page.click('button:has-text("Void Item")');
    
    await expect(page.locator('text=Paracetamol 500mg')).not.toBeVisible();
  });
});