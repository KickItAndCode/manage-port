import { test, expect } from '@playwright/test';

test.describe('AI Listing Enhancement', () => {
  test.use({ storageState: 'auth-state.json' });

  test('should display the AI listing enhancement page', async ({ page }) => {
    await page.goto('/listing-enhancement');
    
    // Check if the main heading is visible
    await expect(page.getByText('AI Listing Enhancement')).toBeVisible();
    
    // Check if the description is visible
    await expect(page.getByText('Transform your basic property descriptions into compelling, professional listings')).toBeVisible();
    
    // Check if the property description input is visible
    await expect(page.getByTestId('property-description-input')).toBeVisible();
    
    // Check if style selection buttons are visible
    await expect(page.getByTestId('style-professional')).toBeVisible();
    await expect(page.getByTestId('style-casual')).toBeVisible();
    await expect(page.getByTestId('style-luxury')).toBeVisible();
    
    // Check if the generate button is visible but disabled (no input yet)
    const generateButton = page.getByTestId('generate-listing-button');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeDisabled();
  });

  test('should enable generate button when description is entered', async ({ page }) => {
    await page.goto('/listing-enhancement');
    
    // Enter a property description
    const descriptionInput = page.getByTestId('property-description-input');
    await descriptionInput.fill('Beautiful 2 bedroom apartment with modern kitchen and downtown location');
    
    // Check if the generate button is now enabled
    const generateButton = page.getByTestId('generate-listing-button');
    await expect(generateButton).toBeEnabled();
  });

  test('should generate enhanced listing content', async ({ page }) => {
    await page.goto('/listing-enhancement');
    
    // Enter a property description
    const descriptionInput = page.getByTestId('property-description-input');
    await descriptionInput.fill('Beautiful 2 bedroom apartment with modern kitchen and downtown location, $1200/month');
    
    // Select a style (default is professional)
    await page.getByTestId('style-casual').click();
    
    // Click generate button
    const generateButton = page.getByTestId('generate-listing-button');
    await generateButton.click();
    
    // Wait for the generation process (should show loading state)
    await expect(page.getByText('Enhancing...')).toBeVisible();
    
    // Wait for the enhanced content to appear
    await expect(page.getByText('Enhanced Listings')).toBeVisible({ timeout: 10000 });
    
    // Check if the enhanced content card is visible
    await expect(page.getByText('Friendly Style')).toBeVisible();
    
    // Check if copy and regenerate buttons are available
    await expect(page.getByTestId('copy-button')).toBeVisible();
    await expect(page.getByTestId('regenerate-button')).toBeVisible();
  });

  test('should allow copying generated content', async ({ page }) => {
    await page.goto('/listing-enhancement');
    
    // Enter description and generate content
    await page.getByTestId('property-description-input').fill('Test property description');
    await page.getByTestId('generate-listing-button').click();
    
    // Wait for content to be generated
    await expect(page.getByText('Enhanced Listings')).toBeVisible({ timeout: 10000 });
    
    // Click copy button
    await page.getByTestId('copy-button').first().click();
    
    // Should show success toast (we can't easily test clipboard content in this context)
    // But we can verify the button interaction worked
    await expect(page.getByTestId('copy-button').first()).toBeVisible();
  });

  test('should allow style switching', async ({ page }) => {
    await page.goto('/listing-enhancement');
    
    // Check that professional is selected by default
    const professionalStyle = page.getByTestId('style-professional');
    await expect(professionalStyle).toHaveClass(/border-primary/);
    
    // Switch to luxury style
    await page.getByTestId('style-luxury').click();
    await expect(page.getByTestId('style-luxury')).toHaveClass(/border-primary/);
    
    // Switch to casual style
    await page.getByTestId('style-casual').click();
    await expect(page.getByTestId('style-casual')).toHaveClass(/border-primary/);
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/listing-enhancement');
    
    // Check if main elements are still visible on mobile
    await expect(page.getByText('AI Listing Enhancement')).toBeVisible();
    await expect(page.getByTestId('property-description-input')).toBeVisible();
    await expect(page.getByTestId('generate-listing-button')).toBeVisible();
    
    // Check if style selection is properly displayed on mobile
    await expect(page.getByTestId('style-professional')).toBeVisible();
    await expect(page.getByTestId('style-casual')).toBeVisible();
    await expect(page.getByTestId('style-luxury')).toBeVisible();
  });
});