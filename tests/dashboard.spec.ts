import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should display dashboard with key sections', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check main dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check for stat cards
    await expect(page.locator('text=Total Properties')).toBeVisible();
    await expect(page.locator('text=Monthly Revenue')).toBeVisible();
    await expect(page.locator('text=Occupancy Rate')).toBeVisible();
    
    // Check for quick actions
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('text=Add Property')).toBeVisible();
    await expect(page.locator('text=New Lease')).toBeVisible();
    await expect(page.locator('text=Add Bill')).toBeVisible();
  });

  test('should open property modal from quick actions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click Add Property button
    await page.click('text=Add Property');
    
    // Check modal appears
    await expect(page.locator('text=Add Property')).toBeVisible();
    await expect(page.locator('[placeholder*="Property name"]')).toBeVisible();
  });

  test('should open utility bill modal from quick actions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click Add Bill button
    await page.click('text=Add Bill');
    
    // Check modal appears
    await expect(page.locator('text=Add Utility Bill')).toBeVisible();
    await expect(page.locator('text=Select a property')).toBeVisible();
  });

  test('should display analytics section', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for analytics section
    await expect(page.locator('text=Utility Analytics')).toBeVisible();
    await expect(page.locator('text=Cost trends and insights')).toBeVisible();
    
    // Check for summary cards in analytics
    await expect(page.locator('text=Total Cost')).toBeVisible();
    await expect(page.locator('text=Avg Monthly')).toBeVisible();
  });

  test('should navigate to properties page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find and click "View all" link in Recent Properties section
    await page.click('text=View all');
    
    // Should navigate to properties page
    await expect(page).toHaveURL('/properties');
    await expect(page.locator('h1')).toContainText('Properties');
  });
});