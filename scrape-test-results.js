const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeTestResults() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the test results page
    const url = 'http://localhost:9323/#?testId=fb53d6bef5d36124c734-b6bfd2068711b39e24b8';
    console.log('Navigating to:', url);
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract test results information
    const testResults = await page.evaluate(() => {
      const results = {
        title: document.title,
        url: window.location.href,
        content: '',
        errors: [],
        testDetails: {}
      };
      
      // Get the main content
      const mainContent = document.querySelector('main') || document.body;
      if (mainContent) {
        results.content = mainContent.innerText;
      }
      
      // Look for error messages
      const errorElements = document.querySelectorAll('[data-testid="error"], .error, .failure, .timeout');
      errorElements.forEach(el => {
        results.errors.push(el.innerText);
      });
      
      // Look for test status
      const statusElements = document.querySelectorAll('[data-testid="test-status"], .test-status, .status');
      statusElements.forEach(el => {
        results.testDetails.status = el.innerText;
      });
      
      // Look for specific test information
      const testNameElement = document.querySelector('[data-testid="test-title"], .test-title, h1, h2');
      if (testNameElement) {
        results.testDetails.name = testNameElement.innerText;
      }
      
      // Look for error details
      const errorDetailElements = document.querySelectorAll('pre, .error-details, .stack-trace');
      errorDetailElements.forEach(el => {
        results.errors.push('ERROR DETAILS: ' + el.innerText);
      });
      
      return results;
    });
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'test-results-screenshot.png', 
      fullPage: true 
    });
    
    // Save results to file
    const resultsJson = JSON.stringify(testResults, null, 2);
    fs.writeFileSync('test-results.json', resultsJson);
    
    console.log('Test results scraped successfully!');
    console.log('Files created:');
    console.log('- test-results.json (JSON data)');
    console.log('- test-results-screenshot.png (Screenshot)');
    
    // Also save as text file for easy reading
    let textOutput = `Test Results Analysis
====================

Title: ${testResults.title}
URL: ${testResults.url}

Test Details:
${JSON.stringify(testResults.testDetails, null, 2)}

Errors Found:
${testResults.errors.join('\n\n')}

Full Content:
${testResults.content}
`;
    
    fs.writeFileSync('test-results.txt', textOutput);
    console.log('- test-results.txt (Human readable)');
    
    console.log('\nPreview of errors:');
    testResults.errors.slice(0, 3).forEach((error, i) => {
      console.log(`${i + 1}. ${error.substring(0, 200)}...`);
    });
    
  } catch (error) {
    console.error('Error scraping test results:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeTestResults();