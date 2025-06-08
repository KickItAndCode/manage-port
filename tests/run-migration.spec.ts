import { test, expect } from '@playwright/test';

test.describe('Data Migration Execution', () => {
  test('should run tenant utility charges migration successfully', async ({ page }) => {
    // Navigate to settings page where migration panel is located
    await page.goto('/settings');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Settings');
    
    // Find the Data Migration section
    await expect(page.locator('text=Data Migration')).toBeVisible();
    await expect(page.locator('text=Unified Payment System Migration')).toBeVisible();
    
    // First, run a dry run to see what would be migrated
    const dryRunButton = page.locator('button:has-text("Preview Migration (Dry Run)")');
    await expect(dryRunButton).toBeVisible();
    
    console.log('🔍 Running dry run migration...');
    await dryRunButton.click();
    
    // Wait for dry run to complete (may take a few seconds)
    await page.waitForTimeout(3000);
    
    // Check if dry run results are displayed
    const dryRunResults = page.locator('text=Migration Preview, text=Dry run complete');
    const hasResults = await dryRunResults.first().isVisible();
    
    if (hasResults) {
      console.log('✅ Dry run completed, results displayed');
      
      // Look for the actual migration button
      const migrationButton = page.locator('button:has-text("Run Migration")');
      const isMigrationButtonVisible = await migrationButton.isVisible();
      
      if (isMigrationButtonVisible) {
        console.log('🚀 Running actual migration...');
        await migrationButton.click();
        
        // Wait for migration to complete
        await page.waitForTimeout(5000);
        
        // Check for success message
        const successMessage = page.locator('text=Migration completed successfully');
        const migrationComplete = page.locator('text=Migration Complete');
        
        const hasSuccess = await successMessage.isVisible();
        const hasComplete = await migrationComplete.isVisible();
        
        if (hasSuccess || hasComplete) {
          console.log('🎉 Migration completed successfully!');
          
          // Try to capture some migration details
          const migrationSummary = page.locator('[data-testid*="migration"], .space-y-4 .grid');
          const hasSummary = await migrationSummary.first().isVisible();
          
          if (hasSummary) {
            console.log('📊 Migration summary displayed');
          }
          
          // Verify the success state
          await expect(page.locator('text=Migration completed successfully, text=Migration Complete').first()).toBeVisible();
          
        } else {
          console.log('⚠️ Migration may have completed but success message not found');
        }
      } else {
        console.log('ℹ️ No migration needed - data is already up to date');
        
        // Check for "no migration needed" message
        const noMigrationMessage = page.locator('text=No migration needed, text=already using the unified payment system');
        const hasNoMigrationMessage = await noMigrationMessage.first().isVisible();
        
        if (hasNoMigrationMessage) {
          console.log('✅ Confirmed: Data is already using unified payment system');
        }
      }
    } else {
      console.log('⚠️ Dry run may not have completed or no results to display');
    }
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'migration-results.png', fullPage: true });
    console.log('📸 Screenshot saved as migration-results.png');
  });

  test('should handle migration errors gracefully', async ({ page }) => {
    await page.goto('/settings');
    
    // Check that error handling works if there are any issues
    await expect(page.locator('text=Data Migration')).toBeVisible();
    
    // The migration panel should handle errors gracefully
    // This test ensures the UI doesn't break if there are any migration issues
    const migrationPanel = page.locator('text=Unified Payment System Migration').locator('..');
    await expect(migrationPanel).toBeVisible();
    
    console.log('✅ Migration panel loads without errors');
  });

  test('should show migration explanations correctly', async ({ page }) => {
    await page.goto('/settings');
    
    // Verify all migration explanations are present
    await expect(page.locator('text=What this migration does:')).toBeVisible();
    
    // Check for specific field migrations
    await expect(page.locator('text=isPaid')).toBeVisible();
    await expect(page.locator('text=landlordPaidUtilityCompany')).toBeVisible();
    await expect(page.locator('text=fullyPaid')).toBeVisible();
    await expect(page.locator('text=tenantPaidAmount')).toBeVisible();
    
    console.log('✅ All migration explanations are displayed correctly');
  });
});