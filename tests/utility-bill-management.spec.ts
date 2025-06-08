import { test, expect } from '@playwright/test';
import { testData } from './helpers/test-data';

test.describe('Utility Bill Management - Unified Payment System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to utility bills page
    await page.goto('/utility-bills');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Utility Bill Management');
  });

  test.describe('Basic Functionality', () => {
    test('should display utility bills page with correct headers', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Utility Bill Management');
      await expect(page.locator('p').first()).toContainText('Comprehensive bill tracking, payments, and tenant charge management');
    });

    test('should show stats cards with correct metrics', async ({ page }) => {
      // Check that all 4 stat cards are present using the data-testid
      await expect(page.locator('[data-testid="stat-card-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="stat-card-unpaid"]')).toBeVisible();
      await expect(page.locator('[data-testid="stat-card-amount"]')).toBeVisible();
      await expect(page.locator('[data-testid="stat-card-outstanding"]')).toBeVisible();
      
      // Verify stat card labels
      await expect(page.locator('text=Total Bills')).toBeVisible();
      await expect(page.locator('text=Unpaid Bills')).toBeVisible();
      await expect(page.locator('text=Total Amount')).toBeVisible();
      await expect(page.locator('text=Unpaid Amount')).toBeVisible();
    });

    test('should show filters and controls section', async ({ page }) => {
      await expect(page.locator('text=Filters & Search')).toBeVisible();
      await expect(page.locator('#search')).toBeVisible();
      await expect(page.locator('#property')).toBeVisible();
      await expect(page.locator('#utilityType')).toBeVisible();
      await expect(page.locator('#status')).toBeVisible();
      await expect(page.locator('#tenant')).toBeVisible();
    });
  });

  test.describe('Bill Creation and Management', () => {
    test('should open add bill dialog', async ({ page }) => {
      await page.locator('button:has-text("Add Bill")').click();
      await expect(page.locator('text=Add Utility Bill')).toBeVisible();
    });

    test('should create a new utility bill', async ({ page }) => {
      // Click Add Bill button
      await page.locator('button:has-text("Add Bill")').click();
      
      // Fill out the form (assuming we have at least one property)
      await page.selectOption('#property-select', { index: 1 }); // Select first property
      await page.selectOption('#utility-type', 'Electric');
      await page.fill('#provider', 'Test Electric Company');
      await page.fill('#total-amount', '150.00');
      await page.fill('#bill-month', '2024-12');
      await page.fill('#due-date', '2024-12-15');
      await page.fill('#bill-date', '2024-12-01');
      
      // Submit the form
      await page.locator('button:has-text("Add Bill")').click();
      
      // Verify success message
      await expect(page.locator('text=Bill added successfully')).toBeVisible();
      
      // Verify bill appears in the list
      await expect(page.locator('text=Electric')).toBeVisible();
      await expect(page.locator('text=Test Electric Company')).toBeVisible();
      await expect(page.locator('text=$150.00')).toBeVisible();
    });

    test('should edit an existing bill', async ({ page }) => {
      // Find and click edit button on first bill
      await page.locator('[data-testid="bill-actions"]').first().click();
      await page.locator('text=Edit').click();
      
      // Verify edit dialog opens
      await expect(page.locator('text=Edit Bill')).toBeVisible();
      
      // Change the amount
      await page.fill('#total-amount', '175.00');
      
      // Submit changes
      await page.locator('button:has-text("Update Bill")').click();
      
      // Verify success message
      await expect(page.locator('text=Bill updated successfully')).toBeVisible();
    });

    test('should delete a bill', async ({ page }) => {
      // Find and click actions button on first bill
      await page.locator('[data-testid="bill-actions"]').first().click();
      await page.locator('text=Delete').click();
      
      // Confirm deletion in dialog
      await expect(page.locator('text=Delete Utility Bill')).toBeVisible();
      await page.locator('button:has-text("Delete")').click();
      
      // Verify success message
      await expect(page.locator('text=Bill deleted successfully')).toBeVisible();
    });
  });

  test.describe('Unified Payment System', () => {
    test('should mark bill as paid by landlord', async ({ page }) => {
      // Find a bill with "Unpaid" status
      const unpaidBill = page.locator('[data-testid="bill-item"]:has-text("Unpaid")').first();
      await expect(unpaidBill).toBeVisible();
      
      // Click actions menu
      await unpaidBill.locator('[data-testid="bill-actions"]').click();
      await page.locator('text=Mark Paid').click();
      
      // Verify bill is marked as paid
      await expect(page.locator('text=Bill marked as paid')).toBeVisible();
      await expect(unpaidBill.locator('text=Paid')).toBeVisible();
    });

    test('should mark bill as unpaid', async ({ page }) => {
      // Find a bill with "Paid" status
      const paidBill = page.locator('[data-testid="bill-item"]:has-text("Paid")').first();
      await expect(paidBill).toBeVisible();
      
      // Click actions menu
      await paidBill.locator('[data-testid="bill-actions"]').click();
      await page.locator('text=Mark Unpaid').click();
      
      // Verify bill is marked as unpaid
      await expect(page.locator('text=Bill marked as unpaid')).toBeVisible();
      await expect(paidBill.locator('text=Unpaid')).toBeVisible();
    });

    test('should show paid date when bill is marked as paid', async ({ page }) => {
      // Mark a bill as paid
      const unpaidBill = page.locator('[data-testid="bill-item"]:has-text("Unpaid")').first();
      await unpaidBill.locator('[data-testid="bill-actions"]').click();
      await page.locator('text=Mark Paid').click();
      
      // Verify paid date is shown
      const currentDate = new Date().toISOString().split('T')[0];
      await expect(unpaidBill.locator(`text=Paid: ${currentDate}`)).toBeVisible();
    });
  });

  test.describe('Filtering and Search', () => {
    test('should filter bills by property', async ({ page }) => {
      // Get initial bill count
      const initialBillCount = await page.locator('[data-testid="bill-item"]').count();
      
      // Select a specific property
      await page.selectOption('#property', { index: 1 });
      
      // Wait for filtering to apply
      await page.waitForTimeout(500);
      
      // Verify stats update to reflect filtered results
      const filteredBillCount = await page.locator('[data-testid="bill-item"]').count();
      expect(filteredBillCount).toBeLessThanOrEqual(initialBillCount);
    });

    test('should filter bills by utility type', async ({ page }) => {
      // Select Electric utility type
      await page.selectOption('#utilityType', 'Electric');
      
      // Verify only electric bills are shown
      const electricBills = page.locator('[data-testid="bill-item"]:has-text("Electric")');
      const nonElectricBills = page.locator('[data-testid="bill-item"]:not(:has-text("Electric"))');
      
      await expect(electricBills.first()).toBeVisible();
      await expect(nonElectricBills).toHaveCount(0);
    });

    test('should filter bills by payment status', async ({ page }) => {
      // Filter to show only unpaid bills
      await page.selectOption('#status', 'unpaid');
      
      // Verify only unpaid bills are shown
      const unpaidBills = page.locator('[data-testid="bill-item"]:has-text("Unpaid")');
      const paidBills = page.locator('[data-testid="bill-item"]:has-text("Paid")');
      
      if (await unpaidBills.count() > 0) {
        await expect(unpaidBills.first()).toBeVisible();
      }
      await expect(paidBills).toHaveCount(0);
    });

    test('should filter bills by tenant', async ({ page }) => {
      // Select a specific tenant
      await page.selectOption('#tenant', { index: 1 });
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Verify tenant-specific stats update
      await expect(page.locator('text=Tenant Charges')).toBeVisible();
      await expect(page.locator('text=Outstanding Balance')).toBeVisible();
    });

    test('should search bills by provider name', async ({ page }) => {
      await page.fill('#search', 'Electric Company');
      
      // Wait for search to apply
      await page.waitForTimeout(500);
      
      // Verify only bills with matching provider are shown
      const searchResults = page.locator('[data-testid="bill-item"]:has-text("Electric Company")');
      await expect(searchResults.first()).toBeVisible();
    });

    test('should search bills by utility type', async ({ page }) => {
      await page.fill('#search', 'Water');
      
      // Wait for search to apply
      await page.waitForTimeout(500);
      
      // Verify only water bills are shown
      const waterBills = page.locator('[data-testid="bill-item"]:has-text("Water")');
      if (await waterBills.count() > 0) {
        await expect(waterBills.first()).toBeVisible();
      }
    });

    test('should filter by date range', async ({ page }) => {
      // Set date range
      await page.fill('#startMonth', '2024-01');
      await page.fill('#endMonth', '2024-06');
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Verify bills are within date range
      const billItems = page.locator('[data-testid="bill-item"]');
      const count = await billItems.count();
      
      if (count > 0) {
        // Check that displayed months are within range
        const firstBill = billItems.first();
        await expect(firstBill).toBeVisible();
      }
    });

    test('should reset all filters', async ({ page }) => {
      // Apply multiple filters
      await page.selectOption('#property', { index: 1 });
      await page.selectOption('#utilityType', 'Electric');
      await page.selectOption('#status', 'paid');
      await page.fill('#search', 'test');
      
      // Click reset button
      await page.locator('button:has-text("Reset")').click();
      
      // Verify all filters are cleared
      await expect(page.locator('#property')).toHaveValue('');
      await expect(page.locator('#utilityType')).toHaveValue('');
      await expect(page.locator('#status')).toHaveValue('');
      await expect(page.locator('#search')).toHaveValue('');
    });
  });

  test.describe('Bill Charges and Tenant Management', () => {
    test('should view bill charges breakdown', async ({ page }) => {
      // Click on view charges for first bill
      await page.locator('[data-testid="bill-actions"]').first().click();
      await page.locator('text=View Charges').click();
      
      // Verify charges dialog opens
      await expect(page.locator('text=Bill Charges & Tenant Responsibilities')).toBeVisible();
      
      // Verify bill details are shown
      await expect(page.locator('[data-testid="bill-details"]')).toBeVisible();
    });

    test('should show tenant-specific charges when tenant is selected', async ({ page }) => {
      // Select a tenant with utility responsibilities
      await page.selectOption('#tenant', { index: 1 });
      
      // Wait for filtering
      await page.waitForTimeout(1000);
      
      // Verify tenant-specific stats
      await expect(page.locator('text=Tenant Charges')).toBeVisible();
      await expect(page.locator('text=Outstanding Balance')).toBeVisible();
      
      // Verify stats show tenant-specific amounts (not full bill amounts)
      const tenantCharges = await page.locator('[data-testid="tenant-charges-amount"]').textContent();
      const fullBillTotal = await page.locator('[data-testid="total-amount"]').textContent();
      
      // Tenant charges should be different from full bill total in split scenarios
      if (tenantCharges && fullBillTotal) {
        // This assertion would depend on actual data
        expect(tenantCharges).not.toBe(fullBillTotal);
      }
    });
  });

  test.describe('Grouping and Sorting', () => {
    test('should group bills by property', async ({ page }) => {
      await page.selectOption('#groupBy', 'property');
      
      // Verify property group headers appear
      await expect(page.locator('[data-testid="group-header"]').first()).toBeVisible();
    });

    test('should group bills by utility type', async ({ page }) => {
      await page.selectOption('#groupBy', 'utility');
      
      // Verify utility type group headers
      await expect(page.locator('text=Electric').first()).toBeVisible();
    });

    test('should group bills by payment status', async ({ page }) => {
      await page.selectOption('#groupBy', 'status');
      
      // Verify status group headers
      const paidGroup = page.locator('[data-testid="group-header"]:has-text("Paid")');
      const unpaidGroup = page.locator('[data-testid="group-header"]:has-text("Unpaid")');
      
      if (await paidGroup.count() > 0) {
        await expect(paidGroup).toBeVisible();
      }
      if (await unpaidGroup.count() > 0) {
        await expect(unpaidGroup).toBeVisible();
      }
    });

    test('should sort bills by amount', async ({ page }) => {
      await page.selectOption('#sortBy', 'amount');
      
      // Wait for sorting
      await page.waitForTimeout(500);
      
      // Verify bills are sorted by amount (highest first)
      const billAmounts = await page.locator('[data-testid="bill-amount"]').allTextContents();
      
      if (billAmounts.length > 1) {
        const amounts = billAmounts.map(amount => parseFloat(amount.replace('$', '').replace(',', '')));
        for (let i = 1; i < amounts.length; i++) {
          expect(amounts[i]).toBeLessThanOrEqual(amounts[i - 1]);
        }
      }
    });

    test('should sort bills by date', async ({ page }) => {
      await page.selectOption('#sortBy', 'date');
      
      // Wait for sorting
      await page.waitForTimeout(500);
      
      // Verify bills are sorted by date (newest first)
      const billDates = await page.locator('[data-testid="bill-month"]').allTextContents();
      
      if (billDates.length > 1) {
        for (let i = 1; i < billDates.length; i++) {
          expect(billDates[i]).toBeLessThanOrEqual(billDates[i - 1]);
        }
      }
    });
  });

  test.describe('Bulk Operations', () => {
    test('should open bulk entry dialog', async ({ page }) => {
      await page.locator('button:has-text("Bulk Entry")').click();
      await expect(page.locator('text=Bulk Utility Bill Entry')).toBeVisible();
    });

    test('should require property selection for bulk entry', async ({ page }) => {
      await page.locator('button:has-text("Bulk Entry")').click();
      
      // If no property is selected, should show message
      await expect(page.locator('text=Please select a property from the filters first')).toBeVisible();
    });

    test('should create multiple bills via bulk entry', async ({ page }) => {
      // First select a property
      await page.selectOption('#property', { index: 1 });
      
      // Open bulk entry
      await page.locator('button:has-text("Bulk Entry")').click();
      
      // Fill bulk entry form (implementation depends on BulkUtilityBillEntry component)
      await page.fill('#bulk-month', '2024-12');
      
      // Add multiple bills
      await page.locator('button:has-text("Add Bill")').click();
      await page.selectOption('[data-testid="utility-type-0"]', 'Electric');
      await page.fill('[data-testid="provider-0"]', 'Electric Co');
      await page.fill('[data-testid="amount-0"]', '120.00');
      
      await page.locator('button:has-text("Add Bill")').click();
      await page.selectOption('[data-testid="utility-type-1"]', 'Water');
      await page.fill('[data-testid="provider-1"]', 'Water Dept');
      await page.fill('[data-testid="amount-1"]', '45.00');
      
      // Submit bulk entry
      await page.locator('button:has-text("Create Bills")').click();
      
      // Verify success
      await expect(page.locator('text=Successfully added 2 bills')).toBeVisible();
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle empty state when no bills exist', async ({ page }) => {
      // If no bills exist, should show empty state
      const noBillsMessage = page.locator('text=No Bills Found');
      if (await noBillsMessage.isVisible()) {
        await expect(page.locator('text=Start by adding your first utility bill')).toBeVisible();
        await expect(page.locator('button:has-text("Add First Bill")')).toBeVisible();
      }
    });

    test('should handle no results when filters return empty set', async ({ page }) => {
      // Apply filters that should return no results
      await page.fill('#search', 'nonexistent-provider-12345');
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Should show no results message
      await expect(page.locator('text=No Bills Found')).toBeVisible();
      await expect(page.locator('text=Try adjusting your filters')).toBeVisible();
    });

    test('should handle invalid form data gracefully', async ({ page }) => {
      await page.locator('button:has-text("Add Bill")').click();
      
      // Try to submit with invalid data
      await page.fill('#total-amount', '-100'); // Negative amount
      await page.locator('button:has-text("Add Bill")').click();
      
      // Should show validation error
      await expect(page.locator('text=Bill amount must be greater than 0')).toBeVisible();
    });

    test('should handle duplicate bill creation', async ({ page }) => {
      await page.locator('button:has-text("Add Bill")').click();
      
      // Create bill with specific details
      await page.selectOption('#property-select', { index: 1 });
      await page.selectOption('#utility-type', 'Electric');
      await page.fill('#bill-month', '2024-12');
      await page.fill('#provider', 'Test Provider');
      await page.fill('#total-amount', '100.00');
      
      await page.locator('button:has-text("Add Bill")').click();
      
      // Try to create same bill again
      await page.locator('button:has-text("Add Bill")').click();
      await page.selectOption('#property-select', { index: 1 });
      await page.selectOption('#utility-type', 'Electric');
      await page.fill('#bill-month', '2024-12');
      await page.fill('#provider', 'Test Provider');
      await page.fill('#total-amount', '100.00');
      
      await page.locator('button:has-text("Add Bill")').click();
      
      // Should show duplicate error
      await expect(page.locator('text=A Electric bill for 2024-12 already exists')).toBeVisible();
    });
  });

  test.describe('Tenant Filtering Bug Fix Verification', () => {
    test('should show correct charges for second tenant in split responsibility scenario', async ({ page }) => {
      // This test specifically addresses the original bug report
      // where the second tenant with 40% responsibility showed 0 charges
      
      // Set up scenario: property with two tenants having 60%/40% split
      // (This assumes test data is set up with this scenario)
      
      // Filter to first tenant (60% responsibility)
      await page.selectOption('#tenant', { label: /.*60%.*/ }); // Assuming tenant names indicate responsibility
      
      // Wait for filtering
      await page.waitForTimeout(1000);
      
      // Capture first tenant's charges
      const firstTenantCharges = await page.locator('[data-testid="tenant-charges-amount"]').textContent();
      const firstTenantBalance = await page.locator('[data-testid="outstanding-balance-amount"]').textContent();
      
      // Filter to second tenant (40% responsibility)
      await page.selectOption('#tenant', { label: /.*40%.*/ });
      
      // Wait for filtering
      await page.waitForTimeout(1000);
      
      // Verify second tenant shows charges (not 0)
      const secondTenantCharges = await page.locator('[data-testid="tenant-charges-amount"]').textContent();
      const secondTenantBalance = await page.locator('[data-testid="outstanding-balance-amount"]').textContent();
      
      // Second tenant should have charges > 0
      expect(parseFloat(secondTenantCharges?.replace('$', '') || '0')).toBeGreaterThan(0);
      expect(parseFloat(secondTenantBalance?.replace('$', '') || '0')).toBeGreaterThan(0);
      
      // Second tenant charges should be less than first tenant (40% vs 60%)
      const firstAmount = parseFloat(firstTenantCharges?.replace('$', '') || '0');
      const secondAmount = parseFloat(secondTenantCharges?.replace('$', '') || '0');
      
      if (firstAmount > 0 && secondAmount > 0) {
        expect(secondAmount).toBeLessThan(firstAmount);
        
        // Verify approximate 40%/60% ratio
        const ratio = secondAmount / firstAmount;
        expect(ratio).toBeCloseTo(0.67, 1); // 40/60 = 0.67 approximately
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify page still loads and is usable
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Add Bill")')).toBeVisible();
      
      // Verify filters are accessible (may be collapsed on mobile)
      await expect(page.locator('#search')).toBeVisible();
    });
  });
});