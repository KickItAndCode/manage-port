import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should display dashboard with key sections', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for dashboard to load completely
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check main dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check for stat cards with more specific selectors and longer timeout
    await expect(page.getByText('Total Properties').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('p:has-text("Monthly Revenue")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Occupancy Rate').first()).toBeVisible({ timeout: 10000 });
    
    // Check for quick actions section
    await expect(page.getByText('Quick Actions').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Add Property' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'New Lease' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Add Bill' })).toBeVisible({ timeout: 10000 });
  });

  test('should open property modal from quick actions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for dashboard to load completely
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Wait for and click Add Property button (it's in the Quick Actions section)
    const addPropertyButton = page.getByRole('button', { name: 'Add Property' });
    await expect(addPropertyButton).toBeVisible({ timeout: 10000 });
    await addPropertyButton.click();
    
    // Check modal appears - use more specific selector for the dialog title
    await expect(page.getByRole('heading', { name: 'Add Property' })).toBeVisible();
    await expect(page.locator('[placeholder="Enter property name"]')).toBeVisible();
  });

  test('should open utility bill modal from quick actions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Debug screenshot after dashboard load
    await page.screenshot({ path: 'playwright/screenshots/debug-dashboard-loaded.png', fullPage: true });
    console.log('📸 Debug screenshot saved: debug-dashboard-loaded.png');
    
    // Click Add Bill button
    await page.getByRole('button', { name: 'Add Bill' }).click();
    
    // Debug screenshot after clicking Add Bill
    await page.screenshot({ path: 'playwright/screenshots/debug-after-add-bill-click.png', fullPage: true });
    console.log('📸 Debug screenshot saved: debug-after-add-bill-click.png');
    
    // Debug: Check what modal content is actually present
    const modalHeadings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    console.log('📋 Modal headings found:');
    for (const heading of modalHeadings) {
      const text = await heading.textContent();
      console.log(`  - "${text}"`);
    }
    
    // Look for property-related text using a proper selector
    const modalText = await page.locator('text=/property/i').all();
    console.log('🏠 Property-related text found:');
    for (const text of modalText) {
      const content = await text.textContent();
      if (content && content.toLowerCase().includes('property')) {
        console.log(`  - "${content}"`);
      }
    }
    
    // Check modal appears
    await expect(page.getByRole('heading', { name: 'Add Utility Bill' })).toBeVisible();
    await expect(page.getByText('Select a property to add a utility bill for:')).toBeVisible();
  });

  test('should display analytics section', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for analytics section
    await expect(page.getByText('Utility Analytics').first()).toBeVisible();
    await expect(page.getByText('Cost trends and insights').first()).toBeVisible();
    
    // Check for summary cards in analytics
    await expect(page.getByText('Total Cost').first()).toBeVisible();
    await expect(page.getByText('Avg Monthly').first()).toBeVisible();
  });

  test('should navigate to properties page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Look for various possible "View all" links or navigation elements
    const viewAllLink = page.locator('a:has-text("View all"), a:has-text("See all"), a:has-text("All Properties"), [href="/properties"]').first();
    
    // If no direct link found, try navigation menu
    if (!(await viewAllLink.isVisible())) {
      console.log('No "View all" link found, using navigation menu');
      await page.getByRole('link', { name: 'Properties' }).click();
    } else {
      await viewAllLink.click();
    }
    
    // Should navigate to properties page
    await expect(page).toHaveURL('/properties');
    await expect(page.locator('h1')).toContainText('Properties');
  });
});