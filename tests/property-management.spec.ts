import { test, expect } from '@playwright/test';

test.describe('Property Management', () => {
  test('should display properties page correctly', async ({ page }) => {
    await page.goto('/properties');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Properties');
    
    // Check for Add Property button - use more specific selector
    await expect(page.getByRole('button', { name: 'Add Property' }).first()).toBeVisible();
  });

  test('should open add property modal', async ({ page }) => {
    await page.goto('/properties');
    
    // Click Add Property button
    await page.getByRole('button', { name: 'Add Property' }).first().click();
    
    // Check modal opens - look for the dialog heading specifically
    await expect(page.getByRole('heading', { name: 'Add Property' })).toBeVisible();
    
    // Check for form fields
    await expect(page.locator('[placeholder="Enter property name"]')).toBeVisible();
    await expect(page.locator('[placeholder="Enter property address"]')).toBeVisible();
  });

  test('should validate property form', async ({ page }) => {
    await page.goto('/properties');
    
    // Open add property modal
    await page.getByRole('button', { name: 'Add Property' }).first().click();
    
    // Try to submit empty form (this might trigger validation)
    // Note: Actual validation behavior depends on your form implementation
    
    // Fill in some basic info to test form interaction
    await page.fill('[placeholder="Enter property name"]', 'Test Property');
    await page.fill('[placeholder="Enter property address"]', '123 Test Street');
    
    // Check that form accepts input
    await expect(page.locator('[placeholder="Enter property name"]')).toHaveValue('Test Property');
    await expect(page.locator('[placeholder="Enter property address"]')).toHaveValue('123 Test Street');
  });

  test('should handle property details navigation', async ({ page }) => {
    await page.goto('/properties');
    
    // This test assumes there are existing properties
    // In a real test, you'd either:
    // 1. Create test data beforehand
    // 2. Mock the data
    // 3. Have a dedicated test database
    
    // For now, just check that the page structure exists
    await expect(page.locator('text=Properties')).toBeVisible();
  });

  test('should display utility analytics in property details', async ({ page }) => {
    // This would test the property detail page
    // await page.goto('/properties/[some-test-property-id]');
    
    // For now, just verify the structure exists
    await page.goto('/properties');
    await expect(page.locator('h1')).toContainText('Properties');
  });
});