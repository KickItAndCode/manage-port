const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.test' });

async function capturePropertyFlow() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(__dirname, 'property-flow-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }
  
  console.log('🚀 Starting property creation flow capture...');
  
  try {
    // Step 1: Try to go directly to properties page first
    console.log('🏠 Attempting to navigate directly to properties page...');
    await page.goto('http://localhost:3000/properties', { waitUntil: 'networkidle2' });
    
    // Wait a moment for potential redirects
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check if we're on the sign-in page
    if (currentUrl.includes('sign-in')) {
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02-redirected-to-signin.png'),
        fullPage: true 
      });
      console.log('✅ Redirected to sign-in page screenshot saved');
      console.log('🔐 Attempting automated login with test credentials...');
      
      // Fill in the login form
      await page.waitForSelector('input[name="identifier"], input[type="email"], input[name="email"]', { timeout: 10000 });
      
      // Fill email
      await page.type('input[name="identifier"], input[type="email"], input[name="email"]', process.env.TEST_USER_EMAIL);
      
      // Fill password
      await page.type('input[name="password"], input[type="password"]', process.env.TEST_USER_PASSWORD);
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02b-signin-form-filled.png'),
        fullPage: true 
      });
      console.log('✅ Sign-in form filled screenshot saved');
      
      // Click submit button
      const loginSubmitted = await page.evaluate(() => {
        // Try to find submit button by type first
        const submitByType = document.querySelector('button[type="submit"]') || document.querySelector('input[type="submit"]');
        if (submitByType) {
          submitByType.click();
          return true;
        }
        
        // Try to find by text content
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitButton = buttons.find(button => 
          button.textContent.includes('Sign in') || 
          button.textContent.includes('Continue') || 
          button.textContent.includes('Submit') ||
          button.textContent.includes('Login')
        );
        if (submitButton) {
          submitButton.click();
          return true;
        }
        return false;
      });
      
      if (loginSubmitted) {
        console.log('🚀 Clicked sign-in button, waiting for redirect...');
        
        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, '02c-after-signin.png'),
          fullPage: true 
        });
        console.log('✅ After sign-in screenshot saved');
      }
      
      // Try to navigate to properties again
      await page.goto('http://localhost:3000/properties', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Check if we're now on properties page
    if (!page.url().includes('properties')) {
      console.log('📱 Navigating to landing page first...');
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
      await page.screenshot({ 
        path: path.join(screenshotsDir, '01-landing-page-authenticated.png'),
        fullPage: true 
      });
      console.log('✅ Authenticated landing page screenshot saved');
      
      // Try to navigate to properties
      await page.goto('http://localhost:3000/properties', { waitUntil: 'networkidle2' });
    }
    
    // Step 3: Navigate to properties page
    console.log('🏠 Navigating to properties page...');
    await page.goto('http://localhost:3000/properties', { waitUntil: 'networkidle2' });
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-properties-page.png'),
      fullPage: true 
    });
    console.log('✅ Properties page screenshot saved');
    
    // Step 4: Click "Add Property" button
    console.log('➕ Looking for Add Property button...');
    
    // Wait for page to load and look for the Add Property button
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Find and click the Add Property button by text content
    const buttonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addButton = buttons.find(button => button.textContent.includes('Add Property'));
      if (addButton) {
        addButton.click();
        return true;
      }
      return false;
    });
    
    if (buttonClicked) {
      
      // Wait for modal to open
      await page.waitForSelector('[role="dialog"], .dialog-content', { timeout: 5000 });
      await page.screenshot({ 
        path: path.join(screenshotsDir, '04-add-property-modal.png'),
        fullPage: true 
      });
      console.log('✅ Add property modal screenshot saved');
      
      // Step 5: Fill out the form
      console.log('📝 Filling out property form...');
      
      // Fill basic information
      await page.type('input[name="name"], input[placeholder*="name"]', 'Demo Property');
      await page.type('input[name="address"], input[placeholder*="address"]', '123 Main Street, Anytown, ST 12345');
      
      // Select property type
      await page.click('select[name="type"], select[placeholder*="type"]');
      await page.select('select[name="type"], select[placeholder*="type"]', 'Apartment');
      
      // Fill numeric fields
      await page.type('input[name="bedrooms"], input[placeholder*="bedroom"]', '2');
      await page.type('input[name="bathrooms"], input[placeholder*="bathroom"]', '1');
      await page.type('input[name="squareFeet"], input[placeholder*="square"], input[placeholder*="sqft"]', '850');
      await page.type('input[name="monthlyRent"], input[placeholder*="rent"]', '1200');
      
      // Set purchase date
      await page.type('input[name="purchaseDate"], input[type="date"]', '2023-01-15');
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, '05-form-filled.png'),
        fullPage: true 
      });
      console.log('✅ Filled form screenshot saved');
      
      // Step 6: Submit the form
      console.log('🚀 Submitting form...');
      const formSubmitted = await page.evaluate(() => {
        // Try to find submit button by type first
        const submitByType = document.querySelector('button[type="submit"]');
        if (submitByType) {
          submitByType.click();
          return true;
        }
        
        // Try to find by text content
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitButton = buttons.find(button => 
          button.textContent.includes('Save') || 
          button.textContent.includes('Add') || 
          button.textContent.includes('Create') ||
          button.textContent.includes('Submit')
        );
        if (submitButton) {
          submitButton.click();
          return true;
        }
        return false;
      });
      
      if (formSubmitted) {
        
        // Wait for form to close and return to properties page
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot({ 
          path: path.join(screenshotsDir, '06-form-submitted.png'),
          fullPage: true 
        });
        console.log('✅ Form submitted screenshot saved');
        
        // Wait a bit more for the new property to appear
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.screenshot({ 
          path: path.join(screenshotsDir, '07-property-created.png'),
          fullPage: true 
        });
        console.log('✅ Final result screenshot saved');
      }
    }
    
    console.log('🎉 Property creation flow capture completed!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Error during capture:', error);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error-state.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the capture
capturePropertyFlow().catch(console.error);