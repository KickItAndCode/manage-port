import { test, expect } from '@playwright/test';

test.describe('Dashboard Mobile Screenshots', () => {
  
  async function createPropertyIfNeeded(page: any) {
    // Check if we need to create a property (look for "Start here!" indicator)
    const hasNoProperties = await page.locator('text=Start here!').isVisible();
    
    if (hasNoProperties) {
      console.log('Creating sample property...');
      
      // Click the large enhanced setup button
      await page.locator('button:has(span:text("Property Setup"))').click();
      
      // Wait for modal to open
      await page.waitForSelector('text=Create New Property', { timeout: 10000 });
      
      // Use Quick Fill
      await page.locator('button:has-text("Quick Fill All Steps")').click();
      await page.waitForTimeout(1500);
      
      // Click Next to go to step 2
      await page.locator('button:has-text("Next")').click();
      await page.waitForTimeout(1000);
      
      // Single-Family is already selected by default, just continue
      console.log('Single-Family option is already selected');
      
      // Click Next to go to step 3
      await page.locator('button:has-text("Next")').click();
      await page.waitForTimeout(1000);
      
      // Utility setup - "Tenants Pay All" is already selected by default
      console.log('Tenants Pay All option is already selected');
      
      // Create property
      await page.locator('button:has-text("Create Property")').click();
      
      // Wait for success and modal to close
      await page.waitForTimeout(5000);
      
      // Make sure we're back on dashboard
      await page.goto('/dashboard');
      await page.waitForSelector('h1:has-text("Dashboard")');
      await page.waitForTimeout(3000);
      
      console.log('Property created successfully');
    } else {
      console.log('Properties already exist');
    }
  }
  
  test('capture dashboard mobile screenshots without data', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Dashboard")');
    
    // iPhone 14 screenshots - empty state
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(2000);
    
    // Take screenshots of empty state
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphone14-empty.png',
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphone14-viewport-empty.png'
    });
  });

  test('create property and capture dashboard with data', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Dashboard")');
    
    // Create property first
    await createPropertyIfNeeded(page);
    
    // iPhone 14 screenshots with data
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(2000);
    
    // Take full page screenshot with data
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphone14-with-data.png',
      fullPage: true 
    });
    
    // Take viewport screenshot with data
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphone14-viewport-with-data.png'
    });
    
    // iPhone SE with data
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphonese-with-data.png',
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: 'tests/screenshots/dashboard-iphonese-viewport-with-data.png'
    });
    
    // Verify we now have dashboard components with data
    const statsSection = page.locator('[aria-labelledby="stats-heading"]');
    if (await statsSection.isVisible()) {
      console.log('✅ Stats section is visible with data');
      await statsSection.screenshot({ path: 'tests/screenshots/stats-section-mobile.png' });
      
      // Test stat cards
      const statCards = statsSection.locator('.grid > div');
      const cardCount = await statCards.count();
      console.log(`Found ${cardCount} stat cards`);
      expect(cardCount).toBeGreaterThan(0);
    }
    
    // Test charts section
    const chartsSection = page.locator('[aria-labelledby="charts-heading"]');
    if (await chartsSection.isVisible()) {
      console.log('✅ Charts section is visible');
      await chartsSection.screenshot({ path: 'tests/screenshots/charts-section-mobile.png' });
    }
    
    // Test recent properties section
    const recentPropertiesSection = page.locator('[aria-labelledby="recent-properties-heading"]');
    if (await recentPropertiesSection.isVisible()) {
      console.log('✅ Recent properties section is visible');
      await recentPropertiesSection.screenshot({ path: 'tests/screenshots/recent-properties-mobile.png' });
    }
    
    // Test the Quick Actions buttons are properly sized
    const quickActionButton = page.locator('.min-h-\\[80px\\]').first();
    if (await quickActionButton.isVisible()) {
      const buttonRect = await quickActionButton.boundingBox();
      if (buttonRect) {
        console.log(`Quick action button dimensions: ${buttonRect.width}x${buttonRect.height}`);
        expect(buttonRect.height).toBeGreaterThanOrEqual(80);
      }
    }
  });
});