#!/usr/bin/env node

/**
 * Script to scrape Playwright test results from localhost:9323
 * 
 * Usage: node scripts/scrape-test-results.js [optional-test-id]
 * 
 * This script will:
 * 1. Navigate to the Playwright test report
 * 2. Extract test results, errors, and failure details
 * 3. Save results to multiple formats for analysis
 * 4. Take screenshots for visual debugging
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeTestResults(testId = '') {
  console.log('🕷️  Starting Playwright test results scraper...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Construct URL
    const baseUrl = 'http://localhost:9323/';
    const url = testId ? `${baseUrl}#?testId=${testId}` : baseUrl;
    
    console.log('📍 Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract comprehensive test results
    const results = await page.evaluate(() => {
      const data = {
        title: document.title,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        summary: {},
        tests: [],
        errors: [],
        failedTests: []
      };
      
      // Extract test summary
      const summaryElements = document.querySelectorAll('[data-testid="summary"] span, .summary span');
      summaryElements.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('Passed')) data.summary.passed = text;
        if (text.includes('Failed')) data.summary.failed = text;
        if (text.includes('Flaky')) data.summary.flaky = text;
        if (text.includes('Skipped')) data.summary.skipped = text;
      });
      
      // Extract individual test results
      const testElements = document.querySelectorAll('[data-testid="test-case"], .test-case, .test-result');
      testElements.forEach(el => {
        const testName = el.querySelector('h3, .test-title, [data-testid="test-title"]')?.textContent?.trim();
        const status = el.querySelector('.status, [data-testid="test-status"]')?.textContent?.trim();
        const duration = el.querySelector('.duration, [data-testid="duration"]')?.textContent?.trim();
        
        if (testName) {
          data.tests.push({
            name: testName,
            status: status || 'unknown',
            duration: duration || 'unknown'
          });
        }
      });
      
      // Extract error details
      const errorElements = document.querySelectorAll('.error, [data-testid="error"], .failure, pre');
      errorElements.forEach(el => {
        const errorText = el.textContent.trim();
        if (errorText && errorText.length > 10) {
          data.errors.push(errorText);
        }
      });
      
      // Extract failed test details
      const failedElements = document.querySelectorAll('[data-testid="test-case"].failed, .test-case.failed, .failed');
      failedElements.forEach(el => {
        const testName = el.querySelector('h3, .test-title')?.textContent?.trim();
        const errorDetail = el.querySelector('.error, pre')?.textContent?.trim();
        
        if (testName) {
          data.failedTests.push({
            name: testName,
            error: errorDetail || 'No error details found'
          });
        }
      });
      
      return data;
    });
    
    // Take screenshots
    const screenshotPath = 'playwright/screenshots/test-results-scrape.png';
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log('📸 Screenshot saved:', screenshotPath);
    
    // Save results in multiple formats
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON format
    const jsonPath = `test-results-${timestamp}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log('💾 JSON results saved:', jsonPath);
    
    // Human-readable format
    const textReport = generateTextReport(results);
    const textPath = `test-results-${timestamp}.txt`;
    fs.writeFileSync(textPath, textReport);
    console.log('📄 Text report saved:', textPath);
    
    // Print summary to console
    console.log('\\n📊 Test Results Summary:');
    console.log('========================');
    if (results.summary.passed) console.log('✅', results.summary.passed);
    if (results.summary.failed) console.log('❌', results.summary.failed);
    if (results.summary.flaky) console.log('⚠️ ', results.summary.flaky);
    if (results.summary.skipped) console.log('⏭️ ', results.summary.skipped);
    
    if (results.failedTests.length > 0) {
      console.log('\\n🔍 Failed Tests:');
      results.failedTests.forEach((test, i) => {
        console.log(`${i + 1}. ${test.name}`);
        if (test.error) {
          console.log(`   Error: ${test.error.substring(0, 200)}...`);
        }
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error scraping test results:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

function generateTextReport(results) {
  let report = `Playwright Test Results Report
Generated: ${results.timestamp}
URL: ${results.url}

=== SUMMARY ===
${results.summary.passed || 'Passed: N/A'}
${results.summary.failed || 'Failed: N/A'}
${results.summary.flaky || 'Flaky: N/A'}
${results.summary.skipped || 'Skipped: N/A'}

=== ALL TESTS ===
`;

  results.tests.forEach((test, i) => {
    report += `${i + 1}. ${test.name}\\n`;
    report += `   Status: ${test.status}\\n`;
    report += `   Duration: ${test.duration}\\n\\n`;
  });

  if (results.failedTests.length > 0) {
    report += `\\n=== FAILED TESTS DETAILS ===\\n`;
    results.failedTests.forEach((test, i) => {
      report += `\\n${i + 1}. ${test.name}\\n`;
      report += `${'='.repeat(50)}\\n`;
      report += `${test.error}\\n\\n`;
    });
  }

  if (results.errors.length > 0) {
    report += `\\n=== ALL ERRORS ===\\n`;
    results.errors.forEach((error, i) => {
      report += `\\nError ${i + 1}:\\n`;
      report += `${'-'.repeat(30)}\\n`;
      report += `${error}\\n\\n`;
    });
  }

  return report;
}

// Run the scraper
if (require.main === module) {
  const testId = process.argv[2];
  scrapeTestResults(testId)
    .then(() => {
      console.log('\\n✅ Test results scraping completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\\n❌ Failed to scrape test results:', error.message);
      process.exit(1);
    });
}

module.exports = { scrapeTestResults };