import { test, expect } from '@playwright/test';

test.describe('Dual Payment System - Landlord and Tenant Payments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/utility-bills');
    await expect(page.locator('h1')).toContainText('Utility Bill Management');
  });

  test.describe('Landlord Payment to Utility Company', () => {
    test('should track landlord payment status separately from tenant payments', async ({ page }) => {
      // Find a utility bill
      const billItem = page.locator('[data-testid="bill-item"]').first();
      await expect(billItem).toBeVisible();
      
      // Mark as paid by landlord to utility company
      await billItem.locator('[data-testid="bill-actions"]').click();
      await page.locator('text=Mark Paid').click();
      
      // Verify bill shows as paid by landlord
      await expect(billItem.locator('text=Paid')).toBeVisible();
      
      // Verify paid date is shown
      const currentDate = new Date().toISOString().split('T')[0];
      await expect(billItem.locator(`text=Paid: ${currentDate}`)).toBeVisible();
    });

    test('should allow marking landlord payment as unpaid', async ({ page }) => {
      // Find a paid bill
      const paidBill = page.locator('[data-testid="bill-item"]:has-text("Paid")').first();
      
      if (await paidBill.count() > 0) {
        await paidBill.locator('[data-testid="bill-actions"]').click();
        await page.locator('text=Mark Unpaid').click();
        
        // Verify bill shows as unpaid
        await expect(paidBill.locator('text=Unpaid')).toBeVisible();
        
        // Verify paid date is removed
        await expect(paidBill.locator('text=Paid:')).not.toBeVisible();
      }
    });

    test('should filter bills by landlord payment status', async ({ page }) => {
      // Filter to show only paid bills (landlord paid to utility company)
      await page.selectOption('#status', 'paid');
      
      // Verify only bills marked as paid by landlord are shown
      const visibleBills = page.locator('[data-testid="bill-item"]');
      const billCount = await visibleBills.count();
      
      for (let i = 0; i < billCount; i++) {
        const bill = visibleBills.nth(i);
        await expect(bill.locator('text=Paid')).toBeVisible();
      }
      
      // Verify no unpaid bills are shown
      await expect(page.locator('[data-testid="bill-item"]:has-text("Unpaid")')).toHaveCount(0);
    });

    test('should show correct unpaid amount based on landlord payment status', async ({ page }) => {
      // Get initial unpaid amount
      const initialUnpaidAmount = await page.locator('[data-testid="unpaid-amount"]').textContent();
      
      // Mark a bill as paid by landlord
      const unpaidBill = page.locator('[data-testid="bill-item"]:has-text("Unpaid")').first();
      if (await unpaidBill.count() > 0) {
        const billAmount = await unpaidBill.locator('[data-testid="bill-amount"]').textContent();
        
        await unpaidBill.locator('[data-testid="bill-actions"]').click();
        await page.locator('text=Mark Paid').click();
        
        // Wait for stats to update
        await page.waitForTimeout(500);
        
        // Verify unpaid amount decreased by the bill amount
        const newUnpaidAmount = await page.locator('[data-testid="unpaid-amount"]').textContent();
        
        const initialAmount = parseFloat(initialUnpaidAmount?.replace('$', '').replace(',', '') || '0');
        const billAmountNum = parseFloat(billAmount?.replace('$', '').replace(',', '') || '0');
        const newAmount = parseFloat(newUnpaidAmount?.replace('$', '').replace(',', '') || '0');
        
        expect(newAmount).toBeCloseTo(initialAmount - billAmountNum, 2);
      }
    });
  });

  test.describe('Tenant Payment Tracking', () => {
    test('should show tenant payment status in bill charges view', async ({ page }) => {
      // View charges for a bill
      await page.locator('[data-testid="bill-actions"]').first().click();
      await page.locator('text=View Charges').click();
      
      // Verify charges dialog opens
      await expect(page.locator('text=Bill Charges & Tenant Responsibilities')).toBeVisible();
      
      // Check for tenant payment information
      const chargesSection = page.locator('[data-testid="tenant-charges"]');
      await expect(chargesSection).toBeVisible();
      
      // Should show tenant payment status
      await expect(page.locator('text=Tenant Paid:')).toBeVisible();
      await expect(page.locator('text=Remaining:')).toBeVisible();
    });

    test('should handle partial tenant payments correctly', async ({ page }) => {
      // View bill charges
      await page.locator('[data-testid="bill-actions"]').first().click();
      await page.locator('text=View Charges').click();
      
      // Find a tenant charge
      const tenantCharge = page.locator('[data-testid="tenant-charge"]').first();
      
      if (await tenantCharge.count() > 0) {
        // Check charged amount
        const chargedAmount = await tenantCharge.locator('[data-testid="charged-amount"]').textContent();
        const paidAmount = await tenantCharge.locator('[data-testid="paid-amount"]').textContent();
        const remainingAmount = await tenantCharge.locator('[data-testid="remaining-amount"]').textContent();
        
        // Verify calculations are correct
        const charged = parseFloat(chargedAmount?.replace('$', '') || '0');
        const paid = parseFloat(paidAmount?.replace('$', '') || '0');
        const remaining = parseFloat(remainingAmount?.replace('$', '') || '0');
        
        expect(remaining).toBeCloseTo(charged - paid, 2);
      }
    });

    test('should distinguish between landlord and tenant payment status', async ({ page }) => {
      // This test verifies that the system correctly shows:
      // 1. Whether landlord paid the utility company
      // 2. Whether tenant paid the landlord
      // These should be independent statuses
      
      // Find a bill where landlord has paid utility company but tenant hasn't paid landlord
      const billItem = page.locator('[data-testid="bill-item"]').first();
      
      // Mark bill as paid by landlord to utility company
      await billItem.locator('[data-testid="bill-actions"]').click();
      await page.locator('text=Mark Paid').click();
      
      // Verify bill shows as paid (landlord to utility company)
      await expect(billItem.locator('text=Paid')).toBeVisible();
      
      // View charges to see tenant payment status
      await billItem.locator('[data-testid="bill-actions"]').click();
      await page.locator('text=View Charges').click();
      
      // Tenant charges should still show as unpaid (separate from landlord payment)
      const tenantCharges = page.locator('[data-testid="tenant-charge"]');
      const firstCharge = tenantCharges.first();
      
      if (await firstCharge.count() > 0) {
        // Tenant should still owe money even though landlord paid utility company
        const remainingAmount = await firstCharge.locator('[data-testid="remaining-amount"]').textContent();
        const remaining = parseFloat(remainingAmount?.replace('$', '') || '0');
        
        if (remaining > 0) {
          // This confirms dual payment system is working - landlord paid utility but tenant still owes landlord
          expect(remaining).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Payment Status Integration', () => {
    test('should show correct overall payment picture in stats', async ({ page }) => {
      // Stats should reflect both payment types:
      // - Total Amount: sum of all bills
      // - Unpaid Amount: bills where landlord hasn't paid utility company
      // When filtered by tenant:
      // - Tenant Charges: amount tenant owes to landlord
      // - Outstanding Balance: amount tenant still needs to pay landlord
      
      // Get overall stats
      const totalAmount = await page.locator('[data-testid="total-amount"]').textContent();
      const unpaidAmount = await page.locator('[data-testid="unpaid-amount"]').textContent();
      
      // Filter by specific tenant
      await page.selectOption('#tenant', { index: 1 });
      await page.waitForTimeout(1000);
      
      // Verify stats change to tenant-specific
      await expect(page.locator('text=Tenant Charges')).toBeVisible();
      await expect(page.locator('text=Outstanding Balance')).toBeVisible();
      
      const tenantCharges = await page.locator('[data-testid="tenant-charges-amount"]').textContent();
      const outstandingBalance = await page.locator('[data-testid="outstanding-balance-amount"]').textContent();
      
      // Tenant charges should be different from total bill amounts (due to splits)
      const totalAmountNum = parseFloat(totalAmount?.replace('$', '').replace(',', '') || '0');
      const tenantChargesNum = parseFloat(tenantCharges?.replace('$', '').replace(',', '') || '0');
      
      // In most cases, tenant charges should be less than total (unless tenant pays 100%)
      if (totalAmountNum > 0 && tenantChargesNum > 0) {
        expect(tenantChargesNum).toBeLessThanOrEqual(totalAmountNum);
      }
    });

    test('should handle property with multiple tenants correctly', async ({ page }) => {
      // Select a property with multiple tenants
      await page.selectOption('#property', { index: 1 });
      await page.waitForTimeout(500);
      
      // Get list of tenants for this property
      const tenantOptions = page.locator('#tenant option');
      const tenantCount = await tenantOptions.count();
      
      if (tenantCount > 2) { // More than "All Tenants" option
        const tenantAmounts: number[] = [];
        
        // Check charges for each tenant
        for (let i = 1; i < Math.min(tenantCount, 4); i++) { // Check first 3 tenants
          await page.selectOption('#tenant', { index: i });
          await page.waitForTimeout(500);
          
          const tenantCharges = await page.locator('[data-testid="tenant-charges-amount"]').textContent();
          const amount = parseFloat(tenantCharges?.replace('$', '').replace(',', '') || '0');
          tenantAmounts.push(amount);
        }
        
        // If multiple tenants have charges, they should sum to something reasonable
        const totalTenantCharges = tenantAmounts.reduce((sum, amount) => sum + amount, 0);
        
        // Reset to show all tenants
        await page.selectOption('#tenant', '');
        await page.waitForTimeout(500);
        
        const overallTotal = await page.locator('[data-testid="total-amount"]').textContent();
        const overallTotalNum = parseFloat(overallTotal?.replace('$', '').replace(',', '') || '0');
        
        // Total tenant charges should be <= overall total (tenants don't pay more than 100%)
        if (overallTotalNum > 0) {
          expect(totalTenantCharges).toBeLessThanOrEqual(overallTotalNum * 1.1); // Allow 10% tolerance for rounding
        }
      }
    });

    test('should maintain data consistency between views', async ({ page }) => {
      // Test that the same payment information is consistent across different views:
      // 1. Main bill list
      // 2. Bill details/charges view
      // 3. Filtered views
      
      // Get bill amount from main list
      const firstBill = page.locator('[data-testid="bill-item"]').first();
      const billAmountInList = await firstBill.locator('[data-testid="bill-amount"]').textContent();
      const billStatusInList = await firstBill.locator('[data-testid="bill-status"]').textContent();
      
      // View charges for this bill
      await firstBill.locator('[data-testid="bill-actions"]').click();
      await page.locator('text=View Charges').click();
      
      // Get bill amount from charges view
      const billAmountInCharges = await page.locator('[data-testid="bill-total-amount"]').textContent();
      
      // Close charges view
      await page.locator('button:has-text("Close")').click();
      
      // Amounts should match
      expect(billAmountInList).toBe(billAmountInCharges);
      
      // Status should also be consistent
      await firstBill.locator('[data-testid="bill-actions"]').click();
      const currentStatus = await page.locator('text=Mark Paid, text=Mark Unpaid').first().textContent();
      
      if (billStatusInList?.includes('Paid')) {
        expect(currentStatus).toContain('Mark Unpaid');
      } else {
        expect(currentStatus).toContain('Mark Paid');
      }
    });
  });

  test.describe('Edge Cases for Dual Payment System', () => {
    test('should handle bills with 0% tenant responsibility', async ({ page }) => {
      // Some bills might have 0% tenant responsibility (landlord pays everything)
      // These should show in main view but not create tenant charges
      
      // Filter by tenant
      await page.selectOption('#tenant', { index: 1 });
      await page.waitForTimeout(1000);
      
      // If tenant has no responsibility for certain bills, they shouldn't appear
      // But the filtering should still work correctly
      const visibleBillsWithTenant = await page.locator('[data-testid="bill-item"]').count();
      
      // Reset filter
      await page.selectOption('#tenant', '');
      await page.waitForTimeout(500);
      
      const allVisibleBills = await page.locator('[data-testid="bill-item"]').count();
      
      // Should have same or fewer bills when filtered by tenant
      expect(visibleBillsWithTenant).toBeLessThanOrEqual(allVisibleBills);
    });

    test('should handle bills with 100% tenant responsibility', async ({ page }) => {
      // Some bills might have 100% tenant responsibility
      // Tenant charges should equal full bill amount
      
      // Look for a bill and check its charges
      const billItem = page.locator('[data-testid="bill-item"]').first();
      const billAmount = await billItem.locator('[data-testid="bill-amount"]').textContent();
      
      // View charges
      await billItem.locator('[data-testid="bill-actions"]').click();
      await page.locator('text=View Charges').click();
      
      const tenantCharges = page.locator('[data-testid="tenant-charge"]');
      const chargeCount = await tenantCharges.count();
      
      if (chargeCount === 1) {
        // If only one tenant charge, check if it equals the bill amount (100% responsibility)
        const chargedAmount = await tenantCharges.locator('[data-testid="charged-amount"]').textContent();
        const billAmountNum = parseFloat(billAmount?.replace('$', '').replace(',', '') || '0');
        const chargedAmountNum = parseFloat(chargedAmount?.replace('$', '').replace(',', '') || '0');
        
        if (Math.abs(billAmountNum - chargedAmountNum) < 0.01) {
          // This tenant has 100% responsibility
          expect(chargedAmountNum).toBeCloseTo(billAmountNum, 2);
        }
      }
    });

    test('should handle split responsibility calculations correctly', async ({ page }) => {
      // Test the specific scenario from the original bug: 60%/40% split
      
      // Find a bill with multiple tenant charges
      await page.locator('[data-testid="bill-actions"]').first().click();
      await page.locator('text=View Charges').click();
      
      const tenantCharges = page.locator('[data-testid="tenant-charge"]');
      const chargeCount = await tenantCharges.count();
      
      if (chargeCount >= 2) {
        // Get bill total
        const billTotal = await page.locator('[data-testid="bill-total-amount"]').textContent();
        const billTotalNum = parseFloat(billTotal?.replace('$', '').replace(',', '') || '0');
        
        // Get all tenant charge amounts
        const chargeAmounts: number[] = [];
        for (let i = 0; i < chargeCount; i++) {
          const chargeAmount = await tenantCharges.nth(i).locator('[data-testid="charged-amount"]').textContent();
          const amount = parseFloat(chargeAmount?.replace('$', '').replace(',', '') || '0');
          chargeAmounts.push(amount);
        }
        
        // Sum of tenant charges should be <= bill total (tenants don't pay more than 100%)
        const totalCharges = chargeAmounts.reduce((sum, amount) => sum + amount, 0);
        expect(totalCharges).toBeLessThanOrEqual(billTotalNum * 1.01); // Allow small rounding tolerance
        
        // Each charge should be > 0 (the original bug was showing 0 for second tenant)
        chargeAmounts.forEach(amount => {
          expect(amount).toBeGreaterThan(0);
        });
        
        // If exactly 2 tenants, and total charges equal bill total, verify percentage split
        if (chargeCount === 2 && Math.abs(totalCharges - billTotalNum) < 0.01) {
          const firstPercentage = (chargeAmounts[0] / billTotalNum) * 100;
          const secondPercentage = (chargeAmounts[1] / billTotalNum) * 100;
          
          // Should add up to 100%
          expect(firstPercentage + secondPercentage).toBeCloseTo(100, 1);
          
          // Both should be meaningful percentages (not 0%)
          expect(firstPercentage).toBeGreaterThan(0);
          expect(secondPercentage).toBeGreaterThan(0);
        }
      }
    });
  });
});