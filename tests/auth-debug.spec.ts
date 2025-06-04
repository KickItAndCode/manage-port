import { test, expect } from '@playwright/test';

test.describe('Authentication Debug', () => {
  test('should debug authentication flow', async ({ page }) => {
    console.log('🔐 Starting auth debug test...');
    console.log('📧 Test email from env:', process.env.TEST_USER_EMAIL);
    console.log('🔑 Password set:', !!process.env.TEST_USER_PASSWORD);
    
    // Go to sign-in page
    await page.goto('/sign-in');
    console.log('📍 Navigated to sign-in page');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-signin-full.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-signin-full.png');
    
    // Log the page title and URL
    const title = await page.title();
    const url = page.url();
    console.log('📄 Page title:', title);
    console.log('🌐 Current URL:', url);
    
    // List all input elements
    const inputs = await page.locator('input').all();
    console.log('📝 Found', inputs.length, 'input elements');
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      const className = await input.getAttribute('class');
      
      console.log(`Input ${i + 1}:`, {
        type,
        name, 
        placeholder,
        id,
        className: className?.substring(0, 50) + '...'
      });
    }
    
    // List all buttons
    const buttons = await page.locator('button').all();
    console.log('🔘 Found', buttons.length, 'button elements');
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      const className = await button.getAttribute('class');
      
      console.log(`Button ${i + 1}:`, {
        text: text?.trim(),
        type,
        className: className?.substring(0, 50) + '...'
      });
    }
    
    // Check if Clerk components are loaded
    const clerkElements = await page.locator('[class*="cl-"]').all();
    console.log('🔧 Found', clerkElements.length, 'Clerk elements');
    
    // Try to find and interact with form elements
    const emailInput = page.locator('input[type="email"]').first();
    const isEmailVisible = await emailInput.isVisible().catch(() => false);
    console.log('✉️ Email input visible:', isEmailVisible);
    
    if (isEmailVisible) {
      await emailInput.fill('uitester@manageport.com');
      console.log('📝 Filled email input');
      
      // Look for submit button
      const submitBtn = page.locator('button[type="submit"]').first();
      const isSubmitVisible = await submitBtn.isVisible().catch(() => false);
      console.log('🚀 Submit button visible:', isSubmitVisible);
      
      if (isSubmitVisible) {
        await submitBtn.click();
        console.log('👆 Clicked submit button');
        await page.waitForTimeout(2000);
        
        // Check for password field
        const passwordInput = page.locator('input[type="password"]').first();
        const isPasswordVisible = await passwordInput.isVisible().catch(() => false);
        console.log('🔐 Password input visible:', isPasswordVisible);
      }
    }
  });
});