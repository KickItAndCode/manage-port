import { test, expect } from '@playwright/test';

// Basic smoke test to verify app is running
test.describe('Smoke Tests', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads
    await expect(page).toHaveTitle(/Manage Port/i);
    
    // Look for sign-in link
    const signInLink = page.locator('a[href="/sign-in"]').or(page.locator('text=Sign In'));
    await expect(signInLink).toBeVisible();
  });

  test('should navigate to sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Wait for Clerk to load
    await page.waitForLoadState('networkidle');
    
    // Check for Clerk sign-in form elements
    const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="identifier"]'));
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });
});