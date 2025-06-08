// Test data attributes and selectors for utility bill management tests

export const SELECTORS = {
  // Page elements
  pageTitle: 'h1:has-text("Utility Bill Management")',
  pageDescription: 'text=Comprehensive bill tracking, payments, and tenant charge management',
  
  // Navigation and buttons
  addBillButton: 'button:has-text("Add Bill")',
  bulkEntryButton: 'button:has-text("Bulk Entry")',
  resetFiltersButton: 'button:has-text("Reset")',
  
  // Form fields
  searchInput: '#search',
  propertySelect: '#property',
  utilityTypeSelect: '#utilityType',
  statusSelect: '#status',
  tenantSelect: '#tenant',
  startMonthInput: '#startMonth',
  endMonthInput: '#endMonth',
  groupBySelect: '#groupBy',
  sortBySelect: '#sortBy',
  
  // Bill form fields
  billPropertySelect: '#property-select',
  billUtilityTypeSelect: '#utility-type',
  billProviderInput: '#provider',
  billAmountInput: '#total-amount',
  billMonthInput: '#bill-month',
  billDueDateInput: '#due-date',
  billDateInput: '#bill-date',
  
  // Stats cards
  totalBillsCard: 'text=Total Bills',
  unpaidBillsCard: 'text=Unpaid Bills',
  totalAmountCard: 'text=Total Amount',
  unpaidAmountCard: 'text=Unpaid Amount',
  tenantChargesCard: 'text=Tenant Charges',
  outstandingBalanceCard: 'text=Outstanding Balance',
  
  // Bill items and actions
  billItem: '.border.rounded-lg.p-4', // Bill item container
  billAmount: '.text-lg.font-semibold', // Bill amount display
  billStatus: '.text-xs', // Badge for paid/unpaid status
  billActionsButton: 'button:has([data-testid="more-horizontal"])',
  
  // Dropdown menu items
  viewChargesMenuItem: 'text=View Charges',
  editMenuItem: 'text=Edit',
  deleteMenuItem: 'text=Delete',
  markPaidMenuItem: 'text=Mark Paid',
  markUnpaidMenuItem: 'text=Mark Unpaid',
  
  // Dialog elements
  addBillDialog: 'text=Add Utility Bill',
  editBillDialog: 'text=Edit Bill',
  bulkEntryDialog: 'text=Bulk Utility Bill Entry',
  chargesDialog: 'text=Bill Charges & Tenant Responsibilities',
  deleteConfirmDialog: 'text=Delete Utility Bill',
  
  // Charges view elements
  billDetailsSection: '.bg-muted\\/50.rounded-lg.p-4',
  tenantChargeRow: '.space-y-2 > div', // Individual tenant charge
  
  // Status badges
  paidBadge: '.bg-green-100.text-green-800',
  unpaidBadge: '.text-xs.bg-red-100',
  
  // Toast messages
  successToast: '[data-sonner-toast]',
  errorToast: '[data-sonner-toast][data-type="error"]',
  
  // Empty states
  emptyState: 'text=No Bills Found',
  emptyStateMessage: 'text=Start by adding your first utility bill',
  noResultsMessage: 'text=Try adjusting your filters',
  
  // Loading states
  loadingSkeleton: '[data-testid="skeleton"]',
};

export const TEST_DATA = {
  // Sample bill data for testing
  sampleBill: {
    utilityType: 'Electric',
    provider: 'Test Electric Company',
    amount: '150.00',
    month: '2024-12',
    dueDate: '2024-12-15',
    billDate: '2024-12-01',
  },
  
  // Test search terms
  searchTerms: {
    validProvider: 'Electric Company',
    validUtilityType: 'Water',
    invalidTerm: 'nonexistent-provider-12345',
  },
  
  // Date ranges for testing
  dateRanges: {
    currentYear: {
      start: '2024-01',
      end: '2024-12',
    },
    pastYear: {
      start: '2023-01', 
      end: '2023-12',
    },
    firstHalf: {
      start: '2024-01',
      end: '2024-06',
    },
  },
  
  // Test scenarios
  scenarios: {
    dualTenant: {
      // Scenario with two tenants having 60%/40% split
      firstTenantPercentage: 60,
      secondTenantPercentage: 40,
    },
    fullTenantResponsibility: {
      percentage: 100,
    },
    noTenantResponsibility: {
      percentage: 0,
    },
  },
};

export const WAIT_TIMES = {
  shortWait: 500,
  mediumWait: 1000,
  longWait: 2000,
  apiCall: 1500,
  filterUpdate: 800,
};

// Helper functions for common test operations
export class TestHelpers {
  constructor(private page: any) {}
  
  async waitForBillsToLoad() {
    await this.page.waitForTimeout(WAIT_TIMES.mediumWait);
    await this.page.waitForSelector(SELECTORS.billItem, { timeout: 10000 }).catch(() => {
      // If no bills exist, that's also valid
    });
  }
  
  async fillBillForm(billData: typeof TEST_DATA.sampleBill) {
    await this.page.selectOption(SELECTORS.billPropertySelect, { index: 1 });
    await this.page.selectOption(SELECTORS.billUtilityTypeSelect, billData.utilityType);
    await this.page.fill(SELECTORS.billProviderInput, billData.provider);
    await this.page.fill(SELECTORS.billAmountInput, billData.amount);
    await this.page.fill(SELECTORS.billMonthInput, billData.month);
    await this.page.fill(SELECTORS.billDueDateInput, billData.dueDate);
    await this.page.fill(SELECTORS.billDateInput, billData.billDate);
  }
  
  async getStatValue(statName: string): Promise<number> {
    const statCard = this.page.locator(`text=${statName}`).locator('..').locator('.text-2xl.font-bold');
    const value = await statCard.textContent();
    return parseFloat(value?.replace('$', '').replace(',', '') || '0');
  }
  
  async getBillCount(): Promise<number> {
    return await this.page.locator(SELECTORS.billItem).count();
  }
  
  async selectTenant(index: number) {
    await this.page.selectOption(SELECTORS.tenantSelect, { index });
    await this.page.waitForTimeout(WAIT_TIMES.filterUpdate);
  }
  
  async selectProperty(index: number) {
    await this.page.selectOption(SELECTORS.propertySelect, { index });
    await this.page.waitForTimeout(WAIT_TIMES.filterUpdate);
  }
  
  async searchBills(searchTerm: string) {
    await this.page.fill(SELECTORS.searchInput, searchTerm);
    await this.page.waitForTimeout(WAIT_TIMES.filterUpdate);
  }
  
  async resetAllFilters() {
    await this.page.click(SELECTORS.resetFiltersButton);
    await this.page.waitForTimeout(WAIT_TIMES.shortWait);
  }
  
  async toggleBillPaymentStatus(billIndex: number = 0) {
    const billItem = this.page.locator(SELECTORS.billItem).nth(billIndex);
    await billItem.locator(SELECTORS.billActionsButton).click();
    
    // Check current status and click appropriate action
    const markPaidVisible = await this.page.locator(SELECTORS.markPaidMenuItem).isVisible();
    const markUnpaidVisible = await this.page.locator(SELECTORS.markUnpaidMenuItem).isVisible();
    
    if (markPaidVisible) {
      await this.page.click(SELECTORS.markPaidMenuItem);
    } else if (markUnpaidVisible) {
      await this.page.click(SELECTORS.markUnpaidMenuItem);
    }
    
    await this.page.waitForTimeout(WAIT_TIMES.shortWait);
  }
  
  async openBillCharges(billIndex: number = 0) {
    const billItem = this.page.locator(SELECTORS.billItem).nth(billIndex);
    await billItem.locator(SELECTORS.billActionsButton).click();
    await this.page.click(SELECTORS.viewChargesMenuItem);
    
    await this.page.waitForSelector(SELECTORS.chargesDialog);
  }
  
  async createSampleBill(customData?: Partial<typeof TEST_DATA.sampleBill>) {
    const billData = { ...TEST_DATA.sampleBill, ...customData };
    
    await this.page.click(SELECTORS.addBillButton);
    await this.page.waitForSelector(SELECTORS.addBillDialog);
    
    await this.fillBillForm(billData);
    
    await this.page.click('button:has-text("Add Bill")');
    await this.page.waitForTimeout(WAIT_TIMES.apiCall);
  }
  
  async verifySuccessToast(message?: string) {
    const toast = this.page.locator(SELECTORS.successToast);
    await toast.waitFor({ timeout: 5000 });
    
    if (message) {
      await this.page.locator(`text=${message}`).waitFor({ timeout: 5000 });
    }
  }
  
  async verifyErrorToast() {
    const errorToast = this.page.locator(SELECTORS.errorToast);
    await errorToast.waitFor({ timeout: 5000 });
  }
}

// Test data setup helpers
export async function setupTestData(page: any) {
  // Helper to ensure we have test data for comprehensive testing
  // This could create properties, leases, and bills as needed
  
  // For now, just verify we're on the right page
  await page.goto('/utility-bills');
  await page.waitForSelector(SELECTORS.pageTitle);
}

export async function cleanupTestData(page: any) {
  // Helper to clean up any test data created during tests
  // This would be used in test teardown if needed
}