import { test, expect } from '@playwright/test';

test.describe('Owner User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'owner');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/owner\/users/);
  });

  test('creates new user with separate name fields', async ({ page }) => {
    await page.click('button:has-text("Add User")');
    
    await page.fill('input[placeholder="First"]', 'Juan');
    await page.fill('input[placeholder="Middle"]', 'Dela');
    await page.fill('input[placeholder="Last"]', 'Cruz');
    await page.fill('input[placeholder="e.g. 09171234567"]', '09171234567');
    await page.selectOption('select:has-text("Assign Role")', 'Inventory');
    await page.click('button:has-text("Add User")');
    
    await expect(page.locator('text=Juan Dela Cruz')).toBeVisible();
  });

  test('edits existing user', async ({ page }) => {
    // Find and edit a user
    await page.click('button:has-text("Edit"):first');
    
    await page.fill('input[placeholder="First"]', 'Updated');
    await page.click('button:has-text("Save Changes")');
    
    await expect(page.locator('text=Updated')).toBeVisible();
  });

  test('archives user', async ({ page }) => {
    await page.click('button:has-text("Archive"):first');
    await page.click('button:has-text("Archive")');
    
    await expect(page.locator('text=Archived')).toBeVisible();
  });

  test('filters users by role', async ({ page }) => {
    await page.selectOption('select:has-text("Role")', 'Inventory');
    await expect(page.locator('text=Inventory')).toBeVisible();
  });

  test('searches users', async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', 'inventory');
    await expect(page.locator('text=Inventory')).toBeVisible();
  });
});