#!/bin/bash

# Cleanup Test Data Script
# This script removes test screenshots, temporary files, and test data 
# to prepare the codebase for check-in

echo "🧹 Cleaning up test data and screenshots..."

# Remove screenshot files from root directory
echo "Removing root directory screenshots..."
rm -f *.png
rm -f *.jpg
rm -f *.jpeg
rm -f Screenshot*.png

# Remove test data scripts (but preserve legitimate scripts)
echo "Removing test data scripts..."
rm -f scrape-test-results.js
rm -f screenshot-property-flow.js
rm -f *-test-results.js

# Remove backup files in tasks directory
echo "Removing backup task files..."
rm -f tasks/*_backup_*.json
rm -f tasks/*backup*.json

# Remove screenshot directories (but preserve the directory structure for tests)
echo "Cleaning screenshot directories..."
if [ -d "property-flow-screenshots" ]; then
    rm -rf property-flow-screenshots/
fi

if [ -d "playwright/screenshots" ]; then
    rm -rf playwright/screenshots/
fi

# Clean test screenshots but preserve the tests/screenshots directory for Playwright
if [ -d "tests/screenshots" ]; then
    find tests/screenshots/ -name "*.png" -delete 2>/dev/null || true
    find tests/screenshots/ -name "*.jpg" -delete 2>/dev/null || true
    find tests/screenshots/ -name "*.jpeg" -delete 2>/dev/null || true
fi

# Remove Playwright test artifacts
echo "Cleaning Playwright artifacts..."
rm -rf test-results/
rm -rf playwright-report/
find . -name "*.png" -path "*/test-results/*" -delete 2>/dev/null || true

# Remove temporary migration files
echo "Removing temporary migration files..."
rm -f *migration*.png
rm -f *verification*.png
rm -f dry-run*.png
rm -f final-*.png

# Remove node_modules screenshot artifacts (sometimes tests leave these)
find node_modules/ -name "screenshot*.png" -delete 2>/dev/null || true

# Clean up any .tmp or .temp files
echo "Removing temporary files..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.temp" -delete 2>/dev/null || true

# Remove any test database files (if using local testing)
rm -f *.db-test
rm -f *.sqlite-test

# Clean up log files from testing
rm -f *.test.log
rm -f test-*.log

echo "✅ Cleanup complete!"
echo ""
echo "Files cleaned:"
echo "- All PNG/JPG screenshots from root directory"
echo "- Test data scripts"
echo "- Backup task files" 
echo "- Screenshot directories"
echo "- Playwright artifacts"
echo "- Temporary migration files"
echo "- Temporary and log files"
echo ""
echo "Note: Essential test files and directories are preserved."