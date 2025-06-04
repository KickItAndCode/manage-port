import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between main pages', async ({ page }) => {
    // Start at dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Navigate to Properties
    await page.click('text=Properties');
    await expect(page).toHaveURL('/properties');
    await expect(page.locator('h1')).toContainText('Properties');

    // Navigate to Leases
    await page.click('text=Leases');
    await expect(page).toHaveURL('/leases');
    await expect(page.locator('h1')).toContainText('Leases');

    // Navigate to Utility Bills
    await page.click('text=Utility Bills');
    await expect(page).toHaveURL('/utility-bills');
    await expect(page.locator('h1')).toContainText('Utility Bills');

    // Navigate to Documents
    await page.click('text=Documents');
    await expect(page).toHaveURL('/documents');
    await expect(page.locator('h1')).toContainText('Documents');

    // Navigate back to Dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // On mobile, check if responsive design works
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check that content is visible and properly arranged
    await expect(page.locator('text=Total Properties')).toBeVisible();
    await expect(page.locator('text=Quick Actions')).toBeVisible();
  });

  test('should handle page loading states', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check that main content is loaded
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check for absence of loading states
    await expect(page.locator('text=Loading')).not.toBeVisible();
  });
});