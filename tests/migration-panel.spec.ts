import { test, expect } from '@playwright/test';

test.describe('Migration Panel', () => {
  test('should display migration panel in settings', async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Settings');
    
    // Check that Data Migration section is present
    await expect(page.locator('text=Data Migration')).toBeVisible();
    await expect(page.locator('text=Update your data to use the latest unified payment system')).toBeVisible();
    
    // Check for migration panel elements
    await expect(page.locator('text=Unified Payment System Migration')).toBeVisible();
    await expect(page.locator('text=Preview Migration (Dry Run)')).toBeVisible();
    
    // Check that the explanation is present
    await expect(page.locator('text=This migration updates your utility bills and tenant charges')).toBeVisible();
  });

  test('should show migration benefits', async ({ page }) => {
    await page.goto('/settings');
    
    // Check for the "What this migration does" section
    await expect(page.locator('text=What this migration does:')).toBeVisible();
    await expect(page.locator('text=landlordPaidUtilityCompany')).toBeVisible();
    await expect(page.locator('text=fullyPaid')).toBeVisible();
    await expect(page.locator('text=tenantPaidAmount')).toBeVisible();
  });
});