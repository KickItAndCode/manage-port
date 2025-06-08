import { test, expect } from '@playwright/test';

test.describe('Utility Bills - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to utility bills page
    await page.goto('/utility-bills');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Utility Bill Management');
  });

  test('should display utility bills page correctly', async ({ page }) => {
    // Check page title and description
    await expect(page.locator('h1')).toContainText('Utility Bill Management');
    await expect(page.locator('p').first()).toContainText('Comprehensive bill tracking, payments, and tenant charge management');
    
    // Check that main UI elements are present
    await expect(page.locator('[data-testid="add-bill-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-entry-btn"]')).toBeVisible();
  });

  test('should show stats cards', async ({ page }) => {
    // Check that all 4 stat cards are present using the data-testid
    await expect(page.locator('[data-testid="stat-card-total"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-card-unpaid"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-card-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-card-outstanding"]')).toBeVisible();
    
    // Verify stat card labels
    await expect(page.locator('text=Total Bills')).toBeVisible();
    await expect(page.locator('text=Unpaid Bills')).toBeVisible();
    
    // Check that stats show correct initial values (likely 0 for empty state)
    await expect(page.locator('[data-testid="total-bills-count"]')).toContainText('0');
    await expect(page.locator('[data-testid="unpaid-bills-count"]')).toContainText('0');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$0.00');
    await expect(page.locator('[data-testid="unpaid-amount"]')).toContainText('$0.00');
  });

  test('should show filters and controls', async ({ page }) => {
    await expect(page.locator('text=Filters & Search')).toBeVisible();
    await expect(page.locator('#search')).toBeVisible();
    await expect(page.locator('#property')).toBeVisible();
    await expect(page.locator('#utilityType')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#tenant')).toBeVisible();
    await expect(page.locator('#startMonth')).toBeVisible();
    await expect(page.locator('#endMonth')).toBeVisible();
    await expect(page.locator('#groupBy')).toBeVisible();
    await expect(page.locator('#sortBy')).toBeVisible();
  });

  test('should open add bill dialog', async ({ page }) => {
    await page.locator('[data-testid="add-bill-btn"]').click();
    await expect(page.locator('text=Add Utility Bill')).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('should open bulk entry dialog', async ({ page }) => {
    await page.locator('[data-testid="bulk-entry-btn"]').click();
    await expect(page.locator('text=Bulk Utility Bill Entry')).toBeVisible();
    
    // Should show message about selecting property first
    await expect(page.locator('text=Please select a property from the filters first')).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('should handle empty state correctly', async ({ page }) => {
    // Check for empty state message when no bills exist
    const emptyState = page.locator('text=No Bills Found');
    const addFirstBillBtn = page.locator('text=Add First Bill');
    
    // Either should show empty state or have bills
    const hasEmptyState = await emptyState.isVisible();
    const hasAddFirstBill = await addFirstBillBtn.isVisible();
    
    if (hasEmptyState || hasAddFirstBill) {
      // Empty state is showing correctly
      await expect(page.locator('text=Start by adding your first utility bill')).toBeVisible();
    } else {
      // Has bills, which is also fine - just check that bills container exists
      // This would mean there's existing data in the test environment
      console.log('Test environment has existing bills');
    }
  });

  test('should have working reset filters button', async ({ page }) => {
    // Find and click reset button
    const resetBtn = page.locator('button:has-text("Reset")');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    
    // Verify filters are reset (they should be empty/default values)
    await expect(page.locator('#search')).toHaveValue('');
    await expect(page.locator('#property')).toHaveValue('');
    await expect(page.locator('#utilityType')).toHaveValue('');
    await expect(page.locator('#status')).toHaveValue('');
    await expect(page.locator('#tenant')).toHaveValue('');
  });

  test('should show unified payment system in action buttons', async ({ page }) => {
    // If there are any bills visible, check that the actions are using new payment terminology
    const billItems = page.locator('[data-testid="bill-item"]');
    const billCount = await billItems.count();
    
    if (billCount > 0) {
      // Click on first bill's actions
      const firstBillActions = billItems.first().locator('[data-testid="bill-actions"]');
      await firstBillActions.click();
      
      // Should see either "Mark Paid" or "Mark Unpaid" (landlord payment actions)
      const markPaid = page.locator('text=Mark Paid');
      const markUnpaid = page.locator('text=Mark Unpaid');
      
      const hasMarkPaid = await markPaid.isVisible();
      const hasMarkUnpaid = await markUnpaid.isVisible();
      
      expect(hasMarkPaid || hasMarkUnpaid).toBeTruthy();
      
      // Close the dropdown by clicking elsewhere
      await page.keyboard.press('Escape');
    } else {
      console.log('No bills to test payment actions on');
    }
  });

  test('should show tenant filtering option correctly', async ({ page }) => {
    // Check that tenant filter shows "All Tenants" as default option
    const tenantSelect = page.locator('#tenant');
    await expect(tenantSelect).toBeVisible();
    
    // Check if it has the "All Tenants" option
    const allTenantsOption = tenantSelect.locator('option', { hasText: 'All Tenants' });
    await expect(allTenantsOption).toBeAttached();
  });

  test('should handle search functionality', async ({ page }) => {
    const searchInput = page.locator('#search');
    await expect(searchInput).toBeVisible();
    
    // Test typing in search
    await searchInput.fill('Electric');
    await expect(searchInput).toHaveValue('Electric');
    
    // Clear search
    await searchInput.fill('');
    await expect(searchInput).toHaveValue('');
  });

  test('should show proper month inputs for date filtering', async ({ page }) => {
    const startMonth = page.locator('#startMonth');
    const endMonth = page.locator('#endMonth');
    
    await expect(startMonth).toBeVisible();
    await expect(endMonth).toBeVisible();
    
    // These should be month inputs
    await expect(startMonth).toHaveAttribute('type', 'month');
    await expect(endMonth).toHaveAttribute('type', 'month');
    
    // Should have default values (current year)
    const currentYear = new Date().getFullYear();
    await expect(startMonth).toHaveValue(`${currentYear}-01`);
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    await expect(endMonth).toHaveValue(currentMonth);
  });
});