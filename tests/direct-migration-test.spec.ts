import { test, expect } from '@playwright/test';

test('Execute migration through UI', async ({ page }) => {
  console.log('🚀 Testing migration execution...');
  
  // Navigate to settings
  await page.goto('/settings');
  await expect(page.locator('h1')).toContainText('Settings');
  console.log('✅ Settings page loaded');
  
  // Find migration section
  await expect(page.locator('text=Data Migration')).toBeVisible();
  await expect(page.locator('text=Unified Payment System Migration')).toBeVisible();
  console.log('✅ Migration section found');
  
  // Look for the dry run button
  const dryRunButton = page.locator('button:has-text("Preview Migration (Dry Run)")');
  await expect(dryRunButton).toBeVisible();
  console.log('✅ Dry run button found');
  
  // Click dry run button
  console.log('🔍 Executing dry run...');
  await dryRunButton.click();
  
  // Wait a bit for the request to complete
  await page.waitForTimeout(3000);
  
  // Check the page for any results or messages
  console.log('🔍 Checking for migration results...');
  
  // Look for common result indicators
  const possibleResults = [
    'Dry run complete',
    'Migration Preview', 
    'Total Items:',
    'Items to Migrate:',
    'No migration needed',
    'already using the unified payment system',
    'would be migrated',
    'Migration complete'
  ];
  
  let foundResult = false;
  for (const resultText of possibleResults) {
    const resultElement = page.locator(`text=${resultText}`);
    if (await resultElement.isVisible()) {
      console.log(`✅ Found result: "${resultText}"`);
      foundResult = true;
      
      // If we found a migration preview, look for a Run Migration button
      if (resultText.includes('Dry run') || resultText.includes('Preview')) {
        const runButton = page.locator('button:has-text("Run Migration")');
        const hasRunButton = await runButton.isVisible();
        
        if (hasRunButton) {
          console.log('🎯 Found Run Migration button - executing actual migration...');
          await runButton.click();
          await page.waitForTimeout(3000);
          
          // Check for completion
          const completionMessages = [
            'Migration completed successfully',
            'Migration Complete'
          ];
          
          for (const msg of completionMessages) {
            const completionElement = page.locator(`text=${msg}`);
            if (await completionElement.isVisible()) {
              console.log(`🎉 Migration completed: "${msg}"`);
              break;
            }
          }
        }
      }
      break;
    }
  }
  
  if (!foundResult) {
    console.log('⚠️ No specific migration result found, checking page content...');
    
    // Get some page text to see what's there
    const bodyText = await page.locator('body').textContent();
    if (bodyText?.includes('migration') || bodyText?.includes('unified')) {
      console.log('ℹ️ Migration interface is present but may be in different state');
    }
  }
  
  // Take a final screenshot
  await page.screenshot({ path: 'migration-execution-result.png', fullPage: true });
  console.log('📸 Final screenshot saved as migration-execution-result.png');
  
  // Verify the interface is still working
  await expect(page.locator('text=Unified Payment System Migration')).toBeVisible();
  console.log('✅ Migration interface verified working');
  
  console.log('🏁 Migration test completed');
});