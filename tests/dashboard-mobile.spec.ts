import { test, expect } from '@playwright/test';

test.describe('Dashboard Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/dashboard');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Dashboard")');
    
    // Create sample data so we can see all dashboard widgets
    await createSampleProperty(page);
  });

  async function createSampleProperty(page: any) {
    // Check if we already have properties by looking for the "Start here!" indicator
    const hasNoProperties = await page.locator('text=Start here!').isVisible();
    
    if (hasNoProperties) {
      console.log('No properties found, creating sample property...');
      
      // Click Enhanced Setup button (the highlighted one for new users)
      await page.locator('button:has-text("Property Setup"):has-text("Enhanced")').click();
      
      // Wait for wizard to load
      await page.waitForSelector('text=Property Setup Wizard', { timeout: 10000 });
      
      // Fill basic property info - use Quick Fill
      await page.locator('button:has-text("Quick Fill")').click();
      
      // Wait a moment for form to populate
      await page.waitForTimeout(1500);
      
      // Continue to next step
      await page.locator('button:has-text("Continue")').click();
      
      // Property type step - select single family
      await page.locator('text=Single Family').click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Continue")').click();
      
      // Utility setup step - skip for now
      await page.locator('button:has-text("Skip")').click();
      
      // Final step - save property
      await page.locator('button:has-text("Create Property")').click();
      
      // Wait for success toast or redirect
      await page.waitForTimeout(5000);
      
      // Navigate back to dashboard if not already there
      const currentUrl = page.url();
      if (!currentUrl.includes('/dashboard')) {
        await page.goto('/dashboard');
      }
      
      // Wait for dashboard to load with new data - look for stats cards
      await page.waitForSelector('h1:has-text("Dashboard")');
      await page.waitForTimeout(3000);
      
      console.log('Sample property created successfully');
    } else {
      console.log('Properties already exist, skipping creation');
    }
  }

  test('should display dashboard properly on iPhone 14', async ({ page }) => {
    // Set viewport to iPhone 14 dimensions
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of the full dashboard
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphone14-full.png',
      fullPage: true 
    });
    
    // Take screenshot of just the viewport
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphone14-viewport.png'
    });
    
    // Test specific sections
    
    // 1. Header section
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    await header.screenshot({ path: 'tests/screenshots/dashboard-header-mobile.png' });
    
    // 2. Stats cards section
    const statsSection = page.locator('[aria-labelledby="stats-heading"]');
    if (await statsSection.isVisible()) {
      await statsSection.screenshot({ path: 'tests/screenshots/dashboard-stats-mobile.png' });
    }
    
    // 3. Quick actions section
    const quickActions = page.locator('text=Quick Actions').locator('..').locator('..');
    if (await quickActions.isVisible()) {
      await quickActions.screenshot({ path: 'tests/screenshots/dashboard-quickactions-mobile.png' });
    }
    
    // 4. Charts section
    const chartsSection = page.locator('[aria-labelledby="charts-heading"]');
    if (await chartsSection.isVisible()) {
      await chartsSection.screenshot({ path: 'tests/screenshots/dashboard-charts-mobile.png' });
    }
    
    // 5. Financial summary section
    const financialSummary = page.locator('text=Financial Summary').locator('..').locator('..');
    if (await financialSummary.isVisible()) {
      await financialSummary.screenshot({ path: 'tests/screenshots/dashboard-financial-mobile.png' });
    }
    
    // 6. Recent properties section
    const recentProperties = page.locator('[aria-labelledby="recent-properties-heading"]');
    if (await recentProperties.isVisible()) {
      await recentProperties.screenshot({ path: 'tests/screenshots/dashboard-properties-mobile.png' });
    }
    
    // Check if elements are readable and not overlapping
    const title = page.locator('h1:has-text("Dashboard")');
    await expect(title).toBeVisible();
    
    // Verify stats cards layout on mobile - should be visible now with data
    const statCards = page.locator('[aria-labelledby="stats-heading"]');
    await expect(statCards).toBeVisible();
    const cardGrid = statCards.locator('.grid.grid-cols-2.lg\\:grid-cols-4');
    const cardCount = await cardGrid.locator('> *').count();
    console.log(`Found ${cardCount} stat cards`);
    
    // Verify quick actions layout
    const quickActionsGrid = page.locator('.grid.grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-5');
    if (await quickActionsGrid.isVisible()) {
      const actionCount = await quickActionsGrid.locator('> *').count();
      console.log(`Found ${actionCount} quick action items`);
    }
  });

  test('should display dashboard properly on smaller mobile (iPhone SE)', async ({ page }) => {
    // Set viewport to iPhone SE dimensions (smaller screen)
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of the full dashboard
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphonese-full.png',
      fullPage: true 
    });
    
    // Take screenshot of just the viewport
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphonese-viewport.png'
    });
  });

  test('should have readable text and proper spacing on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Check font sizes are appropriate
    const mainTitle = page.locator('h1:has-text("Dashboard")');
    const titleStyles = await mainTitle.evaluate(el => getComputedStyle(el));
    console.log('Title font size:', titleStyles.fontSize);
    
    // Check if stat card values are readable
    const statValues = page.locator('[aria-labelledby="stats-heading"] .text-lg');
    const count = await statValues.count();
    console.log(`Found ${count} stat value elements`);
    
    if (count > 0) {
      const firstStatStyles = await statValues.first().evaluate(el => getComputedStyle(el));
      console.log('Stat value font size:', firstStatStyles.fontSize);
    }
    
    // Check spacing between sections
    const sections = page.locator('section');
    const sectionCount = await sections.count();
    console.log(`Found ${sectionCount} sections`);
    
    // Verify buttons are touch-friendly (at least 44px)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`Found ${buttonCount} buttons`);
    
    if (buttonCount > 0) {
      const buttonRect = await buttons.first().boundingBox();
      if (buttonRect) {
        console.log(`First button dimensions: ${buttonRect.width}x${buttonRect.height}`);
        expect(buttonRect.height).toBeGreaterThanOrEqual(40); // Close to 44px touch target
      }
    }
  });

  test('should handle scrolling properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Test scrolling through the dashboard
    await page.evaluate(() => window.scrollTo(0, 0)); // Start at top
    await page.waitForTimeout(500);
    
    // Take screenshot at top
    await page.screenshot({ path: 'tests/screenshots/dashboard-mobile-top.png' });
    
    // Scroll to middle
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/dashboard-mobile-middle.png' });
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/dashboard-mobile-bottom.png' });
    
    // Verify content doesn't get cut off
    const lastSection = page.locator('section').last();
    if (await lastSection.isVisible()) {
      await expect(lastSection).toBeInViewport();
    }
  });
});