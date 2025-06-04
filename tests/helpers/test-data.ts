// Test data factories for consistent test data across tests

export const TestData = {
  property: {
    basic: {
      name: 'Test Property',
      address: '123 Test Street, Test City, TC 12345',
      type: 'Single Family',
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1500,
      monthlyRent: 2500,
    },
    
    apartment: {
      name: 'Test Apartment Complex',
      address: '456 Apartment Ave, Test City, TC 12345',
      type: 'Multi Family',
      propertyType: 'multi-family',
      bedrooms: 2,
      bathrooms: 1,
      squareFootage: 1000,
      monthlyRent: 1800,
    },
  },

  lease: {
    basic: {
      tenantName: 'John Doe',
      tenantEmail: 'john.doe@example.com',
      tenantPhone: '555-123-4567',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      rent: 2500,
      securityDeposit: 2500,
      paymentDay: 1,
      status: 'active',
    },

    expired: {
      tenantName: 'Jane Smith',
      tenantEmail: 'jane.smith@example.com',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      rent: 2200,
      status: 'expired',
    },
  },

  utilityBill: {
    electric: {
      utilityType: 'Electric',
      provider: 'Pacific Gas & Electric',
      totalAmount: 150.00,
      billDate: '2024-01-15',
      dueDate: '2024-02-15',
      billMonth: '2024-01',
      notes: 'Standard monthly billing',
    },

    water: {
      utilityType: 'Water',
      provider: 'City Water Department',
      totalAmount: 85.00,
      billDate: '2024-01-10',
      dueDate: '2024-02-10',
      billMonth: '2024-01',
    },

    gas: {
      utilityType: 'Gas',
      provider: 'Natural Gas Company',
      totalAmount: 120.00,
      billDate: '2024-01-20',
      dueDate: '2024-02-20',
      billMonth: '2024-01',
    },
  },

  payment: {
    full: {
      amount: 150.00,
      paymentDate: '2024-02-01',
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'TXN123456',
      notes: 'Full payment received',
    },

    partial: {
      amount: 75.00,
      paymentDate: '2024-02-01',
      paymentMethod: 'Cash',
      notes: 'Partial payment - remainder due',
    },
  },
};

export const Selectors = {
  // Common UI elements
  buttons: {
    addProperty: 'text=Add Property',
    addLease: 'text=Add Lease',
    addBill: 'text=Add Bill',
    save: 'text=Save',
    submit: 'text=Submit',
    cancel: 'text=Cancel',
    delete: 'text=Delete',
    edit: 'text=Edit',
  },

  // Form inputs (using placeholder text as fallback)
  inputs: {
    propertyName: '[placeholder*="property name"], [name="name"]',
    address: '[placeholder*="address"], [name="address"]',
    monthlyRent: '[placeholder*="rent"], [name="rent"]',
    tenantName: '[placeholder*="tenant"], [name="tenantName"]',
    tenantEmail: '[placeholder*="email"], [name="tenantEmail"]',
    utilityType: '[name="utilityType"]',
    provider: '[name="provider"]',
    amount: '[placeholder*="amount"], [name="totalAmount"]',
  },

  // Navigation
  nav: {
    dashboard: 'text=Dashboard',
    properties: 'text=Properties',
    leases: 'text=Leases',
    utilityBills: 'text=Utility Bills',
    documents: 'text=Documents',
  },

  // Modal dialogs
  modals: {
    addProperty: 'text=Add Property >> ..',
    addLease: 'text=Add Lease >> ..',
    addBill: 'text=Add Utility Bill >> ..',
  },
};

export const TestHelpers = {
  // Wait for page to be fully loaded
  waitForPageLoad: async (page: any) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small buffer for animations
  },

  // Fill form with test data
  fillPropertyForm: async (page: any, propertyData = TestData.property.basic) => {
    await page.fill(Selectors.inputs.propertyName, propertyData.name);
    await page.fill(Selectors.inputs.address, propertyData.address);
    await page.fill(Selectors.inputs.monthlyRent, propertyData.monthlyRent.toString());
    
    if (propertyData.type) {
      await page.selectOption('[name="type"]', propertyData.type);
    }
  },

  fillLeaseForm: async (page: any, leaseData = TestData.lease.basic) => {
    await page.fill(Selectors.inputs.tenantName, leaseData.tenantName);
    await page.fill(Selectors.inputs.tenantEmail, leaseData.tenantEmail);
    await page.fill(Selectors.inputs.monthlyRent, leaseData.rent.toString());
    await page.fill('[name="startDate"]', leaseData.startDate);
    await page.fill('[name="endDate"]', leaseData.endDate);
  },

  fillUtilityBillForm: async (page: any, billData = TestData.utilityBill.electric) => {
    await page.selectOption(Selectors.inputs.utilityType, billData.utilityType);
    await page.fill(Selectors.inputs.provider, billData.provider);
    await page.fill(Selectors.inputs.amount, billData.totalAmount.toString());
    await page.fill('[name="billDate"]', billData.billDate);
    await page.fill('[name="dueDate"]', billData.dueDate);
  },

  // Take screenshot with timestamp
  takeScreenshot: async (page: any, name: string) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  },

  // Cleanup function for tests that create data
  cleanup: {
    // These would interact with your test database
    // to clean up created test data
    properties: async () => {
      // Implementation depends on your backend setup
    },
    
    leases: async () => {
      // Implementation depends on your backend setup
    },
    
    utilityBills: async () => {
      // Implementation depends on your backend setup
    },
  },
};