import { test, expect } from '@playwright/test';

test.describe('AI Listing Enhancement - Basic Structure', () => {
  
  test('should display the AI listing enhancement page structure', async ({ page }) => {
    await page.goto('/listing-enhancement');
    
    // Check if the main heading is visible (even without auth)
    await expect(page.getByText('AI Listing Enhancement')).toBeVisible();
    
    // Check if the description is visible
    await expect(page.getByText('Transform your basic property descriptions')).toBeVisible();
    
    // Check if the form is present
    await expect(page.locator('textarea[placeholder*="Describe your property"]')).toBeVisible();
    
    // Check if style selection is visible
    await expect(page.getByText('Professional')).toBeVisible();
    await expect(page.getByText('Friendly')).toBeVisible();
    await expect(page.getByText('Luxury')).toBeVisible();
  });

  test('should have responsive design elements', async ({ page }) => {
    await page.goto('/listing-enhancement');
    
    // Check mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Main elements should still be visible
    await expect(page.getByText('AI Listing Enhancement')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Describe your property"]')).toBeVisible();
    
    // Check desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByText('AI Listing Enhancement')).toBeVisible();
  });

  test('should enable interaction with form elements', async ({ page }) => {
    await page.goto('/listing-enhancement');
    
    // Should be able to type in the textarea
    const textarea = page.locator('textarea[placeholder*="Describe your property"]');
    await textarea.fill('Test property description');
    
    await expect(textarea).toHaveValue('Test property description');
    
    // Should be able to click style buttons
    const luxuryButton = page.getByText('Luxury').locator('..').locator('..');
    await luxuryButton.click();
    
    // The button should have the selected state (border-primary class)
    await expect(luxuryButton).toHaveClass(/border-primary/);
  });
});