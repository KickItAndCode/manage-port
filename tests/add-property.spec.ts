import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to clean up previous test artifacts
async function cleanupTestArtifacts() {
  try {
    const screenshotsDir = path.join(process.cwd(), 'playwright/screenshots');
    const testResultsDir = path.join(process.cwd(), 'test-results');
    
    // Clean screenshots directory
    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir);
      for (const file of files) {
        if (file.startsWith('add-property-')) {
          try {
            fs.unlinkSync(path.join(screenshotsDir, file));
          } catch (e) {
            console.log(`Could not delete ${file}:`, e.message);
          }
        }
      }
    }
    
    // Clean test results (videos)
    if (fs.existsSync(testResultsDir)) {
      const testDirs = fs.readdirSync(testResultsDir);
      for (const dir of testDirs) {
        if (dir.includes('add-property')) {
          const dirPath = path.join(testResultsDir, dir);
          try {
            if (fs.statSync(dirPath).isDirectory()) {
              fs.rmSync(dirPath, { recursive: true, force: true });
            }
          } catch (e) {
            console.log(`Could not delete ${dir}:`, e.message);
          }
        }
      }
    }
  } catch (error) {
    console.log('Cleanup error:', error.message);
  }
}

test.describe.skip('Add Property Flow (Legacy - Superseded by add-property-improved.spec.ts)', () => {
  test.beforeEach(async () => {
    // Clean up previous test artifacts
    await cleanupTestArtifacts();
  });

  test('should add a new property with full authentication flow', async ({ page }) => {
    // Increase test timeout
    test.setTimeout(60000);
    // Step 1: Navigate to landing page and ensure user is logged out
    await page.goto('/');
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-01-landing.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot: Landing page');

    // Check if user is already logged in by looking for dashboard elements
    try {
      // Check for any authenticated elements
      const dashboardLink = page.locator('a:has-text("Dashboard")');
      const isLoggedIn = await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isLoggedIn) {
        console.log('👤 User is logged in, logging out...');
        
        // Direct navigation to sign-out is more reliable
        await page.goto('/sign-out');
        await page.waitForTimeout(2000); // Give time for logout to process
        
        await page.screenshot({ 
          path: 'playwright/screenshots/add-property-03-logged-out.png', 
          fullPage: true 
        });
        console.log('✅ Logged out successfully');
      }
    } catch (error) {
      console.log('🆕 User not logged in, proceeding to login');
    }

    // Step 2: Navigate to sign-in page
    await page.goto('/sign-in');
    // Don't wait for networkidle as it might timeout - just wait for the form
    await page.waitForSelector('input[type="email"], input[name="identifier"]', { timeout: 10000 });
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-04-signin-page.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot: Sign-in page');

    // Step 3: Perform login
    // Clerk uses a two-step sign-in process
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    // Step 3a: Enter email
    const emailInput = page.locator('input[name="identifier"]').or(page.locator('input[type="email"]'));
    await emailInput.fill(testEmail);
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-05-email-filled.png', 
      fullPage: true 
    });
    
    // Click the first Continue button (for email)
    const emailContinueButton = page.getByRole('button', { name: 'Continue', exact: true });
    await emailContinueButton.click();
    console.log('📧 Email submitted');
    
    // Step 3b: Wait for password field and enter password
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(testPassword);
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-06-password-filled.png', 
      fullPage: true 
    });
    console.log('🔑 Password entered');

    // Click the Continue button again (for password)
    await emailContinueButton.click();
    
    // Wait for navigation after login - be flexible about the destination
    try {
      await Promise.race([
        page.waitForURL('**/dashboard**', { timeout: 10000 }),
        page.waitForURL('**/properties**', { timeout: 10000 }),
        page.waitForURL('**/', { timeout: 10000 })
      ]);
    } catch (error) {
      console.log('⚠️ Navigation after login was slow, continuing anyway');
    }
    
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-07-after-login.png', 
      fullPage: true 
    });
    console.log('✅ Logged in successfully');

    // Step 4: Navigate to properties page
    await page.goto('/properties');
    // Wait for the properties page to load
    await page.waitForSelector('h1:has-text("Properties")', { timeout: 10000 });
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-08-properties-page.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot: Properties page');

    // Step 5: Click Add Property button
    const addPropertyButton = page.getByRole('button', { name: 'Add Property' }).first();
    await expect(addPropertyButton).toBeVisible();
    await addPropertyButton.click();
    
    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: 'Add Property' })).toBeVisible();
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-09-modal-opened.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot: Add Property modal opened');

    // Step 6: Test the 'Fill with Dummy Data' button first
    const fillDummyDataButton = page.getByRole('button', { name: 'Fill with Dummy Data' });
    await expect(fillDummyDataButton).toBeVisible();
    await fillDummyDataButton.click();
    console.log('🎲 Clicked Fill with Dummy Data');
    
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-10-dummy-data-filled.png', 
      fullPage: true 
    });
    
    // Now override with our test data
    const timestamp = Date.now();
    const propertyData = {
      name: `Test Property ${timestamp}`,
      address: `123 Test Street, Suite ${timestamp % 1000}`,
      type: 'Single Family',
      status: 'Vacant',
      bedrooms: '3',
      bathrooms: '2',
      squareFeet: '1500',
      monthlyRent: '2000',
      purchaseDate: '2024-01-01',
      monthlyMortgage: '1500',
      monthlyCapEx: '200'
    };

    // Fill each field
    // Clear and fill with our test data
    const nameInput = page.locator('[placeholder="Enter property name"]');
    await nameInput.clear();
    await nameInput.fill(propertyData.name);
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-11-name-filled.png', 
      fullPage: true 
    });

    const addressInput = page.locator('[placeholder="Enter property address"]');
    await addressInput.clear();
    await addressInput.fill(propertyData.address);
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-12-address-filled.png', 
      fullPage: true 
    });

    // Fill other fields - using more flexible selectors
    const typeInput = page.locator('input[placeholder*="type"]').or(page.locator('label:has-text("Type") + input'));
    if (await typeInput.isVisible()) {
      await typeInput.fill(propertyData.type);
    }

    const statusInput = page.locator('input[placeholder*="status"]').or(page.locator('label:has-text("Status") + input'));
    if (await statusInput.isVisible()) {
      await statusInput.fill(propertyData.status);
    }

    // Number inputs
    const bedroomsInput = page.locator('input[placeholder*="bedrooms"]').or(page.locator('label:has-text("Bedrooms") + input'));
    if (await bedroomsInput.isVisible()) {
      await bedroomsInput.fill(propertyData.bedrooms);
    }

    const bathroomsInput = page.locator('input[placeholder*="bathrooms"]').or(page.locator('label:has-text("Bathrooms") + input'));
    if (await bathroomsInput.isVisible()) {
      await bathroomsInput.fill(propertyData.bathrooms);
    }

    const squareFeetInput = page.locator('input[placeholder*="square feet"]').or(page.locator('label:has-text("Square Feet") + input'));
    if (await squareFeetInput.isVisible()) {
      await squareFeetInput.fill(propertyData.squareFeet);
    }

    const monthlyRentInput = page.locator('input[placeholder*="rent"]').or(page.locator('label:has-text("Monthly Rent") + input'));
    if (await monthlyRentInput.isVisible()) {
      await monthlyRentInput.fill(propertyData.monthlyRent);
    }

    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-13-all-fields-filled.png', 
      fullPage: true 
    });
    console.log('📝 Filled all property details');

    // Step 7: Submit the form
    // Click the Save button
    const saveButton = page.getByRole('button', { name: 'Save' });
    await saveButton.click();
    console.log('🚀 Submitted property form');

    // Wait for form submission to complete - check for loading state
    await expect(page.getByRole('button', { name: 'Saving...' })).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Form submitted quickly without showing loading state');
    });
    
    // Wait for modal to close - the modal should disappear after successful submission
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15000 });
    
    // Wait for navigation back to properties list
    await page.waitForURL('**/properties', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow list to refresh
    
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-14-after-submission.png', 
      fullPage: true 
    });
    console.log('✅ Property form submitted');

    // Step 8: Verify property was added
    // Look for the property in the list - use a more flexible selector
    const propertyCard = page.locator('.cursor-pointer').filter({ hasText: propertyData.name });
    await expect(propertyCard).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-15-property-visible.png', 
      fullPage: true 
    });
    console.log('✅ Property successfully added and visible in the list');

    // Optional: Click on the property to view details
    await propertyCard.first().click();
    
    // Wait for navigation to property details page
    await page.waitForURL('**/properties/**', { timeout: 10000 }).catch(() => {
      console.log('Property details page navigation was slow');
    });
    
    await page.screenshot({ 
      path: 'playwright/screenshots/add-property-16-property-details.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot: Property details page');

    // Verify we're on a property details page (URL should have property ID)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/properties\/[a-zA-Z0-9]+/);
    
    // Verify property name is displayed
    await expect(page.locator('text=' + propertyData.name).first()).toBeVisible();
    
    console.log('✅ Test completed successfully!');
  });

  test('should fill property form with dummy data', async ({ page }) => {
    test.setTimeout(30000);
    
    // First check if we can access the properties page directly
    await page.goto('/properties');
    await page.waitForTimeout(2000);
    
    // Check if we see the "Sign in to manage properties" message
    const needsAuth = await page.locator('text=Sign in to manage properties').isVisible().catch(() => false);
    
    if (needsAuth) {
      console.log('🔐 User not authenticated, signing in...');
      
      // Go to sign-in page
      await page.goto('/sign-in');
      await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 10000 });
      
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
      
      console.log('📧 Filling email:', testEmail);
      
      // Step 1: Enter email
      const emailInput = page.locator('input[name="identifier"]').or(page.locator('input[type="email"]'));
      await emailInput.fill(testEmail);
      await page.screenshot({ path: 'playwright/screenshots/dummy-data-auth-01-email.png', fullPage: true });
      
      const emailContinueButton = page.getByRole('button', { name: 'Continue', exact: true });
      await emailContinueButton.click();
      console.log('📧 Email submitted');
      
      // Step 2: Enter password
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.fill(testPassword);
      await page.screenshot({ path: 'playwright/screenshots/dummy-data-auth-02-password.png', fullPage: true });
      
      await emailContinueButton.click();
      console.log('🔑 Password submitted');
      
      // Wait for authentication to complete
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'playwright/screenshots/dummy-data-auth-03-after-login.png', fullPage: true });
      
      console.log('✅ Authentication flow completed');
    } else {
      console.log('👤 User already authenticated');
    }
    
    // Navigate to properties page
    await page.goto('/properties', { waitUntil: 'domcontentloaded' });
    
    // Wait for the page to load properly
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give time for any client-side rendering
    
    // Debug: Take screenshot to see what's on the page
    await page.screenshot({ 
      path: 'playwright/screenshots/dummy-data-00-properties-page.png', 
      fullPage: true 
    });
    
    // Wait for and verify the Add Property button exists
    try {
      await page.waitForSelector('button:has-text("Add Property")', { timeout: 5000 });
      console.log('✅ Found Add Property button');
    } catch (error) {
      console.log('❌ Add Property button not found, checking page state...');
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log('Page title:', pageTitle);
      console.log('Page URL:', pageUrl);
      
      // Check if we're on the right page
      const hasPropertiesHeading = await page.locator('h1:has-text("Properties")').isVisible().catch(() => false);
      console.log('Has Properties heading:', hasPropertiesHeading);
      
      throw new Error('Add Property button not found on page');
    }
    
    // Click Add Property button
    const addPropertyButton = page.getByRole('button', { name: 'Add Property' }).first();
    await addPropertyButton.click();
    
    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: 'Add Property' })).toBeVisible();
    
    // Take screenshot of empty form
    await page.screenshot({ 
      path: 'playwright/screenshots/dummy-data-01-empty-form.png', 
      fullPage: true 
    });
    
    // Click Fill with Dummy Data button
    const fillDummyDataButton = page.getByRole('button', { name: 'Fill with Dummy Data' });
    await expect(fillDummyDataButton).toBeVisible();
    await fillDummyDataButton.click();
    console.log('🎲 Clicked Fill with Dummy Data');
    
    // Wait a moment for form to populate
    await page.waitForTimeout(500);
    
    // Take screenshot of filled form
    await page.screenshot({ 
      path: 'playwright/screenshots/dummy-data-02-filled-form.png', 
      fullPage: true 
    });
    
    // Verify that fields have been populated
    const nameInput = page.locator('[placeholder="Enter property name"]');
    const addressInput = page.locator('[placeholder="Enter property address"]');
    const bedroomsInput = page.locator('input[placeholder*="bedrooms"]').or(page.locator('label:has-text("Bedrooms") + input'));
    const rentInput = page.locator('input[placeholder*="rent"]').or(page.locator('label:has-text("Monthly Rent") + input'));
    
    // Check that fields have values
    await expect(nameInput).not.toHaveValue('');
    await expect(addressInput).not.toHaveValue('');
    await expect(bedroomsInput).not.toHaveValue('');
    await expect(rentInput).not.toHaveValue('');
    
    console.log('✅ Dummy data filled successfully');
    
    // Submit the form to test that dummy data is valid
    const saveButton = page.getByRole('button', { name: 'Save' });
    await saveButton.click();
    console.log('🚀 Submitted form with dummy data');
    
    // Wait for modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15000 });
    
    // Verify we're back on properties page
    await expect(page.url()).toContain('/properties');
    console.log('✅ Property created successfully with dummy data');
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'playwright/screenshots/dummy-data-03-property-created.png', 
      fullPage: true 
    });
  });
});